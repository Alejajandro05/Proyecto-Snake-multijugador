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
          background: rgba(3, 7, 24, 0.82);
          backdrop-filter: blur(10px);
        }

        .controls-panel {
          background: rgba(8, 12, 29, 0.96);
          border: 3px solid rgba(246, 125, 49, 0.85);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 0 24px 70px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.04);
          color: white;
          font-family: 'Courier New', Courier, monospace;
          max-width: 700px;
          max-height: 90vh;
          overflow-y: auto;
          width: 100%;
        }

        .controls-title {
          text-align: center;
          color: #FDE68A;
          font-size: 2rem;
          font-weight: 900;
          margin-bottom: 28px;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          text-shadow: 0 0 18px rgba(246, 125, 49, 0.22);
        }

        .controls-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 26px;
          margin-bottom: 28px;
        }

        .player-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .player-label {
          color: #FDE68A;
          font-size: 1.05rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          border-bottom: 2px solid rgba(253, 230, 138, 0.3);
          padding-bottom: 10px;
        }

        .control-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .control-label {
          color: #C8D6FF;
          font-size: 0.95rem;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          font-weight: 700;
          min-width: 60px;
        }

        .control-key {
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.92));
          border: 3px solid #DE1A58;
          color: #F8FAFC;
          padding: 10px 14px;
          border-radius: 14px;
          cursor: pointer;
          font-weight: 800;
          font-size: 0.95rem;
          min-width: 70px;
          text-align: center;
          font-family: 'Courier New', Courier, monospace;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          transition: transform 0.12s ease, background 0.12s ease, border-color 0.12s ease;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06), 0 5px 0 rgba(0, 0, 0, 0.35);
        }

        .control-key:hover {
          transform: translateY(-1px);
          background: rgba(255, 255, 255, 0.12);
          border-color: #F59E0B;
        }

        .control-key.waiting {
          background: rgba(76, 175, 80, 0.35);
          border-color: rgba(76, 175, 80, 0.9);
          color: #D9F99D;
          animation: pulse 0.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .controls-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 20px;
          flex-wrap: wrap;
        }

        .btn {
          padding: 14px 18px;
          border-radius: 14px;
          border: 3px solid #F59E0B;
          font-weight: 900;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.16em;
          font-size: 0.95rem;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          font-family: 'Courier New', Courier, monospace;
          box-shadow: 0 10px 0 rgba(15, 23, 42, 0.85);
          background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(31, 41, 55, 0.95));
          color: #F8FAFC;
        }

        .btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 14px 0 rgba(15, 23, 42, 0.8);
        }

        .btn-primary { background: linear-gradient(180deg, #F59E0B 0%, #DE1A58 100%); color: #111; border-color: #DE1A58; }
        .btn-secondary { background: rgba(255, 255, 255, 0.08); color: #F8FAFC; border-color: rgba(255, 255, 255, 0.3); }
        .btn-danger { background: rgba(244, 67, 54, 0.18); color: #FFCDD2; border-color: #EF4444; }

        .btn-primary:hover { background: linear-gradient(180deg, #FDE68A 0%, #F59E0B 100%); }
        .btn-secondary:hover { background: rgba(255, 255, 255, 0.16); }
        .btn-danger:hover { background: rgba(244, 67, 54, 0.28); }

        .info-message, .error-message {
          text-align: center;
          font-size: 0.95rem;
          margin-top: 18px;
          padding: 12px 14px;
          border-radius: 12px;
          font-family: 'Courier New', Courier, monospace;
        }

        .info-message {
          color: #9CCC65;
          background: rgba(76, 175, 80, 0.12);
          border: 1px solid rgba(76, 175, 80, 0.35);
        }

        .error-message {
          color: #EF5350;
          background: rgba(244, 67, 54, 0.14);
          border: 1px solid rgba(244, 67, 54, 0.35);
        }

        @media (max-width: 768px) {
          .controls-container {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .controls-panel {
            padding: 24px;
          }

          .controls-title {
            font-size: 1.6rem;
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

    this.onControlsKeydown = (event) => {
      if (this.waitingForInput) {
        this.handleKeyInput(event.key.toUpperCase());
      }
    };
    this.input.keyboard.on('keydown', this.onControlsKeydown);
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
    if (this.onControlsKeydown) {
      this.input.keyboard?.off('keydown', this.onControlsKeydown);
      this.onControlsKeydown = null;
    }

    const overlay = document.getElementById('controls-menu-overlay');
    if (overlay) overlay.remove();
  }

  sleep() {
    const overlay = document.getElementById('controls-menu-overlay');
    if (overlay) overlay.remove();
  }
}
