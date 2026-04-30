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

    const btnStyleVolver = `width: 280px; padding: 12px; background-color: #334155; border: 2px solid #94A3B8; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: transform 0.2s ease;`;

    overlay.innerHTML = `
      <div class="text-center" style="margin-top: -40px; width: 100%; max-width: 960px;">
        <h1 class="display-1 fw-bold text-white mb-4" style="font-family: 'Teko', sans-serif; text-shadow: 0px 4px 20px #F67D31, 0px 0px 10px #F67D31; letter-spacing: 2px;">
            SNAKE CLASH
        </h1>

        <div class="mx-auto p-4" style="background: rgba(15, 23, 42, 0.85); border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 12px; backdrop-filter: blur(5px);">
          <h2 class="text-white text-center fw-bold mb-3" style="font-family: 'Montserrat', sans-serif;">Registration</h2>
          <!-- Contenido del pagina Registration -->

          <div class="d-flex justify-content-center mt-4">
            <button id="btn-registration-back" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleVolver}">VOLVER</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('game-container').appendChild(overlay);
    this.overlayRoot = overlay;

    overlay.querySelector('#btn-registration-back').addEventListener('click', () => this.scene.start('MainMenu'));

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