import Phaser from 'phaser';
import { registerUser, validateUserName } from '../services/firebaseAuthService.js';
import { disableGameKeyboardForOverlayScene } from '../utils/formKeyboardGuard.js';

export class Registration extends Phaser.Scene {
  constructor() {
    super('Registration');
  }

  init(data) {
    this.returnScene = data?.returnScene ?? 'OnlineMenu';
  }

  create() {
    disableGameKeyboardForOverlayScene(this);

    const fondo = this.add.image(this.scale.width / 2, this.scale.height / 2, 'fondo_duelo');

    const ajustarFondo = (width, height) => {
      fondo.setPosition(width / 2, height / 2);
      const escalaX = width / fondo.width;
      const escalaY = height / fondo.height;
      fondo.setScale(Math.max(escalaX, escalaY));
    };

    ajustarFondo(this.scale.width, this.scale.height);
    this.scale.on('resize', (gameSize) => ajustarFondo(gameSize.width, gameSize.height));

    const overlay = document.createElement('div');
    overlay.id = 'registration-overlay';
    overlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center';
    overlay.style.zIndex = '1100';

    const btnStyleBase = `width: 280px; padding: 12px; border: 2px solid #94A3B8; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem; transition: transform 0.2s ease;`;
    const btnStyleBack = `${btnStyleBase} background-color: #334155; color: white;`;
    const btnStyleSubmit = `${btnStyleBase} background-color: #0F766E; color: white; border-color: #5EEAD4;`;

    overlay.innerHTML = `
      <div class="text-center" style="width: 100%; max-width: 960px;">
        <div class="mx-auto p-4" style="background: rgba(15, 23, 42, 0.85); border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 12px; backdrop-filter: blur(5px); max-width: 520px;">
          <h2 class="text-white text-center fw-bold mb-3" style="font-family: 'Montserrat', sans-serif;">Registro</h2>

          <form id="registration-form" novalidate>
            <div class="mb-3 text-start">
              <label for="username" class="form-label text-white fw-semibold">Nombre del usuario</label>
              <input id="username" type="text" class="form-control" style="width:100%; padding: 0.85rem 1rem; border-radius: 10px; border: 2px solid #94A3B8; background: rgba(15, 23, 42, 0.9); color: white;" autocomplete="username" />
            </div>

            <div class="mb-3 text-start position-relative">
              <label for="password" class="form-label text-white fw-semibold">Contraseña</label>
              <input id="password" type="password" class="form-control" style="width:100%; padding: 0.85rem 3.5rem 0.85rem 1rem; border-radius: 10px; border: 2px solid #94A3B8; background: rgba(15, 23, 42, 0.9); color: white;" autocomplete="new-password" />
              <button id="toggle-password" type="button" style="position: absolute; top: 38px; right: 14px; width: 36px; height: 36px; border: none; background: rgba(148, 163, 184, 0.16); color: white; border-radius: 8px; font-size: 1.1rem; cursor: pointer;">👁️‍🗨️</button>
            </div>

            <div class="mb-3 text-start position-relative">
              <label for="confirmPassword" class="form-label text-white fw-semibold">Verificar contraseña</label>
              <input id="confirmPassword" type="password" class="form-control" style="width:100%; padding: 0.85rem 3.5rem 0.85rem 1rem; border-radius: 10px; border: 2px solid #94A3B8; background: rgba(15, 23, 42, 0.9); color: white;" autocomplete="new-password" />
              <button id="toggle-confirmPassword" type="button" style="position: absolute; top: 38px; right: 14px; width: 36px; height: 36px; border: none; background: rgba(148, 163, 184, 0.16); color: white; border-radius: 8px; font-size: 1.1rem; cursor: pointer;">👁️‍🗨️</button>
            </div>
            
            <div class="mb-3 text-start">
              <div class="form-check">
                <input class="form-check-input" type="checkbox" id="accept-aviso-y-proteccion-datos" required>
                <label class="form-check-label text-white" for="accept-aviso-y-proteccion-datos">
                  He leído y acepto el <a href="assets/aviso-legal.html" target="_blank" class="text-info" style="text-decoration: underline;">Aviso Legal</a> y laAcepto la <a href="assets/proteccion-datos.html" target="_blank" class="text-info" style="text-decoration: underline;">Política de Protección de Datos</a>
                </label>
              </div>
            </div>
            <div id="validation-message" class="text-danger text-start mb-3" style="min-height: 1.4rem; font-size: 0.95rem;"></div>

            <div class="d-flex justify-content-between gap-2 flex-row">
              <button id="btn-registration-back" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleBack}">VOLVER</button>
              <button id="btn-registration-submit" class="btn text-white fw-bold shadow" style="${btnStyleSubmit}">Crear cuenta</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.getElementById('game-container').appendChild(overlay);
    this.overlayRoot = overlay;

    const form = overlay.querySelector('#registration-form');
    const usernameInput = overlay.querySelector('#username');
    const passwordInput = overlay.querySelector('#password');
    const confirmInput = overlay.querySelector('#confirmPassword');
    const validationMessage = overlay.querySelector('#validation-message');
    const togglePasswordButton = overlay.querySelector('#toggle-password');
    const toggleConfirmPasswordButton = overlay.querySelector('#toggle-confirmPassword');
    const backButton = overlay.querySelector('#btn-registration-back');

    const resetValidation = () => {
      [usernameInput, passwordInput, confirmInput].forEach((input) => {
        input.style.borderColor = '#94A3B8';
      });
      validationMessage.textContent = '';
      validationMessage.style.color = '';
    };

    const validatePassword = (value) => {
      return /[a-z]/.test(value)
        && /[A-Z]/.test(value)
        && /[0-9]/.test(value)
        && /[^A-Za-z0-9]/.test(value);
    };

    const submit = async (username, password) => {
      try {
        await registerUser(username, password);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    };

    togglePasswordButton.addEventListener('click', () => {
      const isVisible = passwordInput.type === 'text';
      passwordInput.type = isVisible ? 'password' : 'text';
      togglePasswordButton.style.textDecoration = isVisible ? 'none' : 'line-through';
    });
    
    toggleConfirmPasswordButton.addEventListener('click', () => {
      const isVisible = confirmInput.type === 'text';
      confirmInput.type = isVisible ? 'password' : 'text';
      toggleConfirmPasswordButton.style.textDecoration = isVisible ? 'none' : 'line-through';
    });

    backButton.addEventListener('click', () => this.scene.start('Login', { returnScene: this.returnScene }));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      resetValidation();

      const usernameValue = usernameInput.value.trim();
      const passwordValue = passwordInput.value;
      const confirmValue = confirmInput.value;

      if (!usernameValue) {
        usernameInput.style.borderColor = 'red';
        validationMessage.textContent = 'El nombre del usuario es requerido.';
        return;
      }

      const usernameValidation = validateUserName(usernameValue);
      if (!usernameValidation.ok) {
        usernameInput.style.borderColor = 'red';
        validationMessage.textContent = usernameValidation.message;
        return;
      }

      if (!validatePassword(passwordValue)) {
        passwordInput.style.borderColor = 'red';
        validationMessage.textContent = 'La contraseña debe tener al menos una minúscula, una mayúscula, un número y un símbolo especial.';
        return;
      }

      if (passwordValue !== confirmValue) {
        confirmInput.style.borderColor = 'red';
        validationMessage.textContent = 'Las contraseñas no coinciden.';
        return;
      }

      const acceptAviso = overlay.querySelector('#accept-aviso-y-proteccion-datos').checked;

      if (!acceptAviso) {
        validationMessage.textContent = 'Debes aceptar el Aviso Legal y la Protección de Datos.';
        return;
      }

      // Show loading state
      const submitButton = overlay.querySelector('#btn-registration-submit');
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Registrando...';

      try {
        const result = await submit(usernameValue, passwordValue);
        
        if (result.success) {
          validationMessage.style.color = '#86efac';
          validationMessage.textContent = 'Cuenta creada correctamente.';
          
          // Clear form and redirect after 2 seconds
          setTimeout(() => {
            this.scene.start('Login', { returnScene: this.returnScene });
          }, 2000);
        } else {
          usernameInput.style.borderColor = 'red';
          validationMessage.style.color = '#f87171';
          validationMessage.textContent = result.error || 'Error al registrar la cuenta.';
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
      } catch (error) {
        usernameInput.style.borderColor = 'red';
        validationMessage.style.color = '#f87171';
        validationMessage.textContent = 'Error inesperado al registrar la cuenta.';
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    });

    const buttons = overlay.querySelectorAll('.menu-btn');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
      btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.destroyOverlay();
    });
  }

  destroyOverlay() {
    if (this.overlayRoot && this.overlayRoot.parentNode) {
      this.overlayRoot.parentNode.removeChild(this.overlayRoot);
    }
  }
}
