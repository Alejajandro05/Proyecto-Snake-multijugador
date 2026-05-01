import Phaser from 'phaser';
import { PLAYER_COLORS } from '@shared/GameConfig';
import { loadLocalGameSettings, saveLocalGameSettings } from '../utils/localGameSettings.js';
import { DEFAULT_MAP_ID, DEFAULT_SNAKE_SKIN_ID, getMapAsset, getSnakeAsset, mapAssets, snakeAssets } from '../config/gameAssetRegistry.js';

function safeName(value, fallback) {
    const s = String(value ?? '').trim();
    if (!s) return fallback;
    return s.slice(0, 16);
}

const DEFAULT_CONFIG = {
    difficulty: 'normal', // easy | normal | hard
    mapId: DEFAULT_MAP_ID,
    p1: { name: 'Jugador 1', color: PLAYER_COLORS?.[0] ?? 0xe74c3c, skinId: DEFAULT_SNAKE_SKIN_ID },
    p2: { name: 'Jugador 2', color: PLAYER_COLORS?.[1] ?? 0x3498db, skinId: 'player2' },
};

export class LocalGameSetup extends Phaser.Scene {
    constructor() {
        super('LocalGameSetup');
        this.overlayEl = null;
    }

    create() {
        // Fondo igual al MainMenu (asset: frontend/assets/fondo_duelo.png → key: 'fondo_duelo')
        const fondo = this.add.image(this.scale.width / 2, this.scale.height / 2, 'fondo_duelo');
        const ajustarFondo = (width, height) => {
            fondo.setPosition(width / 2, height / 2);
            const escalaX = width / fondo.width;
            const escalaY = height / fondo.height;
            fondo.setScale(Math.max(escalaX, escalaY));
        };
        ajustarFondo(this.scale.width, this.scale.height);
        this.scale.on('resize', (gameSize) => ajustarFondo(gameSize.width, gameSize.height));

        const saved = loadLocalGameSettings();
        const initialDifficulty = String(saved?.difficulty ?? DEFAULT_CONFIG.difficulty);
        const initialP1Name = safeName(saved?.players?.p1?.name, DEFAULT_CONFIG.p1.name);
        const initialP2Name = safeName(saved?.players?.p2?.name, DEFAULT_CONFIG.p2.name);

        const menuDiv = document.createElement('div');
        menuDiv.id = 'local-game-setup-overlay';
        menuDiv.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
        menuDiv.style.zIndex = '1000';

        let p1SkinIndex = 0;
        let p2SkinIndex = 1;
        let mapIndex = 0;

        const prevP1Skin = getSnakeAsset(saved?.players?.p1?.skinId).id;
        const prevP2Skin = getSnakeAsset(saved?.players?.p2?.skinId).id;
        const prevMap = getMapAsset(saved?.mapId).id;
        p1SkinIndex = Math.max(0, snakeAssets.findIndex((skin) => skin.id === prevP1Skin));
        p2SkinIndex = Math.max(0, snakeAssets.findIndex((skin) => skin.id === prevP2Skin));
        mapIndex = Math.max(0, mapAssets.findIndex((map) => map.id === prevMap));

        menuDiv.innerHTML = `
            <style>
                .diff-btn { border: 1px solid rgba(255,255,255,0.3); color: white; background: transparent; transition: all 0.2s; }
                .diff-btn:hover { background: rgba(255,255,255,0.1); }
                .diff-btn.active { background: white !important; color: black !important; border-color: white !important; }
                .skin-arrow { transition: transform 0.2s; cursor: pointer; }
                .skin-arrow:hover { transform: scale(1.2); }
                #btn-create-local-game { transition: transform 0.2s; }
                #btn-create-local-game:hover { transform: scale(1.02); }
                input.custom-input:focus { border-bottom: 2px solid rgba(255,255,255,0.5) !important; outline: none; box-shadow: none; }
                input.custom-input { border-bottom: 2px solid transparent !important; border-radius: 0; }
                .map-option { border: 2px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.06); color: white; transition: all 0.2s; }
                .map-option:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.4); }
                .map-option.active { border-color: #F67D31; box-shadow: 0 0 0 2px rgba(246,125,49,0.2), 0 12px 28px rgba(0,0,0,0.25); }
            </style>
            <div class="w-100 px-3 d-flex flex-column align-items-center" style="max-width: 900px;">
                <button id="btn-setup-back" class="btn btn-sm btn-outline-light fw-semibold align-self-start mb-3" type="button" style="border-radius: 999px; padding: 8px 14px;">
                    ← Volver
                </button>
                <div class="rounded-4 shadow-lg p-4 p-md-5 d-flex flex-column align-items-center w-100" style="background: rgba(15, 23, 42, 0.86); border: 1px solid rgba(255,255,255,0.14); backdrop-filter: blur(6px);">
                    
                    <div class="rounded-pill px-5 py-2 mb-4 text-center" style="background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); min-width: 50%;">
                        <h1 class="h3 text-white fw-bold mb-0" style="font-family: 'Teko', sans-serif; letter-spacing: 1px;">CONFIGURACIÓN LOCAL</h1>
                    </div>

                    <div class="w-75 border-bottom border-secondary opacity-50 mb-4"></div>

                    <div class="d-flex gap-3 mb-4 w-100 justify-content-center flex-wrap">
                        <button id="btn-diff-easy" type="button" class="btn rounded-pill px-4 py-2 fw-bold diff-btn" data-difficulty="easy" style="min-width: 120px;">Easy</button>
                        <button id="btn-diff-normal" type="button" class="btn rounded-pill px-4 py-2 fw-bold diff-btn" data-difficulty="normal" style="min-width: 120px;">Medium</button>
                        <button id="btn-diff-hard" type="button" class="btn rounded-pill px-4 py-2 fw-bold diff-btn" data-difficulty="hard" style="min-width: 120px;">Hard</button>
                        <input id="difficulty" type="hidden" value="${initialDifficulty}" />
                    </div>

                    <div class="w-75 border-bottom border-secondary opacity-50 mb-4"></div>

                    <div class="row w-100 mb-4 justify-content-center gap-2 gap-md-5">
                        <div class="col-12 col-sm-auto text-center d-flex flex-column align-items-center mb-4 mb-sm-0">
                            <input id="p1-name" class="form-control bg-transparent text-white text-center fs-5 fw-bold mb-3 custom-input" placeholder="Jugador 1" maxlength="16" value="${initialP1Name}" style="max-width: 200px;" />
                            <div class="d-flex align-items-center gap-3">
                                <button id="p1-prev" class="btn btn-link text-white fs-1 text-decoration-none px-2 py-0 skin-arrow" style="line-height: 1;">&lsaquo;</button>
                                <div id="p1-skin-container" class="rounded-4 d-flex align-items-center justify-content-center shadow-sm" style="width: 160px; height: 160px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.2); transition: border-color 0.3s; padding: 10px;">
                                </div>
                                <button id="p1-next" class="btn btn-link text-white fs-1 text-decoration-none px-2 py-0 skin-arrow" style="line-height: 1;">&rsaquo;</button>
                            </div>
                            <div class="badge rounded-pill mt-3 px-3 py-2" style="background: rgba(222, 26, 88, 0.22); color: #fff; border: 1px solid rgba(222, 26, 88, 0.4); letter-spacing: 1px;">WASD</div>
                        </div>

                        <div class="col-12 col-sm-auto text-center d-flex flex-column align-items-center">
                            <input id="p2-name" class="form-control bg-transparent text-white text-center fs-5 fw-bold mb-3 custom-input" placeholder="Jugador 2" maxlength="16" value="${initialP2Name}" style="max-width: 200px;" />
                            <div class="d-flex align-items-center gap-3">
                                <button id="p2-prev" class="btn btn-link text-white fs-1 text-decoration-none px-2 py-0 skin-arrow" style="line-height: 1;">&lsaquo;</button>
                                <div id="p2-skin-container" class="rounded-4 d-flex align-items-center justify-content-center shadow-sm" style="width: 160px; height: 160px; background: rgba(255,255,255,0.05); border: 2px solid rgba(255,255,255,0.2); transition: border-color 0.3s; padding: 10px;">
                                </div>
                                <button id="p2-next" class="btn btn-link text-white fs-1 text-decoration-none px-2 py-0 skin-arrow" style="line-height: 1;">&rsaquo;</button>
                            </div>
                            <div class="badge rounded-pill mt-3 px-3 py-2" style="background: rgba(56, 189, 248, 0.18); color: #fff; border: 1px solid rgba(56, 189, 248, 0.35); letter-spacing: 1px;">FLECHAS</div>
                        </div>
                    </div>

                    <div class="w-75 border-bottom border-secondary opacity-50 mb-4"></div>

                    <div class="w-100 mb-4">
                        <h2 class="h6 text-white text-center fw-bold mb-3" style="font-family: 'Montserrat', sans-serif; letter-spacing: 1px;">MAPA / ARENA</h2>
                        <div id="local-map-options" class="d-flex gap-2 justify-content-center flex-wrap"></div>
                    </div>

                    <div class="w-100 d-flex justify-content-center mt-3">
                        <button id="btn-create-local-game" class="btn btn-lg fw-bold text-white shadow rounded-pill"
                            style="padding: 14px 18px; background: linear-gradient(90deg, #DE1A58, #8F0177); border: 2px solid rgba(246, 125, 49, 0.85); font-family: 'Montserrat', sans-serif; min-width: 280px; width: 60%;">
                            Crear Partida
                        </button>
                    </div>
                </div>
            </div>
        `;

        const getSkinImg = (skin) => {
            return `
                <div class="d-flex flex-column align-items-center gap-2">
                    <img src="/${skin.preview.path}" style="width: 96px; height: 96px; object-fit: contain; image-rendering: pixelated;" alt="${skin.label}">
                    <span class="text-white-50 small">${skin.label}</span>
                </div>
            `;
        };

        const updateSkins = () => {
            const p1Container = document.getElementById('p1-skin-container');
            if (p1Container) p1Container.innerHTML = getSkinImg(snakeAssets[p1SkinIndex]);
            const p2Container = document.getElementById('p2-skin-container');
            if (p2Container) p2Container.innerHTML = getSkinImg(snakeAssets[p2SkinIndex]);
        };

        const renderMapOptions = () => {
            const root = document.getElementById('local-map-options');
            if (!root) return;

            root.innerHTML = mapAssets.map((map, index) => `
                <button type="button" class="map-option rounded-3 p-2 text-center ${index === mapIndex ? 'active' : ''}" data-map-index="${index}" style="width: 112px;">
                    <span class="d-block rounded-2 mb-2" style="height: 42px; background: url('/${map.floor.path}') center/32px 32px repeat; image-rendering: pixelated;"></span>
                    <span class="small fw-semibold">${map.label}</span>
                </button>
            `).join('');

            root.querySelectorAll('[data-map-index]').forEach((button) => {
                button.addEventListener('click', () => {
                    mapIndex = Number(button.getAttribute('data-map-index')) || 0;
                    renderMapOptions();
                });
            });
        };

        const container = document.getElementById('game-container');
        container.appendChild(menuDiv);
        this.overlayEl = menuDiv;
        
        updateSkins();
        renderMapOptions();

        const cleanup = () => {
            const el = this.overlayEl;
            if (!el) return;
            if (container && container.contains(el)) container.removeChild(el);
            this.overlayEl = null;
        };

        const goBack = () => {
            cleanup();
            this.scene.start('MainMenu');
        };

        const startGame = () => {
            const difficulty = String(document.getElementById('difficulty')?.value ?? DEFAULT_CONFIG.difficulty);
            const p1Name = safeName(document.getElementById('p1-name')?.value, DEFAULT_CONFIG.p1.name);
            const p2Name = safeName(document.getElementById('p2-name')?.value, DEFAULT_CONFIG.p2.name);
            
            // Provide a fallback color from the default array using modulo, since we have more skins than colors
            const defaultColors = Array.isArray(PLAYER_COLORS) && PLAYER_COLORS.length ? PLAYER_COLORS : [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71];
            const p1Color = defaultColors[p1SkinIndex % defaultColors.length];
            const p2Color = defaultColors[p2SkinIndex % defaultColors.length];

            const p1Skin = snakeAssets[p1SkinIndex].id;
            const p2Skin = snakeAssets[p2SkinIndex].id;
            const mapId = mapAssets[mapIndex].id;

            const payload = {
                difficulty,
                mapId,
                players: {
                    p1: { name: p1Name, color: p1Color, skinId: p1Skin },
                    p2: { name: p2Name, color: p2Color, skinId: p2Skin },
                },
            };

            saveLocalGameSettings(payload);

            cleanup();
            this.scene.start('LocalGame', payload);
        };

        document.getElementById('btn-setup-back')?.addEventListener('click', goBack);
        document.getElementById('btn-create-local-game')?.addEventListener('click', startGame);

        document.getElementById('p1-prev')?.addEventListener('click', () => {
            p1SkinIndex = (p1SkinIndex - 1 + snakeAssets.length) % snakeAssets.length;
            updateSkins();
        });
        document.getElementById('p1-next')?.addEventListener('click', () => {
            p1SkinIndex = (p1SkinIndex + 1) % snakeAssets.length;
            updateSkins();
        });
        document.getElementById('p2-prev')?.addEventListener('click', () => {
            p2SkinIndex = (p2SkinIndex - 1 + snakeAssets.length) % snakeAssets.length;
            updateSkins();
        });
        document.getElementById('p2-next')?.addEventListener('click', () => {
            p2SkinIndex = (p2SkinIndex + 1) % snakeAssets.length;
            updateSkins();
        });

        const difficultyInput = document.getElementById('difficulty');
        const difficultyButtons = Array.from(menuDiv.querySelectorAll('[data-difficulty]'));
        const setDifficultyUi = (value) => {
            const v = String(value ?? DEFAULT_CONFIG.difficulty);
            if (difficultyInput) difficultyInput.value = v;

            difficultyButtons.forEach((btn) => {
                const isActive = btn.getAttribute('data-difficulty') === v;
                if (isActive) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        };

        difficultyButtons.forEach((btn) => {
            btn.addEventListener('click', () => setDifficultyUi(btn.getAttribute('data-difficulty')));
        });
        setDifficultyUi(initialDifficulty);

        this.input.keyboard?.on('keydown-ESC', goBack);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            cleanup();
            this.input.keyboard?.off('keydown-ESC', goBack);
        });
    }
}

