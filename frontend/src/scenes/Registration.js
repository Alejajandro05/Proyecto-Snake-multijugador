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

    const btnStyleBase = `width: 280px; padding: 14px 18px; border: 3px solid #F59E0B; border-radius: 14px; font-family: 'Courier New', Courier, monospace; font-size: 1.05rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 10px 0 rgba(15, 23, 42, 0.8); background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(31, 41, 55, 0.98)); color: #F8FAFC;`;
    const btnStyleBack = `${btnStyleBase} background: rgba(51, 65, 85, 0.94); color: #F8FAFC; border-color: #94A3B8;`;
    const btnStyleSubmit = `${btnStyleBase} background: linear-gradient(180deg, #0F766E 0%, #14B8A6 100%); color: #111; border-color: #5EEAD4;`;

    overlay.innerHTML = `
      <style>
        #registration-overlay {
          background: rgba(2, 6, 22, 0.78);
          backdrop-filter: blur(12px);
        }

        #registration-overlay .registration-panel {
          background: rgba(8, 12, 29, 0.96);
          border: 3px solid rgba(246, 125, 49, 0.85);
          border-radius: 22px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
          padding: 32px;
        }

        #registration-overlay .form-control {
          width: 100%;
          padding: 0.95rem 1rem;
          border-radius: 14px;
          border: 2px solid rgba(148, 163, 184, 0.35);
          background: rgba(15, 23, 42, 0.95);
          color: white;
          font-family: 'Courier New', Courier, monospace;
        }

        #registration-overlay .form-control:focus {
          border-color: rgba(56, 189, 248, 0.65);
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12);
          outline: none;
        }

        #registration-overlay .form-label,
        #registration-overlay .form-check-label {
          font-family: 'Courier New', Courier, monospace;
          letter-spacing: 0.08em;
        }

        #registration-overlay #toggle-password,
        #registration-overlay #toggle-confirmPassword {
          border: none;
          background: rgba(148, 163, 184, 0.16);
          color: white;
          border-radius: 12px;
        }
      </style>
      <div class="text-center" style="width: 100%; max-width: 960px;">
        <div class="mx-auto p-4 registration-panel" style="max-width: 520px;">
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
