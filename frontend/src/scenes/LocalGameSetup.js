import Phaser from 'phaser';
import { PLAYER_COLORS } from '@shared/GameConfig';
import { loadLocalGameSettings, saveLocalGameSettings } from '../utils/localGameSettings.js';
import { DEFAULT_MAP_ID, DEFAULT_SNAKE_SKIN_ID, getMapAsset, getSnakeAsset, mapAssets, snakeAssets } from '../config/gameAssetRegistry.js';
import { normalizeLocalGameMode, resolveLocalSceneKey } from './localModeHelpers.js';

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
        this.presetMode = null;
    }

    init(data) {
        this.presetMode = data?.gameMode ? String(data.gameMode) : null;
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
        const initialGameMode = normalizeLocalGameMode(this.presetMode ?? saved?.gameMode ?? 'normal');
        const initialDifficulty = String(saved?.difficulty ?? DEFAULT_CONFIG.difficulty);
        const initialP1Name = safeName(saved?.players?.p1?.name, DEFAULT_CONFIG.p1.name);
        const initialP2Name = safeName(saved?.players?.p2?.name, DEFAULT_CONFIG.p2.name);

        const menuDiv = document.createElement('div');
        menuDiv.id = 'local-game-setup-overlay';
        menuDiv.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
        menuDiv.style.zIndex = '1000';
        menuDiv.style.paddingTop = '0.75rem';
        menuDiv.style.paddingBottom = '5.75rem';
        menuDiv.style.boxSizing = 'border-box';

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

                .mode-select-btn { border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.06); color: white; transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease; }
                .mode-select-btn:hover {
                    transform: translateY(-1px);
                    background: linear-gradient(180deg, #F67D31 0%, #e56a1f 100%);
                    border-color: rgba(255, 200, 140, 0.95);
                    color: #0B081A;
                    box-shadow: 0 8px 28px rgba(246, 125, 49, 0.45);
                }

                .local-setup-card {
                    max-height: min(88vh, calc(100vh - 7.25rem));
                    overflow-y: auto;
                }
                .local-setup-card::-webkit-scrollbar { width: 8px; }
                .local-setup-card::-webkit-scrollbar-thumb { background: rgba(246, 125, 49, 0.45); border-radius: 999px; }
                .local-setup-card::-webkit-scrollbar-track { background: rgba(255,255,255,0.06); border-radius: 999px; }

                .mode-modal { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; padding: 22px; z-index: 2000; background: rgba(0,0,0,0.55); backdrop-filter: blur(6px); }
                .mode-modal.open { display: flex; }
                .mode-modal-panel { width: min(860px, 96vw); border-radius: 18px; background: rgba(12, 18, 42, 0.96); border: 2px solid rgba(246, 125, 49, 0.55); box-shadow: 0 30px 120px rgba(0,0,0,0.55); overflow: hidden; }
                .mode-modal-header { padding: 18px 18px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; border-bottom: 1px solid rgba(255,255,255,0.12); }
                .mode-modal-title { margin: 0; color: white; font-weight: 800; letter-spacing: 1px; font-family: 'Montserrat', sans-serif; }
                .mode-modal-subtitle { margin: 6px 0 0; color: rgba(255,255,255,0.75); font-size: 0.9rem; }
                .mode-close { border: 1px solid rgba(255,255,255,0.22); background: transparent; color: white; border-radius: 999px; padding: 8px 12px; }
                .mode-close:hover { background: rgba(255,255,255,0.08); }

                .mode-carousel { display: grid; grid-template-columns: 64px 1fr 64px; align-items: center; gap: 10px; padding: 18px; }
                .mode-arrow { width: 54px; height: 54px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.06); color: white; font-size: 28px; line-height: 1; display: grid; place-items: center; cursor: pointer; transition: transform 0.15s ease, background 0.2s ease, border-color 0.2s ease; user-select: none; }
                .mode-arrow:hover { transform: scale(1.04); background: rgba(255,255,255,0.1); border-color: rgba(246, 125, 49, 0.55); }

                .mode-card { border-radius: 16px; overflow: hidden; border: 3px solid #F67D31; box-shadow: 0 18px 60px rgba(0,0,0,0.35); background: rgba(11, 8, 26, 1); }
                .mode-card-img { height: 220px; background: #0B081A; position: relative; overflow: hidden; }
                .mode-card-img img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; transform: scale(1.02); }
                .mode-card-img::after { content: ""; position: absolute; inset: 0; background: linear-gradient(to top, rgba(12,18,42,1), rgba(12,18,42,0.15)); }
                .mode-card-body { padding: 16px 16px 18px; background: rgba(12, 18, 42, 0.98); }
                .mode-card-title { margin: 0 0 6px; color: white; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; font-family: 'Montserrat', sans-serif; }
                .mode-card-desc { margin: 0; color: rgba(255,255,255,0.8); font-size: 0.95rem; line-height: 1.3; }

                .mode-modal-footer { padding: 14px 18px 18px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid rgba(255,255,255,0.12); }
                .mode-choose { padding: 12px 16px; border-radius: 999px; border: 2px solid rgba(246, 125, 49, 0.85); background: linear-gradient(90deg, #DE1A58, #8F0177); color: white; font-weight: 800; }
                .mode-choose:hover { filter: brightness(1.03); }
                .mode-cancel { padding: 12px 16px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.06); color: white; font-weight: 700; }
                .mode-cancel:hover { background: rgba(255,255,255,0.1); }
                .map-option { border: 2px solid rgba(255,255,255,0.16); background: rgba(255,255,255,0.06); color: white; transition: all 0.2s; }
                .map-option:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.4); }
                .map-option.active { border-color: #F67D31; box-shadow: 0 0 0 2px rgba(246,125,49,0.2), 0 12px 28px rgba(0,0,0,0.25); }
            </style>
            <div class="w-100 px-3 d-flex flex-column align-items-center" style="max-width: 900px;">
                <button id="btn-setup-back" class="btn btn-sm btn-outline-light fw-semibold align-self-start mb-3" type="button" style="border-radius: 999px; padding: 8px 14px;">
                    ← Volver
                </button>
                <div class="local-setup-card rounded-4 shadow-lg p-4 p-md-4 d-flex flex-column align-items-center w-100" style="background: rgba(15, 23, 42, 0.86); border: 1px solid rgba(255,255,255,0.14); backdrop-filter: blur(6px);">
                    
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

                    <div class="d-flex flex-column align-items-center mb-4 w-100">
                        <button id="btn-open-mode" type="button" class="btn rounded-pill px-4 py-2 fw-bold mode-select-btn" style="min-width: 280px;">
                            Seleccionar modo de juego
                        </button>
                        <div id="mode-selected-label" class="mt-2 small" style="color: rgba(255,255,255,0.75);">
                            -
                        </div>
                        <input id="gameMode" type="hidden" value="${initialGameMode}" />
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

            <div id="mode-modal" class="mode-modal" role="dialog" aria-modal="true" aria-labelledby="mode-modal-title">
                <div class="mode-modal-panel">
                    <div class="mode-modal-header">
                        <div>
                            <h2 id="mode-modal-title" class="mode-modal-title">SELECCIONA MODO DE JUEGO</h2>
                            <p class="mode-modal-subtitle">Usa las flechas para ver más modos.</p>
                        </div>
                        <button id="mode-close" class="mode-close" type="button">Cerrar</button>
                    </div>

                    <div class="mode-carousel">
                        <button id="mode-prev" class="mode-arrow" type="button" aria-label="Anterior">‹</button>
                        <div id="mode-card-slot"></div>
                        <button id="mode-next" class="mode-arrow" type="button" aria-label="Siguiente">›</button>
                    </div>

                    <div class="mode-modal-footer">
                        <button id="mode-cancel" class="mode-cancel" type="button">Cancelar</button>
                        <button id="mode-choose" class="mode-choose" type="button">Elegir este modo</button>
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
            const gameMode = normalizeLocalGameMode(document.getElementById('gameMode')?.value ?? 'normal');
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
                gameMode,
                difficulty,
                mapId,
                players: {
                    p1: { name: p1Name, color: p1Color, skinId: p1Skin },
                    p2: { name: p2Name, color: p2Color, skinId: p2Skin },
                },
            };

            saveLocalGameSettings(payload);

            cleanup();
            this.scene.start(resolveLocalSceneKey(gameMode), payload);
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

        const gameModeInput = document.getElementById('gameMode');
        const modeSelectedLabel = document.getElementById('mode-selected-label');
        const modeOpenBtn = document.getElementById('btn-open-mode');

        const modeModal = document.getElementById('mode-modal');
        const modeClose = document.getElementById('mode-close');
        const modeCancel = document.getElementById('mode-cancel');
        const modeChoose = document.getElementById('mode-choose');
        const modePrev = document.getElementById('mode-prev');
        const modeNext = document.getElementById('mode-next');
        const modeCardSlot = document.getElementById('mode-card-slot');

        const MODES = [
            {
                id: 'normal',
                title: 'NORMAL GAME',
                desc: 'El modo clasico local: si chocas contra una pared, pierdes una vida.',
                img: '/fondo_duelo.png',
                label: 'Normal Game',
            },
            {
                id: 'infinite',
                title: 'INFINITE MODE',
                desc: 'Tablero infinito: al salir por un borde reapareces por el lado opuesto.',
                img: '/assets/infinite_mode.png',
                label: 'Infinite Mode',
            },
            {
                id: 'timeAttack',
                title: 'CONTRARRELOJ',
                desc: '1 minuto, vidas infinitas y Muerte súbita en empate.',
                img: '/time_attack.jpg',
                label: 'Contrarreloj',
            },
            {
                id: 'chaos',
                title: 'MODO CAOS',
                desc: '5 vidas, sin victoria por puntuación: gana quien aguante. Efectos aleatorios en el tablero y los controles.',
                img: '/assets/ModoCaos2.png',
                label: 'Modo Caos',
            },
            {
                id: 'kingOfTheHill',
                title: 'REY DE LA COLINA',
                desc: 'La zona (naranja) cambia cada 6 s. Gana quien llegue antes a 100 puntos o quien conserve vidas cuando el rival se quede sin ellas.',
                img: '/ModoReyColina.png',
                label: 'Rey de la colina',
            },
        ];

        let modeIndex = Math.max(0, MODES.findIndex((m) => m.id === initialGameMode));
        if (modeIndex === -1) modeIndex = 0;
        let pendingModeId = MODES[modeIndex]?.id ?? 'normal';

        const setGameModeValue = (modeId) => {
            const safe = normalizeLocalGameMode(modeId);
            if (gameModeInput) gameModeInput.value = safe;
            const current = MODES.find((m) => m.id === safe);
            if (modeSelectedLabel) modeSelectedLabel.textContent = current ? `Seleccionado: ${current.label}` : 'Seleccionado: -';
        };

        const renderModeCard = () => {
            const m = MODES[modeIndex];
            if (!m || !modeCardSlot) return;
            pendingModeId = m.id;
            modeCardSlot.innerHTML = `
                <div class="mode-card" role="group" aria-label="Modo de juego">
                    <div class="mode-card-img">
                        <img src="${m.img}" alt="${m.title}">
                    </div>
                    <div class="mode-card-body">
                        <h3 class="mode-card-title">${m.title}</h3>
                        <p class="mode-card-desc">${m.desc}</p>
                    </div>
                </div>
            `;
        };

        const openModeModal = () => {
            if (!modeModal) return;
            renderModeCard();
            modeModal.classList.add('open');
        };

        const closeModeModal = () => {
            if (!modeModal) return;
            modeModal.classList.remove('open');
        };

        const rotateMode = (delta) => {
            const len = MODES.length || 1;
            modeIndex = (modeIndex + delta + len) % len;
            renderModeCard();
        };

        modeOpenBtn?.addEventListener('click', openModeModal);
        modeClose?.addEventListener('click', closeModeModal);
        modeCancel?.addEventListener('click', closeModeModal);
        modePrev?.addEventListener('click', () => rotateMode(-1));
        modeNext?.addEventListener('click', () => rotateMode(1));
        modeChoose?.addEventListener('click', () => {
            setGameModeValue(pendingModeId);
            closeModeModal();
        });

        modeModal?.addEventListener('click', (e) => {
            if (e.target === modeModal) closeModeModal();
        });

        setGameModeValue(initialGameMode);

        this.input.keyboard?.on('keydown-ESC', () => {
            const isOpen = Boolean(document.getElementById('mode-modal')?.classList.contains('open'));
            if (isOpen) closeModeModal();
            else goBack();
        });

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            cleanup();
            this.input.keyboard?.off('keydown-ESC');
        });
    }
}

