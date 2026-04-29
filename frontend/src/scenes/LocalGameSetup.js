import Phaser from 'phaser';
import { PLAYER_COLORS } from '@shared/GameConfig';
import { loadLocalGameSettings, saveLocalGameSettings } from '../utils/localGameSettings.js';

function safeName(value, fallback) {
    const s = String(value ?? '').trim();
    if (!s) return fallback;
    return s.slice(0, 16);
}

function safeColorHex(value, fallbackHex) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
    const s = String(value ?? '').trim();
    if (s.startsWith('0x')) {
        const parsed = Number(s);
        if (Number.isFinite(parsed)) return parsed;
    }
    return fallbackHex;
}

const DEFAULT_CONFIG = {
    difficulty: 'normal', // easy | normal | hard
    p1: { name: 'Jugador 1', color: PLAYER_COLORS?.[0] ?? 0xe74c3c, skinId: 'p1' },
    p2: { name: 'Jugador 2', color: PLAYER_COLORS?.[1] ?? 0x3498db, skinId: 'p2' },
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
        const initialP1Color = safeColorHex(saved?.players?.p1?.color, DEFAULT_CONFIG.p1.color);
        const initialP2Color = safeColorHex(saved?.players?.p2?.color, DEFAULT_CONFIG.p2.color);

        const menuDiv = document.createElement('div');
        menuDiv.id = 'local-game-setup-overlay';
        menuDiv.className = 'position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center';
        menuDiv.style.zIndex = '1000';

        const colors = Array.isArray(PLAYER_COLORS) && PLAYER_COLORS.length ? PLAYER_COLORS : [0xe74c3c, 0x3498db, 0xf1c40f, 0x2ecc71];

        const colorOptionsHtml = (selected) =>
            colors
                .map((c, idx) => {
                    const hex = `0x${c.toString(16).padStart(6, '0')}`;
                    const isSelected = c === selected ? 'selected' : '';
                    return `<option value="${hex}" ${isSelected}>Skin ${idx + 1}</option>`;
                })
                .join('');

        menuDiv.innerHTML = `
            <div class="w-100 px-3" style="max-width: 980px;">
                <div class="rounded-4 shadow-lg p-4 p-md-5" style="background: rgba(15, 23, 42, 0.86); border: 1px solid rgba(255,255,255,0.14); backdrop-filter: blur(6px);">
                    <div class="d-flex align-items-center justify-content-between mb-4">
                        <button id="btn-setup-back" class="btn btn-sm btn-outline-light fw-semibold" type="button" style="border-radius: 999px; padding: 8px 14px;">
                            ← Volver
                        </button>
                        <div class="text-center flex-grow-1">
                            <div class="h2 text-white fw-bold mb-0" style="font-family: 'Teko', sans-serif; letter-spacing: 1px;">CONFIGURACIÓN LOCAL</div>
                            <div class="text-white-50 small">Elige dificultad, nombre y skin de cada jugador</div>
                        </div>
                        <div style="width: 92px;"></div>
                    </div>

                    <div class="row g-3 align-items-stretch">
                        <div class="col-12 col-lg-4">
                            <div class="rounded-4 p-3 h-100" style="background: rgba(2, 6, 23, 0.55); border: 1px solid rgba(255,255,255,0.12);">
                                <div class="text-white fw-bold mb-2">Modo de juego</div>
                                <div class="text-white-50 small mb-2">Dificultad</div>
                                <input id="difficulty" type="hidden" value="${initialDifficulty}" />
                                <div class="btn-group w-100" role="group" aria-label="Dificultad">
                                    <button id="btn-diff-easy"   type="button" class="btn fw-bold" data-difficulty="easy"   style="border: 1px solid rgba(255,255,255,0.18);">Easy</button>
                                    <button id="btn-diff-normal" type="button" class="btn fw-bold" data-difficulty="normal" style="border: 1px solid rgba(255,255,255,0.18);">Medium</button>
                                    <button id="btn-diff-hard"   type="button" class="btn fw-bold" data-difficulty="hard"   style="border: 1px solid rgba(255,255,255,0.18);">Difficult</button>
                                </div>
                                <div class="text-white-50 small mt-2">
                                    - Easy: más lento y más comida<br/>
                                    - Medium: balanceado<br/>
                                    - Difficult: más rápido y más obstáculos
                                </div>
                            </div>
                        </div>

                        <div class="col-12 col-lg-4">
                            <div class="rounded-4 p-3 h-100" style="background: rgba(2, 6, 23, 0.55); border: 1px solid rgba(255,255,255,0.12);">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <div class="text-white fw-bold">Jugador 1</div>
                                    <div class="badge rounded-pill" style="background: rgba(222, 26, 88, 0.22); color: #fff; border: 1px solid rgba(222, 26, 88, 0.4);">WASD</div>
                                </div>
                                <label class="form-label text-white-50 small mb-1" for="p1-name">Nombre</label>
                                <input id="p1-name" class="form-control bg-dark text-white border-secondary" placeholder="Jugador 1" maxlength="16" value="${initialP1Name}" />
                                <label class="form-label text-white-50 small mb-1 mt-3" for="p1-skin">Skin</label>
                                <select id="p1-skin" class="form-select bg-dark text-white border-secondary">
                                    ${colorOptionsHtml(initialP1Color)}
                                </select>
                            </div>
                        </div>

                        <div class="col-12 col-lg-4">
                            <div class="rounded-4 p-3 h-100" style="background: rgba(2, 6, 23, 0.55); border: 1px solid rgba(255,255,255,0.12);">
                                <div class="d-flex align-items-center justify-content-between mb-2">
                                    <div class="text-white fw-bold">Jugador 2</div>
                                    <div class="badge rounded-pill" style="background: rgba(56, 189, 248, 0.18); color: #fff; border: 1px solid rgba(56, 189, 248, 0.35);">Flechas</div>
                                </div>
                                <label class="form-label text-white-50 small mb-1" for="p2-name">Nombre</label>
                                <input id="p2-name" class="form-control bg-dark text-white border-secondary" placeholder="Jugador 2" maxlength="16" value="${initialP2Name}" />
                                <label class="form-label text-white-50 small mb-1 mt-3" for="p2-skin">Skin</label>
                                <select id="p2-skin" class="form-select bg-dark text-white border-secondary">
                                    ${colorOptionsHtml(initialP2Color)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="d-flex justify-content-center mt-4">
                        <button id="btn-create-local-game" class="btn btn-lg fw-bold text-white shadow"
                            style="min-width: min(520px, 100%); padding: 14px 18px; background: linear-gradient(90deg, #DE1A58, #8F0177); border: 2px solid rgba(246, 125, 49, 0.85); border-radius: 14px; font-family: 'Montserrat', sans-serif;">
                            Crear Partida
                        </button>
                    </div>
                </div>
            </div>
        `;

        const container = document.getElementById('game-container');
        container.appendChild(menuDiv);
        this.overlayEl = menuDiv;

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
            const p1Color = safeColorHex(document.getElementById('p1-skin')?.value, DEFAULT_CONFIG.p1.color);
            const p2Color = safeColorHex(document.getElementById('p2-skin')?.value, DEFAULT_CONFIG.p2.color);

            const payload = {
                difficulty,
                players: {
                    p1: { name: p1Name, color: p1Color, skinId: 'p1' },
                    p2: { name: p2Name, color: p2Color, skinId: 'p2' },
                },
            };

            saveLocalGameSettings(payload);

            cleanup();
            this.scene.start('LocalGame', payload);
        };

        document.getElementById('btn-setup-back')?.addEventListener('click', goBack);
        document.getElementById('btn-create-local-game')?.addEventListener('click', startGame);

        const difficultyInput = document.getElementById('difficulty');
        const difficultyButtons = Array.from(menuDiv.querySelectorAll('[data-difficulty]'));
        const setDifficultyUi = (value) => {
            const v = String(value ?? DEFAULT_CONFIG.difficulty);
            if (difficultyInput) difficultyInput.value = v;

            difficultyButtons.forEach((btn) => {
                const isActive = btn.getAttribute('data-difficulty') === v;
                btn.classList.toggle('btn-light', isActive);
                btn.classList.toggle('text-dark', isActive);
                btn.classList.toggle('btn-outline-light', !isActive);
                btn.classList.toggle('text-white', !isActive);
                btn.style.backgroundColor = isActive ? 'rgba(255, 255, 255, 0.88)' : 'transparent';
                btn.style.borderColor = isActive ? 'rgba(255, 255, 255, 0.65)' : 'rgba(255,255,255,0.18)';
                btn.style.boxShadow = isActive ? '0 10px 24px rgba(0,0,0,0.35)' : 'none';
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

