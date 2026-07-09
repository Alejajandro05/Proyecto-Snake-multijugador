import Phaser from 'phaser';
import { Client } from '@colyseus/sdk';
import { onlineOptionCatalogs } from '../../../shared/src/catalogs/onlineOptions.js';
import {
  createLobbyClient,
  getResumableActiveLobbyRoom,
  setActiveLobbyRoom,
} from '../net/lobbyClient.js';
import { getMapAsset, getSnakeAsset } from '../config/gameAssetRegistry.js';
import { loadOnlinePrefs, saveOnlinePrefs } from '../utils/onlineStorage.js';
import {
  extractLeaderboardUserName,
  getCurrentUser,
  isUserLoggedIn,
} from '../services/firebaseAuthService.js';
import { disableGameKeyboardForOverlayScene } from '../utils/formKeyboardGuard.js';
import {
  ACCOUNT_GUEST_LABEL,
  bindAccountButton,
  closeAccountDropdown,
} from '../ui/accountButton.js';

// --- FUNCIONES GLOBALES PARA LA URL DEL SERVIDOR ---
function normalizeHttpUrlToWebSocket(url) {
  const s = String(url ?? '').trim();
  if (!s) return '';
  if (s.startsWith('https://')) return `wss://${s.slice('https://'.length)}`;
  if (s.startsWith('http://')) return `ws://${s.slice('http://'.length)}`;
  return s;
}

function getPublicWsPathSuffix() {
  const raw = import.meta.env.VITE_WS_PATH;
  if (raw === '') return '';
  if (raw === undefined || raw === null) return '/ws';
  const p = String(raw).trim();
  return p.startsWith('/') ? p : `/${p}`;
}

function getColyseusServerUrl() {
  const explicitWs = String(import.meta.env.VITE_COLYSEUS_URL ?? '').trim();
  if (explicitWs) return explicitWs;
  const fromHttpEnv = normalizeHttpUrlToWebSocket(import.meta.env.VITE_SERVER_URL ?? '');
  if (fromHttpEnv) return fromHttpEnv;
  if (import.meta.env.DEV) return 'ws://localhost:2567';
  const { protocol, host } = window.location;
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${host}${getPublicWsPathSuffix()}`;
}
// --------------------------------------------------

export class OnlineMenu extends Phaser.Scene {
  constructor() {
    super('OnlineMenu');
  }

  init(data) {
    this.initialErrorMessage = data?.errorMessage ?? '';
    this.resumeLobby = data?.resumeLobby === true;
    this.resumeLobbyRoomId = data?.lobbyRoomId ?? '';
    this.completedMatchRoomId = data?.completedMatchRoomId ?? '';
  }

  create() {
    closeAccountDropdown();
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

    this.lobbyClient = createLobbyClient();
    this.prefs = loadOnlinePrefs();
    this.publicLobbies = [];
    this.lobbyRoom = null;
    this.renderOverlay();
    void this.applyOnlineNameFieldsForAuthUser();

    if (this.initialErrorMessage) {
      this.showError(this.initialErrorMessage);
    }

    this.resumeActiveLobbyIfRequested();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      closeAccountDropdown();
      this.cleanupLobbyRoom(false);
      this.destroyOverlay();
    });
  }

  renderOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'online-menu-overlay';
    overlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
    overlay.style.zIndex = '10050';
    overlay.style.overflow = 'hidden';
    overlay.style.boxSizing = 'border-box';
    overlay.style.paddingTop = 'max(0.75rem, env(safe-area-inset-top, 0px))';
    overlay.style.paddingBottom = 'max(0.75rem, env(safe-area-inset-bottom, 0px))';
    overlay.style.paddingLeft = 'max(12px, env(safe-area-inset-left, 0px))';
    overlay.style.paddingRight = 'max(12px, env(safe-area-inset-right, 0px))';

    const btnStyleCrear = `width: 100%; padding: 14px; background-color: #DE1A58; border: 2px solid #F67D31; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.15rem; transition: transform 0.2s ease;`;
    const btnStyleUnirse = `width: 100%; padding: 14px; background-color: #8F0177; border: 2px solid #F67D31; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.15rem; transition: transform 0.2s ease;`;
    const btnStyleRanked = `width: 100%; padding: 14px; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border: 2px solid #FEF3C7; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.15rem; text-shadow: 1px 1px 4px rgba(0,0,0,0.5); transition: transform 0.2s ease; box-shadow: 0 0 15px rgba(245, 158, 11, 0.5);`;
    const btnStyleLogin = `width: 100%; padding: 14px; background-color: #1ad1de; border: 2px solid #0d8b94; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.15rem; color: #111; transition: transform 0.2s ease;`;
    const btnStyleVolverMainMenu = `width: 320px; padding: 14px; background-color: #1A05A2; border: 2px solid #F67D31; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.15rem; transition: transform 0.2s ease;`;
    const btnStyleAction = `padding: 10px; background-color: #DE1A58; border: 2px solid #F67D31; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem; transition: transform 0.2s ease;`;
    const btnStyleVolver = `padding: 10px; background-color: #334155; border: 2px solid #94A3B8; border-radius: 8px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem; transition: transform 0.2s ease;`;

    overlay.innerHTML = `
      <div class="w-100 px-2 px-sm-3 d-flex flex-column align-items-center" style="max-width: 960px; min-height: 0;">
        <div class="online-menu-card w-100 rounded-4 text-center p-4 d-flex flex-column align-items-stretch">
          <style>
            #online-menu-overlay .online-skin-arrow { transition: transform 0.2s; cursor: pointer; }
            #online-menu-overlay .online-skin-arrow:hover { transform: scale(1.2); }
            #online-menu-overlay .online-map-option { border: 2px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.06); color: white; transition: all 0.2s; }
            #online-menu-overlay .online-map-option:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.4); }
            #online-menu-overlay .online-map-option.active { border-color: #F67D31; box-shadow: 0 0 0 2px rgba(246,125,49,0.2), 0 12px 28px rgba(0,0,0,0.25); }
            #online-menu-overlay .online-create-appearance-block {
              background: rgba(255,255,255,0.05);
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 12px;
            }
            @media (min-width: 768px) {
              #online-menu-overlay .online-create-split-map { border-left: 1px solid rgba(255,255,255,0.18); padding-left: 1.25rem; }
              #online-menu-overlay .online-split-line { border-right: 1px solid rgba(255,255,255,0.18); padding-right: 1.5rem; }
            }
            @media (max-width: 767.98px) {
              #online-menu-overlay .online-create-split-map { border-top: 1px solid rgba(255,255,255,0.18); padding-top: 1rem; margin-top: 0.25rem; }
              #online-menu-overlay .online-split-line { border-bottom: 1px solid rgba(255,255,255,0.18); padding-bottom: 1.5rem; margin-bottom: 1.5rem; }
            }
            #online-menu-overlay .online-menu-card {
              flex: 0 1 auto;
              min-height: 0;
              max-height: min(88vh, calc(100vh - 7.25rem));
              max-height: min(88vh, calc(100dvh - 7.25rem));
              overflow-y: auto;
              overflow-x: hidden;
              -webkit-overflow-scrolling: touch;
              background: rgba(15, 23, 42, 0.86);
              border: 1px solid rgba(255,255,255,0.14);
              backdrop-filter: blur(6px);
              box-shadow: 0 18px 60px rgba(0,0,0,0.35);
            }
            #online-menu-overlay .online-menu-card::-webkit-scrollbar { width: 8px; }
            #online-menu-overlay .online-menu-card::-webkit-scrollbar-thumb { background: rgba(246, 125, 49, 0.45); border-radius: 999px; }
            #online-menu-overlay .online-menu-card::-webkit-scrollbar-track { background: rgba(255,255,255,0.06); border-radius: 999px; }
          </style>
          
          <div id="online-error-box" class="alert alert-danger d-none mb-3" role="alert" style="font-family: 'Montserrat', sans-serif;"></div>

          <div id="online-home-view" class="w-100">
            <div class="row g-4 align-items-stretch">
                <div class="col-12 col-md-6 d-flex flex-column online-split-line">
                    <div class="text-center mb-4 flex-grow-1 d-flex flex-column justify-content-start">
                        <h3 class="text-white fw-bold mb-2" style="font-family: 'Montserrat', sans-serif;">🎮 MODO CASUAL</h3>
                        <p class="text-white-50 small mb-0" style="font-family: 'Montserrat', sans-serif; line-height: 1.4;">Juega relajado. Crea salas para amigos o únete a públicas. No afecta a tu rango ELO.</p>
                    </div>
                    <div class="d-flex flex-column gap-3 w-100 mt-auto px-xl-2">
                        <button id="btn-online-create" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleCrear}">CREAR SALA</button>
                        <button id="btn-online-join" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleUnirse}">UNIRSE A SALA</button>
                    </div>
                </div>
                
                <div class="col-12 col-md-6 d-flex flex-column">
                    <div class="text-center mb-4 flex-grow-1 d-flex flex-column justify-content-start">
                        <h3 class="text-warning fw-bold mb-2" style="font-family: 'Montserrat', sans-serif;">🏆 COMPETITIVO</h3>
                        <p class="text-white-50 small mb-0" style="font-family: 'Montserrat', sans-serif; line-height: 1.4;">Emparejamiento automático por nivel (Matchmaking). Gana para subir en el Leaderboard.</p>
                    </div>
                    <div class="d-flex flex-column gap-3 w-100 mt-auto px-xl-2">
                        <div class="d-flex align-items-center justify-content-center gap-2 flex-wrap">
                          <button type="button" id="online-ranked-skin-prev" class="btn btn-link text-white fs-2 text-decoration-none px-2 py-0 online-skin-arrow" style="line-height: 1;" aria-label="Skin competitiva anterior">&lsaquo;</button>
                          <div id="online-ranked-skin-preview" class="rounded-3 d-flex align-items-center justify-content-center shadow-sm" style="width: 116px; height: 116px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.2); padding: 8px;"></div>
                          <button type="button" id="online-ranked-skin-next" class="btn btn-link text-white fs-2 text-decoration-none px-2 py-0 online-skin-arrow" style="line-height: 1;" aria-label="Skin competitiva siguiente">&rsaquo;</button>
                        </div>
                        <input type="hidden" id="online-ranked-skin" value="${this.escapeHtml(this.prefs.rankedSkinId)}">
                        <button id="btn-online-ranked" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleRanked}">BUSCAR PARTIDA</button>
                        <button id="btn-join-login" class="btn fw-bold shadow menu-btn" style="${btnStyleLogin}">${ACCOUNT_GUEST_LABEL}</button>
                    </div>
                </div>
            </div>
            
            <div class="d-flex justify-content-center mt-5">
                <button id="btn-online-back" class="btn text-white fw-bold shadow menu-btn" style="${btnStyleVolverMainMenu}">VOLVER AL MENÚ PRINCIPAL</button>
            </div>
          </div>

          <div id="online-create-view" class="d-none text-start">
            <h2 class="text-white text-center fw-bold mb-4" style="font-family: 'Montserrat', sans-serif;">CREAR PARTIDA</h2>
            <div class="row g-4 align-items-start">
              <div class="col-12">
                <label class="form-label text-white fw-semibold mb-1 small" style="font-family: 'Montserrat', sans-serif;">Tu nombre</label>
                <input id="online-create-name" class="form-control bg-dark text-white border-secondary" value="${this.escapeHtml(this.prefs.playerName)}" maxlength="24">
              </div>
              <div class="col-12 col-md-6 col-lg-4">
                ${this.renderSelectBlock('Modo', 'online-create-mode', onlineOptionCatalogs.modes, this.prefs.gameMode)}
              </div>
              <div class="col-12 col-md-6 col-lg-4">
                ${this.renderSelectBlock('Dificultad', 'online-create-difficulty', onlineOptionCatalogs.difficulties, this.prefs.difficulty)}
              </div>
              <input type="hidden" id="online-create-board" value="${this.escapeHtml(this.prefs.boardSizeId)}">
              <div class="col-12 col-md-6 col-lg-4">
                ${this.renderSelectBlock('Cantidad de objetos', 'online-create-food', onlineOptionCatalogs.foodCounts, this.prefs.foodCountId)}
              </div>
              <div class="col-12">
                <div class="w-100 border-bottom border-secondary opacity-50 my-1"></div>
              </div>
              <div class="col-12">
                <div class="online-create-appearance-block p-3 p-md-4">
                  <div class="row g-3 g-md-4 align-items-start">
                    <div class="col-12 col-md-6">
                      <label class="form-label text-white fw-semibold mb-2 small text-center text-md-start d-block" style="font-family: 'Montserrat', sans-serif;">Skin</label>
                      <div class="d-flex align-items-center justify-content-center gap-2 gap-md-3 flex-wrap">
                        <button type="button" id="online-create-skin-prev" class="btn btn-link text-white fs-1 text-decoration-none px-2 py-0 online-skin-arrow" style="line-height: 1;" aria-label="Skin anterior">&lsaquo;</button>
                        <div id="online-create-skin-preview" class="rounded-4 d-flex align-items-center justify-content-center shadow-sm" style="width: 160px; height: 160px; background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.2); padding: 10px;"></div>
                        <button type="button" id="online-create-skin-next" class="btn btn-link text-white fs-1 text-decoration-none px-2 py-0 online-skin-arrow" style="line-height: 1;" aria-label="Skin siguiente">&rsaquo;</button>
                      </div>
                      <input type="hidden" id="online-create-skin" value="${this.escapeHtml(this.prefs.hostSkinId)}">
                    </div>
                    <div class="col-12 col-md-6 online-create-split-map">
                      <h3 class="h6 text-white text-center text-md-start fw-bold mb-3 mb-md-2" style="font-family: 'Montserrat', sans-serif; letter-spacing: 1px;">MAPA / ARENA</h3>
                      <div id="online-create-map-options" class="d-flex gap-2 justify-content-center justify-content-md-start flex-wrap"></div>
                      <input type="hidden" id="online-create-map" value="${this.escapeHtml(this.prefs.mapId)}">
                    </div>
                  </div>
                </div>
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
                <label class="form-label text-white fw-semibold mb-2 small" style="font-family: 'Montserrat', sans-serif;">Skin</label>
                <div class="d-flex align-items-center justify-content-center gap-3 flex-wrap">
                  <button type="button" id="online-join-skin-prev" class="btn btn-link text-white fs-1 text-decoration-none px-2 py-0 online-skin-arrow" style="line-height: 1;" aria-label="Skin anterior">&lsaquo;</button>
                  <div id="online-join-skin-preview" class="rounded-4 d-flex align-items-center justify-content-center shadow-sm" style="width: 160px; height: 160px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.2); padding: 10px;"></div>
                  <button type="button" id="online-join-skin-next" class="btn btn-link text-white fs-1 text-decoration-none px-2 py-0 online-skin-arrow" style="line-height: 1;" aria-label="Skin siguiente">&rsaquo;</button>
                </div>
                <input type="hidden" id="online-join-skin" value="${this.escapeHtml(this.prefs.guestSkinId)}">
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
              <div class="col-12 col-md-4"><div class="p-3 rounded-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1);"><strong>Dificultad:</strong> <span id="waiting-difficulty">-</span></div></div>
              <div class="col-12 col-md-4"><div class="p-3 rounded-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1);"><strong>Mapa:</strong> <span id="waiting-map">-</span></div></div>
              <div class="col-12 col-md-4"><div class="p-3 rounded-3" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1);"><strong>Visibilidad:</strong> <span id="waiting-visibility">-</span></div></div>
              <div class="col-12 d-none" id="waiting-code-wrap"><div class="p-3 rounded-3 text-center" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255, 255, 255, 0.1);"><strong>Código:</strong> <span id="waiting-code" class="text-success fw-bold fs-5">-</span></div></div>
            </div>
            <p id="waiting-status" class="text-center mb-4 fw-bold" style="font-family: 'Montserrat', sans-serif;">Esperando jugador...</p>
            <div id="waiting-settings-panel" class="mb-4">
              <div class="row g-3">
                <div class="col-12 col-md-4">
                  ${this.renderSelectBlock('Modo', 'waiting-mode-select', onlineOptionCatalogs.modes, this.prefs.gameMode)}
                </div>
                <div class="col-12 col-md-4">
                  ${this.renderSelectBlock('Dificultad', 'waiting-difficulty-select', onlineOptionCatalogs.difficulties, this.prefs.difficulty)}
                </div>
                <div class="col-12 col-md-4">
                  ${this.renderSelectBlock('Mapa', 'waiting-map-select', onlineOptionCatalogs.maps, this.prefs.mapId)}
                </div>
              </div>
            </div>
            <p id="waiting-settings-locked" class="text-center text-white-50 small mb-4 d-none" style="font-family: 'Montserrat', sans-serif;">Esperando a que el host configure la siguiente partida.</p>
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
    this.waitingSettingsPanel = overlay.querySelector('#waiting-settings-panel');
    this.waitingSettingsLocked = overlay.querySelector('#waiting-settings-locked');
    this.waitingModeSelect = overlay.querySelector('#waiting-mode-select');
    this.waitingDifficultySelect = overlay.querySelector('#waiting-difficulty-select');
    this.waitingMapSelect = overlay.querySelector('#waiting-map-select');

    // BOTONES ORIGINALES
    overlay.querySelector('#btn-online-create').addEventListener('click', () => this.showView('create'));
    overlay.querySelector('#btn-online-join').addEventListener('click', () => this.openJoinView());
    overlay.querySelector('#btn-online-back').addEventListener('click', () => {
      if (this.queueRoom) {
        this.queueRoom.leave();
        this.queueRoom = null;
      }
      this.scene.start('MainMenu');
    });    overlay.querySelector('#btn-create-back').addEventListener('click', () => this.showView('home'));
    overlay.querySelector('#btn-join-back').addEventListener('click', () => this.showView('home'));
    const accountButton = overlay.querySelector('#btn-join-login');
    bindAccountButton({
      scene: this,
      buttonEl: accountButton,
      returnScene: 'OnlineMenu',
      onBeforeNavigate: () => closeAccountDropdown(),
      onAfterLogout: () => {
        void this.applyOnlineNameFieldsForAuthUser();
      },
    });
    overlay.querySelector('#btn-waiting-back').addEventListener('click', () => this.leaveLobbyRoom());
    overlay.querySelector('#btn-create-submit').addEventListener('click', () => this.handleCreateSubmit());
    overlay.querySelector('#btn-refresh-public').addEventListener('click', () => this.loadPublicLobbies());
    overlay.querySelector('#btn-private-join').addEventListener('click', () => this.handlePrivateJoin());
    overlay.querySelector('#btn-waiting-start').addEventListener('click', () => this.startMatch());
    [this.waitingModeSelect, this.waitingDifficultySelect, this.waitingMapSelect].forEach((select) => {
      select?.addEventListener('change', () => this.updateLobbySettingsFromWaiting());
    });

// BOTÓN RANKED REESCRITO (CON CLIENTE COLYSEUS PURO)
    this.isSearchingRanked = false;

    overlay.querySelector('#btn-online-ranked').addEventListener('click', async () => {
      const btnRanked = overlay.querySelector('#btn-online-ranked');

      // 1. SI YA ESTÁ BUSCANDO, CANCELAMOS LA BÚSQUEDA
      if (this.isSearchingRanked) {
        if (this.queueRoom) {
          this.queueRoom.leave();
          this.queueRoom = null;
        }
        this.isSearchingRanked = false;
        btnRanked.textContent = "BUSCAR PARTIDA";
        btnRanked.style.background = "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)";
        this.hideError();
        return;
      }

      // 2. SI NO ESTÁ BUSCANDO, INICIAMOS LA CONEXIÓN
      btnRanked.disabled = true;
      btnRanked.textContent = "COMPROBANDO...";

      try {
        this.prefs = saveOnlinePrefs({
          ...this.prefs,
          rankedSkinId: overlay.querySelector('#online-ranked-skin')?.value || this.prefs.rankedSkinId,
        });

        const user = await getCurrentUser();

        if (!user) {
          this.showError('¡Alto ahí! Debes iniciar sesión o crear una cuenta para jugar en el modo Competitivo.');
          btnRanked.textContent = "REDIRIGIENDO...";
          setTimeout(() => { this.scene.start('Login', { returnScene: 'OnlineMenu' }); }, 2500);
          return;
        }

        btnRanked.textContent = "CONECTANDO AL SERVIDOR...";

        const token = await user.getIdToken(true);
        const rankedPlayerName = extractLeaderboardUserName(user) || 'Jugador';

        const colyseusClient = new Client(getColyseusServerUrl());

        this.queueRoom = await colyseusClient.joinOrCreate("ranked_queue", {
          token: token,
          playerName: rankedPlayerName,
          skinId: this.prefs.rankedSkinId,
        });

        // ¡CONECTADO! Cambiamos el botón a modo "Cancelar"
        this.isSearchingRanked = true;
        btnRanked.disabled = false;
        btnRanked.textContent = "CANCELAR BÚSQUEDA";
        btnRanked.style.background = "#DE1A58"; // Color rojo
        this.showError('¡Conectado a la cola! Buscando rival...');

        this.queueRoom.onMessage("matchFound", (data) => {
          this.showError('¡Partida encontrada! Conectando...');
          this.isSearchingRanked = false;
          this.queueRoom.leave();

          this.scene.start('OnlineGame', {
            matchRoomId: data.roomId,
            playerName: rankedPlayerName,
            skinId: data.skinId || this.prefs.rankedSkinId,
            gameMode: 'normal',
          });
        });

      } catch (error) {
        console.error(error);
        this.showError('Error al conectar con el servidor de Matchmaking.');
        btnRanked.textContent = "BUSCAR PARTIDA";
        btnRanked.disabled = false;
        this.isSearchingRanked = false;
      }
    });

    const buttons = overlay.querySelectorAll('.menu-btn');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.05)');
      btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    });

    this.wireOnlineCreateVisualPickers(overlay);
    this.wireOnlineRankedSkinPicker(overlay);
    this.wireOnlineJoinSkinPicker(overlay);
  }

  wireOnlineCreateVisualPickers(overlay) {
    const snakes = onlineOptionCatalogs.skins.map((o) => getSnakeAsset(o.id)).filter(Boolean);
    const maps = onlineOptionCatalogs.maps.map((o) => getMapAsset(o.id)).filter(Boolean);
    if (!snakes.length || !maps.length) return;

    let skinIndex = Math.max(0, snakes.findIndex((s) => s && s.id === this.prefs.hostSkinId));
    let mapIndex = Math.max(0, maps.findIndex((m) => m && m.id === this.prefs.mapId));

    const skinHidden = overlay.querySelector('#online-create-skin');
    const mapHidden = overlay.querySelector('#online-create-map');
    const preview = overlay.querySelector('#online-create-skin-preview');
    const mapRoot = overlay.querySelector('#online-create-map-options');
    const prevBtn = overlay.querySelector('#online-create-skin-prev');
    const nextBtn = overlay.querySelector('#online-create-skin-next');

    if (!skinHidden || !mapHidden || !preview || !mapRoot || !prevBtn || !nextBtn) return;

    const renderSkin = () => {
      const skin = snakes[skinIndex] || snakes[0];
      skinHidden.value = skin?.id || '';
      preview.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2">
          <img src="/${skin?.preview?.path || ''}" alt="" style="width: 96px; height: 96px; object-fit: contain; image-rendering: pixelated;">
          <span class="text-white-50 small">${this.escapeHtml(skin?.label || '')}</span>
        </div>
      `;
    };

    const renderMaps = () => {
      const activeMap = maps[mapIndex] || maps[0];
      mapHidden.value = activeMap?.id || '';
      mapRoot.innerHTML = maps
          .map(
              (map, index) => `
        <button type="button" class="online-map-option rounded-3 p-2 text-center ${index === mapIndex ? 'active' : ''}" data-online-map-index="${index}" style="width: 112px;">
          <span class="d-block rounded-2 mb-2" style="height: 42px; background: url('/${map?.floor?.path || ''}') center/32px 32px repeat; image-rendering: pixelated;"></span>
          <span class="small fw-semibold">${this.escapeHtml(map?.label || '')}</span>
        </button>
      `,
          )
          .join('');

      mapRoot.querySelectorAll('[data-online-map-index]').forEach((btn) => {
        btn.addEventListener('click', () => {
          mapIndex = Number(btn.getAttribute('data-online-map-index')) || 0;
          renderMaps();
        });
      });
    };

    prevBtn.addEventListener('click', () => {
      skinIndex = (skinIndex - 1 + snakes.length) % snakes.length;
      renderSkin();
    });
    nextBtn.addEventListener('click', () => {
      skinIndex = (skinIndex + 1) % snakes.length;
      renderSkin();
    });

    renderSkin();
    renderMaps();
  }

  wireOnlineJoinSkinPicker(overlay) {
    const snakes = onlineOptionCatalogs.skins.map((o) => getSnakeAsset(o.id)).filter(Boolean);
    if (!snakes.length) return;

    let skinIndex = Math.max(0, snakes.findIndex((s) => s && s.id === this.prefs.guestSkinId));

    const skinHidden = overlay.querySelector('#online-join-skin');
    const preview = overlay.querySelector('#online-join-skin-preview');
    const prevBtn = overlay.querySelector('#online-join-skin-prev');
    const nextBtn = overlay.querySelector('#online-join-skin-next');

    if (!skinHidden || !preview || !prevBtn || !nextBtn) return;

    const renderSkin = () => {
      const skin = snakes[skinIndex] || snakes[0];
      skinHidden.value = skin?.id || '';
      preview.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-2">
          <img src="/${skin?.preview?.path || ''}" alt="" style="width: 96px; height: 96px; object-fit: contain; image-rendering: pixelated;">
          <span class="text-white-50 small">${this.escapeHtml(skin?.label || '')}</span>
        </div>
      `;
    };

    prevBtn.addEventListener('click', () => {
      skinIndex = (skinIndex - 1 + snakes.length) % snakes.length;
      renderSkin();
    });
    nextBtn.addEventListener('click', () => {
      skinIndex = (skinIndex + 1) % snakes.length;
      renderSkin();
    });

    renderSkin();
  }

  wireOnlineRankedSkinPicker(overlay) {
    const snakes = onlineOptionCatalogs.skins.map((o) => getSnakeAsset(o.id));
    if (!snakes.length) return;

    let skinIndex = Math.max(0, snakes.findIndex((s) => s.id === this.prefs.rankedSkinId));

    const skinHidden = overlay.querySelector('#online-ranked-skin');
    const preview = overlay.querySelector('#online-ranked-skin-preview');
    const prevBtn = overlay.querySelector('#online-ranked-skin-prev');
    const nextBtn = overlay.querySelector('#online-ranked-skin-next');

    if (!skinHidden || !preview || !prevBtn || !nextBtn) return;

    const renderSkin = () => {
      const skin = snakes[skinIndex];
      skinHidden.value = skin.id;
      preview.innerHTML = `
        <div class="d-flex flex-column align-items-center gap-1">
          <img src="/${skin.preview.path}" alt="" style="width: 72px; height: 72px; object-fit: contain; image-rendering: pixelated;">
          <span class="text-white-50 small">${this.escapeHtml(skin.label)}</span>
        </div>
      `;
    };

    prevBtn.addEventListener('click', () => {
      skinIndex = (skinIndex - 1 + snakes.length) % snakes.length;
      renderSkin();
    });
    nextBtn.addEventListener('click', () => {
      skinIndex = (skinIndex + 1) % snakes.length;
      renderSkin();
    });

    renderSkin();
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
      const createNameInput = this.overlayRoot.querySelector('#online-create-name');
      const playerName = await this.resolveOnlinePlayerName(createNameInput);
      this.prefs = saveOnlinePrefs({
        playerName,
        gameMode: this.overlayRoot.querySelector('#online-create-mode').value,
        difficulty: this.overlayRoot.querySelector('#online-create-difficulty').value,
        hostSkinId: this.overlayRoot.querySelector('#online-create-skin').value,
        mapId: this.overlayRoot.querySelector('#online-create-map').value,
        boardSizeId: this.overlayRoot.querySelector('#online-create-board').value,
        foodCountId: this.overlayRoot.querySelector('#online-create-food').value,
        visibility: this.overlayRoot.querySelector('#online-create-visibility').value,
        maxPlayers: 2,
        visibility: this.overlayRoot.querySelector('#online-create-visibility').value,
      });

      const room = await this.lobbyClient.createLobby({
        playerName: this.prefs.playerName,
        skinId: this.prefs.hostSkinId,
        gameMode: this.prefs.gameMode,
        difficulty: this.prefs.difficulty,
        mapId: this.prefs.mapId,
        visibility: this.prefs.visibility,
        boardSizeId: this.prefs.boardSizeId,
        foodCountId: this.prefs.foodCountId,
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
      const joinNameInput = this.overlayRoot.querySelector('#online-join-name');
      const playerName = await this.resolveOnlinePlayerName(joinNameInput);
      this.prefs = saveOnlinePrefs({
        playerName,
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
      const joinNameInput = this.overlayRoot.querySelector('#online-join-name');
      const playerName = await this.resolveOnlinePlayerName(joinNameInput);
      this.prefs = saveOnlinePrefs({
        playerName,
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
    setActiveLobbyRoom(room);

    this.lobbyListenerRoom = room;
    this.lobbyStateChangeHandler = (state) => this.handleLobbyState(room, state);
    this.lobbyLeaveHandler = () => {
      if (this.lobbyRoom !== room) return;
      setActiveLobbyRoom(null);
      this.clearLobbyRoomListenerRefs();
      if (this.scene.isActive('OnlineMenu')) {
        this.lobbyRoom = null;
        this.showError('La sala se ha cerrado.');
        this.showView('home');
      }
    };

    room.onStateChange(this.lobbyStateChangeHandler);
    room.onLeave(this.lobbyLeaveHandler);

    this.showView('waiting');
    this.handleLobbyState(room, room.state);
  }

  detachLobbyRoomListeners() {
    if (this.lobbyListenerRoom && this.lobbyStateChangeHandler) {
      this.lobbyListenerRoom.onStateChange.remove(this.lobbyStateChangeHandler);
    }
    if (this.lobbyListenerRoom && this.lobbyLeaveHandler) {
      this.lobbyListenerRoom.onLeave.remove(this.lobbyLeaveHandler);
    }
    this.clearLobbyRoomListenerRefs();
  }

  clearLobbyRoomListenerRefs() {
    this.lobbyListenerRoom = null;
    this.lobbyStateChangeHandler = null;
    this.lobbyLeaveHandler = null;
  }

  resumeActiveLobbyIfRequested() {
    if (!this.resumeLobby) return;

    const room = getResumableActiveLobbyRoom(this.resumeLobbyRoomId);
    if (!room) {
      this.showError('No se pudo recuperar la sala anterior.');
      this.showView('home');
      return;
    }

    this.attachLobbyRoom(room);
  }

  handleLobbyState(room, state) {
    if (this.lobbyRoom !== room) return;

    this.updateWaitingState(state);
    const matchRoomId = String(state?.matchRoomId ?? '');
    if (!matchRoomId) {
      this.completedMatchRoomId = '';
      return;
    }

    if (matchRoomId === this.completedMatchRoomId) return;

    const isHost = room.sessionId === state.host.sessionId;
    const skinId = isHost ? state.host.skinId : state.guest.skinId;
    const playerName = isHost ? state.host.playerName : state.guest.playerName;
    const gameMode = state.gameMode ?? 'normal';

    // Route to OnlineCtfGame for 2v2 CTF mode, otherwise use the standard OnlineGame.
    if (gameMode === 'captureTheFlag') {
      this.scene.start('OnlineCtfGame', {
        matchRoomId,
        lobbyRoomId: state.lobbyId,
        skinId,
        playerName,
        mapId: state.mapId,
      });
    } else {
      this.scene.start('OnlineGame', {
        matchRoomId,
        lobbyRoomId: state.lobbyId,
        skinId,
        playerName,
        gameMode,
        difficulty: state.difficulty,
        mapId: state.mapId,
      });
    }
  }

  updateWaitingState(state) {
    if (!this.waitingView) return;
    const host = state?.host ?? {};
    const guest = state?.guest ?? {};
    const status = state?.status ?? 'waiting';
    const visibility = state?.visibility ?? 'public';
    const inviteCode = state?.inviteCode ?? '';
    const gameMode = state?.gameMode ?? '-';
    const difficulty = state?.difficulty ?? 'normal';
    const mapId = state?.mapId ?? '-';
    const isHost = this.lobbyRoom && this.lobbyRoom.sessionId === host.sessionId;
    const hasActiveMatch = Boolean(state?.matchRoomId);

    this.overlayRoot.querySelector('#waiting-host-name').textContent = host.playerName || 'Pendiente';
    this.overlayRoot.querySelector('#waiting-guest-name').textContent = guest.playerName || 'Esperando...';
    this.overlayRoot.querySelector('#waiting-mode').textContent = gameMode;
    this.overlayRoot.querySelector('#waiting-difficulty').textContent = difficulty;
    this.overlayRoot.querySelector('#waiting-map').textContent = mapId;
    this.overlayRoot.querySelector('#waiting-visibility').textContent = visibility === 'private' ? 'Privada' : 'Publica';
    this.overlayRoot.querySelector('#waiting-status').textContent = hasActiveMatch
        ? 'Partida en curso. Al terminar volveréis a esta sala.'
        : status === 'ready'
        ? 'Sala lista. El host puede iniciar.'
        : 'Esperando jugador...';
    this.syncSelectValue(this.waitingModeSelect, gameMode);
    this.syncSelectValue(this.waitingDifficultySelect, difficulty);
    this.syncSelectValue(this.waitingMapSelect, mapId);

    this.waitingSettingsPanel?.classList.toggle('d-none', !isHost);
    this.waitingSettingsLocked?.classList.toggle('d-none', isHost);
    [this.waitingModeSelect, this.waitingDifficultySelect, this.waitingMapSelect].forEach((select) => {
      if (select) select.disabled = !isHost || hasActiveMatch;
    });

    const codeWrap = this.overlayRoot.querySelector('#waiting-code-wrap');
    const codeValue = this.overlayRoot.querySelector('#waiting-code');
    const isPrivate = visibility === 'private' && inviteCode;
    codeWrap.classList.toggle('d-none', !isPrivate);
    codeValue.textContent = isPrivate ? inviteCode : '';

    this.waitingStartButton.disabled = !(isHost && status === 'ready' && !hasActiveMatch);
  }

  async startMatch() {
    if (!this.lobbyRoom) return;
    this.hideError();
    const payload = this.getWaitingSettingsPayload();
    this.prefs = saveOnlinePrefs({ ...this.prefs, ...payload });
    this.lobbyRoom.send('startMatch', payload);
  }

  updateLobbySettingsFromWaiting() {
    if (!this.lobbyRoom) return;
    const hostSessionId = this.lobbyRoom.state?.host?.sessionId;
    if (this.lobbyRoom.sessionId !== hostSessionId || this.lobbyRoom.state?.matchRoomId) return;

    const payload = this.getWaitingSettingsPayload();
    this.prefs = saveOnlinePrefs({ ...this.prefs, ...payload });
    this.lobbyRoom.send('updateSettings', payload);
  }

  getWaitingSettingsPayload() {
    return {
      gameMode: this.waitingModeSelect?.value || this.lobbyRoom?.state?.gameMode || this.prefs.gameMode,
      difficulty: this.waitingDifficultySelect?.value || this.lobbyRoom?.state?.difficulty || this.prefs.difficulty,
      mapId: this.waitingMapSelect?.value || this.lobbyRoom?.state?.mapId || this.prefs.mapId,
    };
  }

  syncSelectValue(select, value) {
    if (!select || value === undefined || value === null) return;
    const nextValue = String(value);
    if (select.value !== nextValue) {
      select.value = nextValue;
    }
  }

  async leaveLobbyRoom() {
    await this.cleanupLobbyRoom(true);
    this.showView('home');
  }

  async cleanupLobbyRoom(leaveRoom) {
    if (!this.lobbyRoom) return;
    const room = this.lobbyRoom;
    this.detachLobbyRoomListeners();
    this.lobbyRoom = null;
    if (leaveRoom) {
      setActiveLobbyRoom(null);
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

  async getAuthPlayerName() {
    const user = await getCurrentUser();
    if (!user) return null;
    return extractLeaderboardUserName(user);
  }

  lockOnlineNameInput(input, userName) {
    if (!input) return;
    input.value = userName;
    input.readOnly = true;
    input.disabled = true;
    input.title = 'Nombre vinculado a tu cuenta';
    input.setAttribute('aria-readonly', 'true');
    input.style.opacity = '0.85';
    input.style.cursor = 'not-allowed';
    input.style.backgroundColor = 'rgba(15, 23, 42, 0.65)';
  }

  unlockOnlineNameInput(input) {
    if (!input) return;
    input.readOnly = false;
    input.disabled = false;
    input.removeAttribute('aria-readonly');
    input.title = '';
    input.style.opacity = '';
    input.style.cursor = '';
    input.style.backgroundColor = '';
  }

  async applyOnlineNameFieldsForAuthUser() {
    if (!this.overlayRoot) return;

    const createInput = this.overlayRoot.querySelector('#online-create-name');
    const joinInput = this.overlayRoot.querySelector('#online-join-name');
    const authName = await this.getAuthPlayerName();

    if (!authName) {
      this.unlockOnlineNameInput(createInput);
      this.unlockOnlineNameInput(joinInput);
      return;
    }

    this.lockOnlineNameInput(createInput, authName);
    this.lockOnlineNameInput(joinInput, authName);
    this.prefs = saveOnlinePrefs({ ...this.prefs, playerName: authName });
  }

  async resolveOnlinePlayerName(fallbackInput) {
    const authName = await this.getAuthPlayerName();
    if (authName) return authName;
    return String(fallbackInput?.value ?? '').trim() || 'Jugador';
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
