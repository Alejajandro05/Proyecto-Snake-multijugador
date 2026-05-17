import Phaser from 'phaser';
import { 
  getControlsConfig, 
  saveControlsConfig, 
  resetControlsToDefault,
  DEFAULT_CONTROLS,
  VALID_KEYS
} from '../utils/controlsConfig.js';

export class ControlsMenu extends Phaser.Scene {
  constructor() {
    super('ControlsMenu');
    this.selectedKey = null;
    this.waitingForInput = false;
    this.waitingForPlayer = null;
    this.waitingForDirection = null;
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

    // Load current controls
    this.controls = getControlsConfig(localStorage);

    // Create UI overlay
    const overlay = document.createElement('div');
    overlay.id = 'controls-menu-overlay';
    overlay.className = 'position-absolute top-0 start-0 w-100 h-100';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.padding = '20px';

    overlay.innerHTML = `
      <style>
        #controls-menu-overlay {
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(5px);
        }

        .controls-panel {
          background: linear-gradient(180deg, rgba(17, 24, 39, 0.95), rgba(49, 12, 53, 0.95));
          border: 2px solid rgba(246, 125, 49, 0.65);
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45), 0 0 24px rgba(246, 125, 49, 0.18);
          color: white;
          font-family: 'Montserrat', sans-serif;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          width: 100%;
        }

        .controls-title {
          text-align: center;
          color: #FDE68A;
          font-size: 1.8rem;
          font-weight: 800;
          margin-bottom: 30px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .controls-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }

        .player-controls {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .player-label {
          color: #FDE68A;
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid rgba(253, 230, 138, 0.3);
          padding-bottom: 10px;
        }

        .control-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .control-label {
          color: #B0B0B0;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          font-weight: 600;
          min-width: 50px;
        }

        .control-key {
          background: rgba(246, 125, 49, 0.2);
          border: 1px solid rgba(246, 125, 49, 0.5);
          color: #FDE68A;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 700;
          font-size: 0.9rem;
          min-width: 60px;
          text-align: center;
          transition: all 0.2s;
        }

        .control-key:hover {
          background: rgba(246, 125, 49, 0.4);
          border-color: rgba(246, 125, 49, 0.8);
          transform: scale(1.05);
        }

        .control-key.waiting {
          background: rgba(76, 175, 80, 0.3);
          border-color: rgba(76, 175, 80, 0.8);
          color: #9CCC65;
          animation: pulse 0.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .controls-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          margin-top: 30px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 12px 24px;
          border: none;
          border-radius: 6px;
          font-weight: 700;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 0.9rem;
          transition: all 0.2s;
          font-family: 'Montserrat', sans-serif;
        }

        .btn-primary {
          background: linear-gradient(135deg, #F67D31 0%, #F5A623 100%);
          color: white;
          border: 2px solid #F67D31;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(246, 125, 49, 0.4);
        }

        .btn-secondary {
          background: transparent;
          color: #B0B0B0;
          border: 2px solid #B0B0B0;
        }

        .btn-secondary:hover {
          color: #FDE68A;
          border-color: #FDE68A;
        }

        .btn-danger {
          background: rgba(244, 67, 54, 0.2);
          color: #EF5350;
          border: 2px solid #EF5350;
        }

        .btn-danger:hover {
          background: rgba(244, 67, 54, 0.3);
          transform: translateY(-2px);
        }

        .info-message {
          text-align: center;
          color: #9CCC65;
          font-size: 0.9rem;
          margin-top: 15px;
          padding: 10px;
          background: rgba(76, 175, 80, 0.1);
          border-radius: 4px;
          border-left: 3px solid #9CCC65;
        }

        .error-message {
          text-align: center;
          color: #EF5350;
          font-size: 0.9rem;
          margin-top: 15px;
          padding: 10px;
          background: rgba(244, 67, 54, 0.1);
          border-radius: 4px;
          border-left: 3px solid #EF5350;
        }

        @media (max-width: 768px) {
          .controls-container {
            grid-template-columns: 1fr;
            gap: 20px;
          }

          .controls-panel {
            padding: 20px;
          }

          .controls-title {
            font-size: 1.4rem;
          }
        }
      </style>

      <div class="controls-panel">
        <h1 class="controls-title">⚙️ Configuración de Controles</h1>
        
        <div class="controls-container">
          <div class="player-controls">
            <div class="player-label">🎮 Jugador 1</div>
            <div class="control-row">
              <span class="control-label">↑ Arriba</span>
              <button class="control-key" data-player="player1" data-direction="up">${this.controls.player1.up}</button>
            </div>
            <div class="control-row">
              <span class="control-label">↓ Abajo</span>
              <button class="control-key" data-player="player1" data-direction="down">${this.controls.player1.down}</button>
            </div>
            <div class="control-row">
              <span class="control-label">← Izq</span>
              <button class="control-key" data-player="player1" data-direction="left">${this.controls.player1.left}</button>
            </div>
            <div class="control-row">
              <span class="control-label">→ Der</span>
              <button class="control-key" data-player="player1" data-direction="right">${this.controls.player1.right}</button>
            </div>
          </div>

          <div class="player-controls">
            <div class="player-label">🎮 Jugador 2</div>
            <div class="control-row">
              <span class="control-label">↑ Arriba</span>
              <button class="control-key" data-player="player2" data-direction="up">${this.controls.player2.up}</button>
            </div>
            <div class="control-row">
              <span class="control-label">↓ Abajo</span>
              <button class="control-key" data-player="player2" data-direction="down">${this.controls.player2.down}</button>
            </div>
            <div class="control-row">
              <span class="control-label">← Izq</span>
              <button class="control-key" data-player="player2" data-direction="left">${this.controls.player2.left}</button>
            </div>
            <div class="control-row">
              <span class="control-label">→ Der</span>
              <button class="control-key" data-player="player2" data-direction="right">${this.controls.player2.right}</button>
            </div>
          </div>
        </div>

        <div id="message-area"></div>

        <div class="controls-buttons">
          <button class="btn btn-danger" id="reset-btn">Restaurar Predeterminados</button>
          <button class="btn btn-secondary" id="back-btn">Atrás</button>
          <button class="btn btn-primary" id="apply-btn">Aplicar Cambios</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Setup event listeners
    this.setupEventListeners(overlay);
  }

  setupEventListeners(overlay) {
    const keyButtons = overlay.querySelectorAll('.control-key');
    const resetBtn = overlay.querySelector('#reset-btn');
    const backBtn = overlay.querySelector('#back-btn');
    const applyBtn = overlay.querySelector('#apply-btn');

    keyButtons.forEach(btn => {
      btn.addEventListener('click', () => this.startWaitingForInput(btn));
    });

    resetBtn.addEventListener('click', () => this.resetControls());
    backBtn.addEventListener('click', () => this.goBack());
    applyBtn.addEventListener('click', () => this.applyChanges());

    // Listen for keyboard input
    this.input.keyboard.on('keydown', (event) => {
      if (this.waitingForInput) {
        this.handleKeyInput(event.key.toUpperCase());
      }
    });
  }

  startWaitingForInput(button) {
    if (this.waitingForInput) return;

    const player = button.dataset.player;
    const direction = button.dataset.direction;

    this.waitingForInput = true;
    this.waitingForPlayer = player;
    this.waitingForDirection = direction;

    button.classList.add('waiting');
    button.textContent = '...';

    this.showMessage('Presiona la tecla deseada', 'info');
  }

  handleKeyInput(key) {
    if (!this.waitingForInput) return;

    const button = document.querySelector(`[data-player="${this.waitingForPlayer}"][data-direction="${this.waitingForDirection}"]`);
    
    // Normalize key
    let normalizedKey = key;
    if (key.startsWith('ARROW')) {
      normalizedKey = key.replace('ARROW', '').toUpperCase();
    }

    // Check if key is valid
    const validKeys = ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'I', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'SPACE', 'ENTER', 'Q', 'E', 'R', 'T', 'U', 'O', 'P'];
    if (!validKeys.includes(normalizedKey)) {
      this.showMessage('Tecla no válida. Intenta de nuevo.', 'error');
      button.classList.remove('waiting');
      button.textContent = this.controls[this.waitingForPlayer][this.waitingForDirection];
      this.waitingForInput = false;
      return;
    }

    // Check for duplicates
    let isDuplicate = false;
    for (const p in this.controls) {
      for (const dir in this.controls[p]) {
        if (this.controls[p][dir] === normalizedKey && !(p === this.waitingForPlayer && dir === this.waitingForDirection)) {
          isDuplicate = true;
          break;
        }
      }
      if (isDuplicate) break;
    }

    if (isDuplicate) {
      this.showMessage(`La tecla ${normalizedKey} ya está en uso.`, 'error');
      button.classList.remove('waiting');
      button.textContent = this.controls[this.waitingForPlayer][this.waitingForDirection];
      this.waitingForInput = false;
      return;
    }

    // Update the control
    this.controls[this.waitingForPlayer][this.waitingForDirection] = normalizedKey;
    button.textContent = normalizedKey;
    button.classList.remove('waiting');
    this.waitingForInput = false;

    this.showMessage(`${this.waitingForDirection.toUpperCase()} actualizado a ${normalizedKey}`, 'info');
  }

  resetControls() {
    this.controls = resetControlsToDefault(localStorage);
    this.refreshDisplay();
    this.showMessage('Controles restaurados a predeterminados.', 'info');
  }

  refreshDisplay() {
    const keyButtons = document.querySelectorAll('.control-key');
    keyButtons.forEach(btn => {
      const player = btn.dataset.player;
      const direction = btn.dataset.direction;
      btn.textContent = this.controls[player][direction];
    });
  }

  applyChanges() {
    saveControlsConfig(localStorage, this.controls);
    this.showMessage('Cambios guardados exitosamente.', 'info');
    setTimeout(() => {
      this.goBack();
    }, 500);
  }

  showMessage(text, type = 'info') {
    const messageArea = document.querySelector('#message-area');
    messageArea.innerHTML = `<div class="${type}-message">${text}</div>`;
  }

  goBack() {
    // Clean up
    const overlay = document.getElementById('controls-menu-overlay');
    if (overlay) overlay.remove();

    // Go back to main menu
    this.scene.start('MainMenu');
  }

  shutdown() {
    const overlay = document.getElementById('controls-menu-overlay');
    if (overlay) overlay.remove();
  }

  sleep() {
    const overlay = document.getElementById('controls-menu-overlay');
    if (overlay) overlay.remove();
  }
}
