import Phaser from 'phaser';
import { onlineOptionCatalogs } from '../../../shared/src/catalogs/onlineOptions.js';
import { createLobbyClient } from '../net/lobbyClient.js';
import { loadOnlinePrefs, saveOnlinePrefs } from '../utils/onlineStorage.js';

export class OnlineMenu extends Phaser.Scene {
  constructor() {
    super('OnlineMenu');
  }

  init(data) {
    this.initialErrorMessage = data?.errorMessage ?? '';
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

    this.lobbyClient = createLobbyClient();
    this.prefs = loadOnlinePrefs();
    this.publicLobbies = [];
    this.lobbyRoom = null;
    this.renderOverlay();

    if (this.initialErrorMessage) {
      this.showError(this.initialErrorMessage);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.cleanupLobbyRoom(false);
      this.destroyOverlay();
    });
  }

  renderOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'online-menu-overlay';
    overlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center';
    overlay.style.zIndex = '1100';

    const btnStyleCrear = `width: 280px; padding: 12px; background-color: #DE1A58; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: transform 0.2s ease;`;
    const btnStyleUnirse = `width: 280px; padding: 12px; background-color: #8F0177; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: transform 0.2s ease;`;
    const btnStyleLogin = `width: 280px; padding: 12px; background-color: #DE1A58; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: transform 0.2s ease;`;
    const btnStyleVolverMainMenu = `width: 280px; padding: 12px; background-color: #1A05A2; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: transform 0.2s ease;`;
    const btnStyleAction = `padding: 10px; background-color: #DE1A58; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem; transition: transform 0.2s ease;`;
    const btnStyleVolver = `padding: 10px; background-color: #334155; border: 2px solid #94A3B8; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem; transition: transform 0.2s ease;`;

    overlay.innerHTML = `
      <div class="text-center" style="margin-top: -40px; width: 100%; max-width: 960px;">
        <h1 class="display-1 fw-bold text-white mb-4" style="font-family: 'Teko', sans-serif; text-shadow: 0px 4px 20px #F67D31, 0px 0px 10px #F67D31; letter-spacing: 2px;">
            SNAKE CLASH
        </h1>
        
        <div class="mx-auto p-4" style="background: rgba(15, 23, 42, 0.85); border: 2px solid rgba(255, 255, 255, 0.2); border-radius: 12px; backdrop-filter: blur(5px);">
          <div id="online-error-box" class="alert alert-danger d-none mb-3" role="alert" style="font-family: 'Montserrat', sans-serif;"></div>

          <div id="online-home-view" class="d-flex flex-column gap-3 align-items-center">
            <h2 class="text-white text-center fw-bold mb-3" style="font-family: 'Montserrat', sans-serif;">ONLINE</h2>
            <button id="btn-online-create" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleCrear}">CREAR PARTIDA</button>
            <button id="btn-online-join" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleUnirse}">UNIRSE A PARTIDA</button>
            <button id="btn-join-login" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleLogin}">LOGIN</button>
            <button id="btn-online-back" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleVolverMainMenu}">VOLVER</button>
          </div>

          <div id="online-create-view" class="d-none text-start">
            <h2 class="text-white text-center fw-bold mb-4" style="font-family: 'Montserrat', sans-serif;">CREAR PARTIDA</h2>
            <div class="row g-4 align-items-start">
              <div class="col-12">
                <label class="form-label text-white fw-semibold mb-1 small" style="font-family: 'Montserrat', sans-serif;">Tu nombre</label>
                <input id="online-create-name" class="form-control bg-dark text-white border-secondary" value="${this.escapeHtml(this.prefs.playerName)}" maxlength="24">
              </div>
              <div class="col-12 col-md-4">
                ${this.renderSelectBlock('Modo', 'online-create-mode', onlineOptionCatalogs.modes, this.prefs.gameMode)}
              </div>
              <div class="col-12 col-md-4">
                ${this.renderSelectBlock('Skin', 'online-create-skin', onlineOptionCatalogs.skins, this.prefs.hostSkinId)}
              </div>
              <div class="col-12 col-md-4">
                ${this.renderSelectBlock('Mapa', 'online-create-map', onlineOptionCatalogs.maps, this.prefs.mapId)}
              </div>
              <div class="col-12">
                ${this.renderSelectBlock('Visibilidad', 'online-create-visibility', [
                  { id: 'public', label: 'Pública' },
                  { id: 'private', label: 'Privada' },
                ], this.prefs.visibility)}
              </div>
              <div class="col-12 d-flex gap-3 justify-content-between mt-4">
                <button id="btn-create-back" class="btn text-white fw-bold shadow menu-btn flex-fill" style="${btnStyleVolver}">VOLVER</button>
                <button id="btn-create-submit" class="btn text-white fw-bold shadow menu-btn flex-fill" style="${btnStyleAction}">CREAR PARTIDA</button>
              </div>
            </div>
          </div>

          <div id="online-join-view" class="d-none text-start">
            <h2 class="text-white text-center fw-bold mb-4" style="font-family: 'Montserrat', sans-serif;">UNIRSE A PARTIDA</h2>
            <div class="row g-4">
              <div class="col-12">
                <label class="form-label text-white fw-semibold mb-1 small" style="font-family: 'Montserrat', sans-serif;">Tu nombre</label>
                <input id="online-join-name" class="form-control bg-dark text-white border-secondary" value="${this.escapeHtml(this.prefs.playerName)}" maxlength="24">
              </div>
              <div class="col-12 col-md-6">
                <div class="p-3 h-100" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px;">
                  <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="h5 text-white m-0 fw-bold" style="font-family: 'Montserrat', sans-serif;">Salas públicas</h2>
                    <button id="btn-refresh-public" class="btn btn-sm text-white menu-btn" style="background-color: #8F0177; border: 1px solid #F67D31;">RECARGAR</button>
                  </div>
                  <div id="online-public-lobbies" class="d-flex flex-column gap-2" style="max-height: 200px; overflow-y: auto;"></div>
                </div>
              </div>
              <div class="col-12 col-md-6">
                <div class="p-3 h-100" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px;">
                  <h2 class="h5 text-white fw-bold" style="font-family: 'Montserrat', sans-serif;">Código privado</h2>
                  <input id="online-private-code" class="form-control mt-3 bg-dark text-white border-secondary" placeholder="ABC123" maxlength="12">
                  <button id="btn-private-join" class="btn text-white fw-bold shadow menu-btn mt-3 w-100" style="${btnStyleAction}">ENTRAR CON CÓDIGO</button>
                </div>
              </div>
              <div class="col-12">
                ${this.renderSelectBlock('Skin', 'online-join-skin', onlineOptionCatalogs.skins, this.prefs.guestSkinId)}
              </div>
              <div class="col-12 d-flex gap-3 justify-content-between mt-2">
                <button id="btn-join-back" class="btn text-white fw-bold shadow menu-btn w-100" style="${btnStyleVolver}">VOLVER</button>
              </div>
            </div>
          </div>

          <div id="online-waiting-view" class="d-none text-white text-start">
            <h2 class="text-center mb-4 fw-bold" style="font-family: 'Montserrat', sans-serif;">SALA DE ESPERA</h2>
            <div class="row g-3 mb-4">
              <div class="col-12 col-md-6"><div class="p-3 rounded-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1);"><strong>Host:</strong> <span id="waiting-host-name" class="text-warning">-</span></div></div>
              <div class="col-12 col-md-6"><div class="p-3 rounded-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1);"><strong>Invitado:</strong> <span id="waiting-guest-name" class="text-info">Esperando...</span></div></div>
              <div class="col-12 col-md-4"><div class="p-3 rounded-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1);"><strong>Modo:</strong> <span id="waiting-mode">-</span></div></div>
              <div class="col-12 col-md-4"><div class="p-3 rounded-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1);"><strong>Mapa:</strong> <span id="waiting-map">-</span></div></div>
              <div class="col-12 col-md-4"><div class="p-3 rounded-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1);"><strong>Visibilidad:</strong> <span id="waiting-visibility">-</span></div></div>
              <div class="col-12 d-none" id="waiting-code-wrap"><div class="p-3 rounded-3 text-center" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1);"><strong>Código:</strong> <span id="waiting-code" class="text-success fw-bold fs-5">-</span></div></div>
            </div>
            <p id="waiting-status" class="text-center mb-4 fw-bold" style="font-family: 'Montserrat', sans-serif;">Esperando jugador...</p>
            <div class="d-flex justify-content-center gap-3">
              <button id="btn-waiting-back" class="btn text-white fw-bold shadow menu-btn flex-fill" style="${btnStyleVolver}">SALIR</button>
              <button id="btn-waiting-start" class="btn text-white fw-bold shadow menu-btn flex-fill" style="${btnStyleAction}" disabled>INICIAR</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('game-container').appendChild(overlay);
    this.overlayRoot = overlay;
    this.errorBox = overlay.querySelector('#online-error-box');
    this.homeView = overlay.querySelector('#online-home-view');
    this.createView = overlay.querySelector('#online-create-view');
    this.joinView = overlay.querySelector('#online-join-view');
    this.waitingView = overlay.querySelector('#online-waiting-view');
    this.publicLobbiesRoot = overlay.querySelector('#online-public-lobbies');
    this.waitingStartButton = overlay.querySelector('#btn-waiting-start');

    overlay.querySelector('#btn-online-create').addEventListener('click', () => this.showView('create'));
    overlay.querySelector('#btn-online-join').addEventListener('click', () => this.openJoinView());
    overlay.querySelector('#btn-online-back').addEventListener('click', () => this.scene.start('MainMenu'));
    overlay.querySelector('#btn-create-back').addEventListener('click', () => this.showView('home'));
    overlay.querySelector('#btn-join-back').addEventListener('click', () => this.showView('home'));
    overlay.querySelector('#btn-join-login').addEventListener('click', () => this.scene.start('Registration'));
    overlay.querySelector('#btn-waiting-back').addEventListener('click', () => this.leaveLobbyRoom());
    overlay.querySelector('#btn-create-submit').addEventListener('click', () => this.handleCreateSubmit());
    overlay.querySelector('#btn-refresh-public').addEventListener('click', () => this.loadPublicLobbies());
    overlay.querySelector('#btn-private-join').addEventListener('click', () => this.handlePrivateJoin());
    overlay.querySelector('#btn-waiting-start').addEventListener('click', () => this.startMatch());

    const buttons = overlay.querySelectorAll('.menu-btn');
    buttons.forEach(btn => {
        btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
        btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    });
  }

  renderSelectBlock(label, id, options, selectedId) {
    const optionHtml = options
      .map((option) => `<option value="${this.escapeHtml(option.id)}" ${option.id === selectedId ? 'selected' : ''}>${this.escapeHtml(option.label)}</option>`)
      .join('');

    return `
      <label class="form-label text-white fw-semibold mb-1 small" style="font-family: 'Montserrat', sans-serif;">${this.escapeHtml(label)}</label>
      <select id="${this.escapeHtml(id)}" class="form-select bg-dark text-white border-secondary">
        ${optionHtml}
      </select>
    `;
  }

  async handleCreateSubmit() {
    try {
      this.hideError();
      this.prefs = saveOnlinePrefs({
        playerName: this.overlayRoot.querySelector('#online-create-name').value.trim() || 'Jugador',
        gameMode: this.overlayRoot.querySelector('#online-create-mode').value,
        hostSkinId: this.overlayRoot.querySelector('#online-create-skin').value,
        mapId: this.overlayRoot.querySelector('#online-create-map').value,
        visibility: this.overlayRoot.querySelector('#online-create-visibility').value,
      });

      const room = await this.lobbyClient.createLobby({
        playerName: this.prefs.playerName,
        skinId: this.prefs.hostSkinId,
        gameMode: this.prefs.gameMode,
        mapId: this.prefs.mapId,
        visibility: this.prefs.visibility,
      });

      this.attachLobbyRoom(room);
    } catch (error) {
      this.showError(error.message || 'No se pudo crear la sala.');
    }
  }

  async openJoinView() {
    this.showView('join');
    await this.loadPublicLobbies();
  }

  async loadPublicLobbies() {
    try {
      this.hideError();
      this.publicLobbies = await this.lobbyClient.fetchPublicLobbies();
      this.renderPublicLobbies();
    } catch (error) {
      this.showError(error.message || 'No se pudieron cargar las salas.');
    }
  }

  renderPublicLobbies() {
    if (!this.publicLobbiesRoot) return;

    if (this.publicLobbies.length === 0) {
      this.publicLobbiesRoot.innerHTML = '<p class="text-white-50 mb-0">No hay salas públicas disponibles.</p>';
      return;
    }

    this.publicLobbiesRoot.innerHTML = this.publicLobbies.map((lobby) => `
      <button class="btn text-white text-start w-100 lobby-join-btn menu-btn mb-2" data-lobby-id="${this.escapeHtml(lobby.lobbyId)}" style="background-color: #334155; border: 1px solid #94A3B8; border-radius: 8px; transition: transform 0.2s ease;">
        <div><strong>${this.escapeHtml(lobby.hostName || 'Host')}</strong></div>
        <small class="text-white-50">${this.escapeHtml(lobby.gameMode)} | ${this.escapeHtml(lobby.mapId)} | ${lobby.playerCount}/${lobby.maxPlayers}</small>
      </button>
    `).join('');

    this.publicLobbiesRoot.querySelectorAll('.lobby-join-btn').forEach((button) => {
      button.addEventListener('click', () => this.handlePublicJoin(button.dataset.lobbyId));
      button.addEventListener('mouseenter', () => button.style.transform = 'scale(1.02)');
      button.addEventListener('mouseleave', () => button.style.transform = 'scale(1)');
    });
  }

  async handlePublicJoin(lobbyId) {
    if (!lobbyId) return;

    try {
      this.hideError();
      this.prefs = saveOnlinePrefs({
        playerName: this.overlayRoot.querySelector('#online-join-name').value.trim() || 'Jugador',
        guestSkinId: this.overlayRoot.querySelector('#online-join-skin').value,
      });

      const room = await this.lobbyClient.joinLobbyById(lobbyId, {
        playerName: this.prefs.playerName,
        skinId: this.prefs.guestSkinId,
      });

      this.attachLobbyRoom(room);
    } catch (error) {
      this.showError(error.message || 'No se pudo entrar en la sala publica.');
    }
  }

  async handlePrivateJoin() {
    try {
      this.hideError();
      this.prefs = saveOnlinePrefs({
        playerName: this.overlayRoot.querySelector('#online-join-name').value.trim() || 'Jugador',
        guestSkinId: this.overlayRoot.querySelector('#online-join-skin').value,
      });

      const code = this.overlayRoot.querySelector('#online-private-code').value.trim().toUpperCase();
      if (!code) {
        this.showError('Introduce un codigo.');
        return;
      }

      const lobbyId = await this.lobbyClient.resolveInviteCode(code);
      if (!lobbyId) {
        this.showError('Codigo no valido o sala cerrada.');
        return;
      }

      const room = await this.lobbyClient.joinLobbyById(lobbyId, {
        playerName: this.prefs.playerName,
        skinId: this.prefs.guestSkinId,
      });

      this.attachLobbyRoom(room);
    } catch (error) {
      this.showError(error.message || 'No se pudo entrar con codigo.');
    }
  }

  attachLobbyRoom(room) {
    this.cleanupLobbyRoom(false);
    this.lobbyRoom = room;

    room.onStateChange((state) => {
      this.updateWaitingState(state);
      if (state.matchRoomId) {
        const isHost = room.sessionId === state.host.sessionId;
        const skinId = isHost ? state.host.skinId : state.guest.skinId;
        this.scene.start('OnlineGame', {
          matchRoomId: state.matchRoomId,
          skinId,
        });
      }
    });

    room.onLeave(() => {
      if (this.scene.isActive('OnlineMenu')) {
        this.lobbyRoom = null;
        this.showError('La sala se ha cerrado.');
        this.showView('home');
      }
    });

    this.showView('waiting');
    this.updateWaitingState(room.state);
  }

  updateWaitingState(state) {
    if (!this.waitingView) return;
    const host = state?.host ?? {};
    const guest = state?.guest ?? {};
    const status = state?.status ?? 'waiting';
    const visibility = state?.visibility ?? 'public';
    const inviteCode = state?.inviteCode ?? '';
    const gameMode = state?.gameMode ?? '-';
    const mapId = state?.mapId ?? '-';

    this.overlayRoot.querySelector('#waiting-host-name').textContent = host.playerName || 'Pendiente';
    this.overlayRoot.querySelector('#waiting-guest-name').textContent = guest.playerName || 'Esperando...';
    this.overlayRoot.querySelector('#waiting-mode').textContent = gameMode;
    this.overlayRoot.querySelector('#waiting-map').textContent = mapId;
    this.overlayRoot.querySelector('#waiting-visibility').textContent = visibility === 'private' ? 'Privada' : 'Publica';
    this.overlayRoot.querySelector('#waiting-status').textContent = status === 'ready'
      ? 'Sala lista. El host puede iniciar.'
      : 'Esperando jugador...';

    const codeWrap = this.overlayRoot.querySelector('#waiting-code-wrap');
    const codeValue = this.overlayRoot.querySelector('#waiting-code');
    const isPrivate = visibility === 'private' && inviteCode;
    codeWrap.classList.toggle('d-none', !isPrivate);
    codeValue.textContent = isPrivate ? inviteCode : '';

    const isHost = this.lobbyRoom && this.lobbyRoom.sessionId === host.sessionId;
    this.waitingStartButton.disabled = !(isHost && status === 'ready' && !state?.matchRoomId);
  }

  async startMatch() {
    if (!this.lobbyRoom) return;
    this.hideError();
    this.lobbyRoom.send('startMatch');
  }

  async leaveLobbyRoom() {
    await this.cleanupLobbyRoom(true);
    this.showView('home');
  }

  async cleanupLobbyRoom(leaveRoom) {
    if (!this.lobbyRoom) return;
    const room = this.lobbyRoom;
    this.lobbyRoom = null;
    if (leaveRoom) {
      try {
        await room.leave();
      } catch {
        // ignore
      }
    }
  }

  showView(viewName) {
    this.hideError();
    this.homeView.classList.toggle('d-none', viewName !== 'home');
    this.createView.classList.toggle('d-none', viewName !== 'create');
    this.joinView.classList.toggle('d-none', viewName !== 'join');
    this.waitingView.classList.toggle('d-none', viewName !== 'waiting');
  }

  showError(message) {
    if (!this.errorBox) return;
    this.errorBox.textContent = message;
    this.errorBox.classList.remove('d-none');
  }

  hideError() {
    if (!this.errorBox) return;
    this.errorBox.textContent = '';
    this.errorBox.classList.add('d-none');
  }

  destroyOverlay() {
    if (this.overlayRoot?.parentNode) {
      this.overlayRoot.parentNode.removeChild(this.overlayRoot);
    }
    this.overlayRoot = null;
  }

  escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}
