import Phaser from 'phaser';

export class Registration extends Phaser.Scene {
  constructor() {
    super('Registration');
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
    overlay.id = 'registration-overlay';
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

            <!--<div class="mb-3 text-start" position-relative">
              <label for="confirmPassword" class="form-label text-white fw-semibold">Verificar contraseña</label>
              <input id="confirmPassword" type="password" class="form-control" style="width:100%; padding: 0.85rem 1rem; border-radius: 10px; border: 2px solid #94A3B8; background: rgba(15, 23, 42, 0.9); color: white;" autocomplete="new-password" />
              <button id="toggle-password" type="button" style="position: absolute; top: 38px; right: 14px; width: 36px; height: 36px; border: none; background: rgba(148, 163, 184, 0.16); color: white; border-radius: 8px; font-size: 1.1rem; cursor: pointer;">👁️‍🗨️</button>
            </div>-->

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

    const existingUsers = ['player1', 'player2', 'admin'];

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

    const submit = (username, password) => {
      console.log('submit', username, password);
      return existingUsers.includes(username.trim().toLowerCase());
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

    backButton.addEventListener('click', () => this.scene.start('MainMenu'));

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      resetValidation();

      const usernameValue = usernameInput.value.trim();
      const passwordValue = passwordInput.value;
      const confirmValue = confirmInput.value;

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

      const alreadyExists = submit(usernameValue, passwordValue);
      if (alreadyExists) {
        usernameInput.style.borderColor = 'red';
        validationMessage.textContent = 'Usuario ya existe';
        return;
      }

      validationMessage.style.color = '#86efac';
      validationMessage.textContent = 'Cuenta creada correctamente (simulado).';
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