import Phaser from 'phaser';
import { PLAYER_COLORS } from '@shared/GameConfig';
import { mapAssets, snakeAssets } from '../config/gameAssetRegistry.js';
import { loadSoloGameSettings, saveSoloGameSettings } from '../utils/soloGameSettings.js';
import { disableGameKeyboardForOverlayScene } from '../utils/formKeyboardGuard.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export class SoloGameSetup extends Phaser.Scene {
    constructor() {
        super('SoloGameSetup');
    }

    create() {
        disableGameKeyboardForOverlayScene(this);

        const fondo = this.add.image(this.scale.width / 2, this.scale.height / 2, 'fondo_duelo');
        const ajustarFondo = (width, height) => {
            fondo.setPosition(width / 2, height / 2);
            fondo.setScale(Math.max(width / fondo.width, height / fondo.height));
        };
        ajustarFondo(this.scale.width, this.scale.height);
        this.scale.on('resize', (gameSize) => ajustarFondo(gameSize.width, gameSize.height));

        const saved = loadSoloGameSettings();
        let skinIndex = Math.max(0, snakeAssets.findIndex((skin) => skin.id === saved.skinId));
        let mapIndex = Math.max(0, mapAssets.findIndex((map) => map.id === saved.mapId));

        const overlay = document.createElement('div');
        overlay.id = 'solo-game-setup-overlay';
        overlay.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
        overlay.style.cssText = 'z-index:1000;padding:0.75rem 0.75rem 5.75rem;box-sizing:border-box;';

        overlay.innerHTML = `
            <style>
                .solo-setup-card { max-height:min(88vh,calc(100vh - 7.25rem)); overflow-y:auto; background:rgba(15,23,42,0.9); border:1px solid rgba(255,255,255,0.14); border-radius:16px; backdrop-filter:blur(6px); }
                .solo-setup-card::-webkit-scrollbar { width:8px; }
                .solo-setup-card::-webkit-scrollbar-thumb { background:rgba(246,125,49,0.45); border-radius:999px; }
                .solo-skin-arrow { transition:transform 0.2s; cursor:pointer; }
                .solo-skin-arrow:hover { transform:scale(1.15); }
                .solo-map-option { border:2px solid rgba(255,255,255,0.16); background:rgba(255,255,255,0.06); color:white; transition:all 0.2s; }
                .solo-map-option:hover { transform:translateY(-2px); border-color:rgba(255,255,255,0.4); }
                .solo-map-option.active { border-color:#F67D31; box-shadow:0 0 0 2px rgba(246,125,49,0.2); }
                .solo-name-input { max-width:240px; background:transparent; border:none; border-bottom:2px solid rgba(255,255,255,0.25); border-radius:0; color:white; text-align:center; font-size:1.35rem; font-weight:700; }
                .solo-name-input:focus { outline:none; border-bottom-color:#F67D31; box-shadow:none; }
            </style>
            <div class="w-100 px-3 d-flex flex-column align-items-center" style="max-width:720px;">
                <button id="solo-setup-back" type="button" class="btn btn-sm btn-outline-light fw-semibold align-self-start mb-3" style="border-radius:999px;padding:8px 14px;">← Volver</button>
                <div class="solo-setup-card rounded-4 shadow-lg p-4 w-100 d-flex flex-column align-items-center">
                    <div class="rounded-pill px-4 py-2 mb-3 text-center" style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);">
                        <h1 class="h3 text-white fw-bold mb-0" style="font-family:'Teko',sans-serif;letter-spacing:1px;">JUEGO SOLITARIO</h1>
                    </div>
                    <p class="text-white-50 text-center small mb-4">1 vida · kiwi 20s · dificultad progresiva · elige tu skin y arena</p>

                    <label for="solo-player-name" class="text-white fw-semibold small mb-2">Tu nombre</label>
                    <input id="solo-player-name" class="form-control solo-name-input mb-4" maxlength="16" value="${escapeHtml(saved.playerName)}" autocomplete="nickname" />

                    <h2 class="h6 text-white fw-bold mb-3" style="font-family:'Montserrat',sans-serif;letter-spacing:1px;">SKIN</h2>
                    <div class="d-flex align-items-center gap-3 mb-4">
                        <button id="solo-skin-prev" type="button" class="btn btn-link text-white fs-1 text-decoration-none px-2 py-0 solo-skin-arrow">&lsaquo;</button>
                        <div id="solo-skin-container" class="rounded-4 d-flex align-items-center justify-content-center" style="width:160px;height:160px;background:rgba(255,255,255,0.05);border:2px solid rgba(255,255,255,0.2);padding:10px;"></div>
                        <button id="solo-skin-next" type="button" class="btn btn-link text-white fs-1 text-decoration-none px-2 py-0 solo-skin-arrow">&rsaquo;</button>
                    </div>

                    <h2 class="h6 text-white fw-bold mb-3" style="font-family:'Montserrat',sans-serif;letter-spacing:1px;">ARENA</h2>
                    <div id="solo-map-options" class="d-flex gap-2 justify-content-center flex-wrap mb-4"></div>

                    <button id="solo-start-btn" type="button" class="btn btn-lg fw-bold text-white rounded-pill" style="padding:14px 22px;min-width:280px;background:linear-gradient(90deg,#0F766E,#1A05A2);border:2px solid #F67D31;font-family:'Montserrat',sans-serif;">
                        JUGAR
                    </button>
                </div>
            </div>
        `;

        const container = document.getElementById('game-container');
        container.appendChild(overlay);
        this.overlayEl = overlay;

        const renderSkin = () => {
            const skin = snakeAssets[skinIndex];
            const el = overlay.querySelector('#solo-skin-container');
            if (!el || !skin) return;
            el.innerHTML = `
                <div class="d-flex flex-column align-items-center gap-2">
                    <img src="/${skin.preview.path}" alt="${escapeHtml(skin.label)}" style="width:96px;height:96px;object-fit:contain;image-rendering:pixelated;">
                    <span class="text-white-50 small">${escapeHtml(skin.label)}</span>
                </div>
            `;
        };

        const renderMaps = () => {
            const root = overlay.querySelector('#solo-map-options');
            if (!root) return;
            root.innerHTML = mapAssets.map((map, index) => `
                <button type="button" class="solo-map-option rounded-3 p-2 text-center ${index === mapIndex ? 'active' : ''}" data-map-index="${index}" style="width:112px;">
                    <span class="d-block rounded-2 mb-2" style="height:42px;background:url('/${map.floor.path}') center/32px 32px repeat;image-rendering:pixelated;"></span>
                    <span class="small fw-semibold">${escapeHtml(map.label)}</span>
                </button>
            `).join('');

            root.querySelectorAll('[data-map-index]').forEach((button) => {
                button.addEventListener('click', () => {
                    mapIndex = Number(button.getAttribute('data-map-index')) || 0;
                    renderMaps();
                });
            });
        };

        const cleanup = () => {
            if (this.overlayEl && container.contains(this.overlayEl)) {
                container.removeChild(this.overlayEl);
            }
            this.overlayEl = null;
        };

        renderSkin();
        renderMaps();

        overlay.querySelector('#solo-skin-prev')?.addEventListener('click', () => {
            skinIndex = (skinIndex - 1 + snakeAssets.length) % snakeAssets.length;
            renderSkin();
        });
        overlay.querySelector('#solo-skin-next')?.addEventListener('click', () => {
            skinIndex = (skinIndex + 1) % snakeAssets.length;
            renderSkin();
        });
        overlay.querySelector('#solo-setup-back')?.addEventListener('click', () => {
            cleanup();
            this.scene.start('MainMenu');
        });
        overlay.querySelector('#solo-start-btn')?.addEventListener('click', () => {
            const playerName = String(overlay.querySelector('#solo-player-name')?.value ?? '').trim() || 'Jugador';
            const skin = snakeAssets[skinIndex];
            const map = mapAssets[mapIndex];
            const colorIndex = skinIndex % (PLAYER_COLORS.length || 1);
            const settings = saveSoloGameSettings({
                playerName,
                skinId: skin.id,
                mapId: map.id,
                color: PLAYER_COLORS[colorIndex] ?? 0xe74c3c,
            });
            cleanup();
            this.scene.start('SoloGame', settings);
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    }
}
