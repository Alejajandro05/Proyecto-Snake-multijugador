import Phaser from 'phaser';
import { loginUser } from '../services/firebaseAuthService.js';

export class Login extends Phaser.Scene {
  constructor() {
    super('Login');
  }

  create() {
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
    overlay.id = 'login-overlay';
    overlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center';
    overlay.style.zIndex = '1100';

    const btnStyleBase = `width: 280px; padding: 12px; border: 2px solid #94A3B8; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem; transition: transform 0.2s ease;`;
    const btnStyleBack = `${btnStyleBase} background-color: #334155; color: white;`;
    const btnStyleSubmit = `${btnStyleBase} background-color: #0F766E; color: white; border-color: #5EEAD4;`;

    overlay.innerHTML = `
      <div class="text-center" style="margin-top: -40px; width: 100%; max-width: 960px;">
        <h1 class="display-1 fw-bold text-white mb-4" style="font-family: 'Teko', sans-serif; text-shadow: 0px 4px 20px #F67D31, 0px 0px 10px #F67D31; letter-spacing: 2px;">
            SNAKE CLASH
        </h1>

        <div class="mx-auto p-4" style="background: rgba(15, 23, 42, 0.85); border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 12px; backdrop-filter: blur(5px); max-width: 520px;">
          <h2 class="text-white text-center fw-bold mb-3" style="font-family: 'Montserrat', sans-serif;">Iniciar Sesión</h2>

          <form id="login-form" novalidate>
            <div class="mb-3 text-start">
              <label for="username" class="form-label text-white fw-semibold">Nombre del usuario</label>
              <input id="username" type="text" class="form-control" style="width:100%; padding: 0.85rem 1rem; border-radius: 10px; border: 2px solid #94A3B8; background: rgba(15, 23, 42, 0.9); color: white;" autocomplete="username" />
            </div>

            <div class="mb-3 text-start position-relative">
              <label for="password" class="form-label text-white fw-semibold">Contraseña</label>
              <input id="password" type="password" class="form-control" style="width:100%; padding: 0.85rem 3.5rem 0.85rem 1rem; border-radius: 10px; border: 2px solid #94A3B8; background: rgba(15, 23, 42, 0.9); color: white;" autocomplete="current-password" />
              <button id="toggle-password" type="button" style="position: absolute; top: 38px; right: 14px; width: 36px; height: 36px; border: none; background: rgba(148, 163, 184, 0.16); color: white; border-radius: 8px; font-size: 1.1rem; cursor: pointer;">👁️‍🗨️</button>
            </div>

            <div id="validation-message" class="text-danger text-start mb-3" style="min-height: 1.4rem; font-size: 0.95rem;"></div>

            <div class="d-flex justify-content-between gap-2 flex-row">
              <button id="btn-login-back" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleBack}">VOLVER</button>
              <button id="btn-login-submit" class="btn text-white fw-bold shadow" style="${btnStyleSubmit}">Iniciar Sesión</button>
            </div>
          </form>

          <div class="text-center mt-3">
            <p class="text-white">¿No tienes cuenta? <a href="#" id="link-to-registration" class="text-info" style="text-decoration: underline;">Regístrate aquí</a></p>
          </div>
        </div>
      </div>
    `;

    document.getElementById('game-container').appendChild(overlay);
    this.overlayRoot = overlay;

    const form = overlay.querySelector('#login-form');
    const usernameInput = overlay.querySelector('#username');
    const passwordInput = overlay.querySelector('#password');
    const validationMessage = overlay.querySelector('#validation-message');
    const togglePasswordButton = overlay.querySelector('#toggle-password');
    const backButton = overlay.querySelector('#btn-login-back');

    const resetValidation = () => {
      [usernameInput, passwordInput].forEach((input) => {
        input.style.borderColor = '#94A3B8';
      });
      validationMessage.textContent = '';
      validationMessage.style.color = '';
    };

    const submit = async (username, password) => {
      try {
        const user = await loginUser(username, password);
        console.log('User UUID:', user.uid);
        return { success: true, user };
      } catch (error) {
        return { success: false, error: error.message };
      }
    };

    togglePasswordButton.addEventListener('click', () => {
      const isVisible = passwordInput.type === 'text';
      passwordInput.type = isVisible ? 'password' : 'text';
      togglePasswordButton.style.textDecoration = isVisible ? 'none' : 'line-through';
    });

    backButton.addEventListener('click', () => this.scene.start('OnlineMenu'));

    const registrationLink = overlay.querySelector('#link-to-registration');
    registrationLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.scene.start('Registration');
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      resetValidation();

      const usernameValue = usernameInput.value.trim();
      const passwordValue = passwordInput.value;

      if (!usernameValue) {
        usernameInput.style.borderColor = 'red';
        validationMessage.textContent = 'El nombre del usuario es requerido.';
        return;
      }

      if (!passwordValue) {
        passwordInput.style.borderColor = 'red';
        validationMessage.textContent = 'La contraseña es requerida.';
        return;
      }

      // Show loading state
      const submitButton = overlay.querySelector('#btn-login-submit');
      const originalButtonText = submitButton.textContent;
      submitButton.disabled = true;
      submitButton.textContent = 'Iniciando sesión...';

      try {
        const result = await submit(usernameValue, passwordValue);
        
        if (result.success) {
          validationMessage.style.color = '#86efac';
          validationMessage.textContent = 'Sesión iniciada correctamente.';
          
          // Redirect after 2 seconds
          setTimeout(() => {
            this.scene.start('OnlineMenu');
          }, 2000);
        } else {
          usernameInput.style.borderColor = 'red';
          passwordInput.style.borderColor = 'red';
          validationMessage.style.color = '#f87171';
          validationMessage.textContent = result.error || 'Error al iniciar sesión.';
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }
      } catch (error) {
        usernameInput.style.borderColor = 'red';
        passwordInput.style.borderColor = 'red';
        validationMessage.style.color = '#f87171';
        validationMessage.textContent = 'Error inesperado al iniciar sesión.';
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