import Phaser from 'phaser';
import {
  loginUser,
  shouldRememberSession,
  validateUserName,
} from '../services/firebaseAuthService.js';
import { disableGameKeyboardForOverlayScene } from '../utils/formKeyboardGuard.js';

export class Login extends Phaser.Scene {
  constructor() {
    super('Login');
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
    overlay.id = 'login-overlay';
    overlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center';
    overlay.style.zIndex = '1100';

    const btnStyleBase = `width: 280px; padding: 14px 18px; border: 3px solid #F59E0B; border-radius: 14px; font-family: 'Courier New', Courier, monospace; font-size: 1.05rem; font-weight: 900; letter-spacing: 0.12em; text-transform: uppercase; transition: transform 0.2s ease, box-shadow 0.2s ease; box-shadow: 0 10px 0 rgba(15, 23, 42, 0.8); background: linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(31, 41, 55, 0.98)); color: #F8FAFC;`;
    const btnStyleBack = `${btnStyleBase} background: rgba(51, 65, 85, 0.94); color: #F8FAFC; border-color: #94A3B8;`;
    const btnStyleSubmit = `${btnStyleBase} background: linear-gradient(180deg, #0F766E 0%, #14B8A6 100%); color: #111; border-color: #5EEAD4;`;

    overlay.innerHTML = `
      <style>
        #login-overlay {
          background: rgba(2, 6, 22, 0.78);
          backdrop-filter: blur(12px);
        }

        #login-overlay .login-panel {
          background: rgba(8, 12, 29, 0.96);
          border: 3px solid rgba(246, 125, 49, 0.85);
          border-radius: 22px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55);
          padding: 32px;
        }

        #login-overlay .login-panel h2 {
          font-family: 'Courier New', Courier, monospace;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        #login-overlay .form-control {
          width: 100%;
          padding: 0.95rem 1rem;
          border-radius: 14px;
          border: 2px solid rgba(148, 163, 184, 0.35);
          background: rgba(15, 23, 42, 0.95);
          color: white;
          font-family: 'Courier New', Courier, monospace;
        }

        #login-overlay .form-control:focus {
          border-color: rgba(56, 189, 248, 0.65);
          box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12);
          outline: none;
        }

        #login-overlay .form-label,
        #login-overlay .form-check-label {
          font-family: 'Courier New', Courier, monospace;
          letter-spacing: 0.08em;
        }

        #login-overlay #toggle-password {
          border: none;
          background: rgba(148, 163, 184, 0.16);
          color: white;
          border-radius: 12px;
        }
      </style>
      <div class="text-center" style="width: 100%; max-width: 960px;">
        <div class="mx-auto p-4 login-panel" style="max-width: 520px;">
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

            <div class="mb-3 text-start">
              <div class="form-check d-flex align-items-start gap-2">
                <input class="form-check-input mt-1 flex-shrink-0" type="checkbox" id="remember-session" style="width: 1.1rem; height: 1.1rem; cursor: pointer;" />
                <label class="form-check-label text-white small" for="remember-session" style="cursor: pointer; line-height: 1.35;">
                  Mantener la sesión iniciada al recargar la página
                </label>
              </div>
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
    const rememberSessionInput = overlay.querySelector('#remember-session');
    const backButton = overlay.querySelector('#btn-login-back');

    if (rememberSessionInput) {
      rememberSessionInput.checked = shouldRememberSession();
    }

    const resetValidation = () => {
      [usernameInput, passwordInput].forEach((input) => {
        input.style.borderColor = '#94A3B8';
      });
      validationMessage.textContent = '';
      validationMessage.style.color = '';
    };

    const submit = async (username, password, remember) => {
      try {
        const user = await loginUser(username, password, { remember });
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

    backButton.addEventListener('click', () => this.scene.start(this.returnScene));

    const registrationLink = overlay.querySelector('#link-to-registration');
    registrationLink.addEventListener('click', (event) => {
      event.preventDefault();
      this.scene.start('Registration', { returnScene: this.returnScene });
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

      const usernameValidation = validateUserName(usernameValue);
      if (!usernameValidation.ok) {
        usernameInput.style.borderColor = 'red';
        validationMessage.textContent = usernameValidation.message;
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
        const rememberSession = rememberSessionInput?.checked === true;
        const result = await submit(usernameValue, passwordValue, rememberSession);
        
        if (result.success) {
          validationMessage.style.color = '#86efac';
          validationMessage.textContent = 'Sesión iniciada correctamente.';
          
          // Redirect after 2 seconds
          setTimeout(() => {
            this.scene.start(this.returnScene);
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
