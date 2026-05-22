import Phaser from 'phaser';
import { extractLeaderboardUserName, getCurrentUser } from '../services/firebaseAuthService.js';
import {
    ACCOUNT_GUEST_LABEL,
    bindAccountButton,
    closeAccountDropdown,
    refreshAccountButton,
} from '../ui/accountButton.js';
import { LeaderboardService } from '../services/LeaderboardService.js';
import { getAudioSettings, saveMusicVolume, saveSelectedMusic, saveSfxVolume } from '../utils/audioSettings.js';
import { getLocalLeaderboardEntries } from '../utils/localProfiles.js';

const MENU_MUSIC_KEYS = ['musica_in_game', 'musica2', 'musica3'];

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
        this.musicTimeout = null;
        this.lastSfxTime = 0;
    }

    create() {
        closeAccountDropdown();
        this.leaderboardView = 'online';
        this.leaderboardData = {
            onlineEntries: [],
            onlineStatus: 'Comprobando tu puesto...',
            onlineError: false,
            localEntries: getLocalLeaderboardEntries(localStorage),
        };

        const fondo = this.add.image(this.scale.width / 2, this.scale.height / 2, 'fondo_duelo');

        const ajustarFondo = (width, height) => {
            fondo.setPosition(width / 2, height / 2);
            const escalaX = width / fondo.width;
            const escalaY = height / fondo.height;
            fondo.setScale(Math.max(escalaX, escalaY));
        };

        ajustarFondo(this.scale.width, this.scale.height);
        this.scale.on('resize', (gameSize) => ajustarFondo(gameSize.width, gameSize.height));

        const audioSettings = getAudioSettings(localStorage, MENU_MUSIC_KEYS);
        const savedMusicVol = audioSettings.musicVolume;
        const savedSfxVol = audioSettings.sfxVolume;
        const savedMusicKey = audioSettings.selectedMusic;

        this.menuMusic = this.sound.add(savedMusicKey, { loop: true, volume: savedMusicVol });

        const menuDiv = document.createElement('div');
        menuDiv.id = 'main-menu-overlay';
        menuDiv.className = 'position-absolute top-0 start-0 w-100 h-100';
        menuDiv.style.zIndex = '1000';
        menuDiv.style.overflow = 'hidden';

        menuDiv.innerHTML = `
            <style>
                #main-menu-overlay .main-menu-account {
                    position: absolute;
                    top: clamp(12px, 2vh, 24px);
                    right: clamp(12px, 2vw, 28px);
                    z-index: 20;
                }

                #main-menu-overlay #btn-account {
                    padding: 10px 16px;
                    border: 2px solid #F67D31;
                    border-radius: 999px;
                    background: linear-gradient(90deg, rgba(26, 5, 162, 0.95), rgba(15, 118, 110, 0.92));
                    color: white;
                    font-family: 'Montserrat', sans-serif;
                    font-size: 0.9rem;
                    font-weight: 800;
                    letter-spacing: 0.02em;
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    max-width: min(240px, 42vw);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                #main-menu-overlay #btn-account:hover {
                    transform: scale(1.04);
                    box-shadow: 0 10px 28px rgba(246, 125, 49, 0.25);
                }

                #main-menu-overlay .main-menu-card {
                    position: relative;
                    width: min(420px, 90vw);
                    background: rgba(8, 12, 29, 0.78);
                    border: 1px solid rgba(148, 163, 184, 0.18);
                    border-radius: 28px;
                    padding: 24px;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.32);
                    backdrop-filter: blur(14px);
                    display: grid;
                    gap: 18px;
                    text-align: center;
                }

                #main-menu-overlay .menu-heading {
                    display: grid;
                    gap: 6px;
                }

                #main-menu-overlay .menu-title {
                    margin: 0;
                    font-size: clamp(2rem, 4vw, 2.6rem);
                    letter-spacing: 0.14em;
                    color: #FDE68A;
                    text-transform: uppercase;
                    text-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
                }

                #main-menu-overlay .menu-subtitle {
                    margin: 0;
                    color: #A5F3FC;
                    font-size: 0.78rem;
                    font-weight: 700;
                    letter-spacing: 0.18em;
                    text-transform: uppercase;
                }

                #main-menu-overlay .menu-description {
                    margin: 0;
                    color: #CBD5E1;
                    font-size: 0.95rem;
                    line-height: 1.4;
                }

                #main-menu-overlay .main-menu-buttons {
                    display: grid;
                    gap: 12px;
                }

                #main-menu-overlay .primary-action {
                    width: 100%;
                    padding: 14px 16px;
                    border-radius: 14px;
                    font-size: 1rem;
                    font-family: 'Montserrat', sans-serif;
                    font-weight: 800;
                    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
                    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.24);
                }

                #main-menu-overlay .primary-action:hover {
                    transform: translateY(-1px) scale(1.02);
                    box-shadow: 0 20px 42px rgba(0, 0, 0, 0.32);
                }

                #main-menu-overlay .secondary-panel {
                    display: grid;
                    gap: 12px;
                }

                #main-menu-overlay #secondary-actions {
                    display: grid;
                    gap: 10px;
                }

                #main-menu-overlay .secondary-action {
                    width: 100%;
                    padding: 12px 14px;
                    border-radius: 12px;
                    font-size: 0.98rem;
                    border: 1px solid rgba(255, 255, 255, 0.14);
                    background: rgba(255, 255, 255, 0.08);
                    color: #E2E8F0;
                    transition: background 0.2s ease, transform 0.2s ease;
                }

                #main-menu-overlay .secondary-action:hover {
                    background: rgba(255, 255, 255, 0.14);
                }

                #main-menu-overlay #btn-submenu-toggle {
                    background: transparent;
                    border: 1px dashed rgba(255, 255, 255, 0.22);
                    color: #F8FAFC;
                    text-transform: uppercase;
                    letter-spacing: 0.08em;
                }

                #main-menu-overlay #secondary-actions.d-none {
                    display: none;
                }

                #main-menu-overlay .leaderboard-panel {
                    position: absolute;
                    top: 50%;
                    right: clamp(18px, 5vw, 72px);
                    transform: translateY(-50%);
                    width: min(330px, 30vw);
                    padding: 18px;
                    border: 2px solid rgba(246, 125, 49, 0.65);
                    border-radius: 12px;
                    background: linear-gradient(180deg, rgba(17, 24, 39, 0.92), rgba(49, 12, 53, 0.9));
                    box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45), 0 0 24px rgba(246, 125, 49, 0.18);
                    color: white;
                    font-family: 'Montserrat', sans-serif;
                    backdrop-filter: blur(8px);
                }

                #main-menu-overlay .leaderboard-header {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    margin-bottom: 12px;
                }

                #main-menu-overlay .leaderboard-title {
                    margin: 0;
                    color: #FDE68A;
                    font-size: 1.05rem;
                    font-weight: 800;
                    letter-spacing: 0;
                    text-align: center;
                    text-transform: uppercase;
                }

                #main-menu-overlay .leaderboard-tabs {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }

                #main-menu-overlay .leaderboard-tab {
                    border: 1px solid rgba(255, 255, 255, 0.18);
                    border-radius: 999px;
                    background: rgba(255, 255, 255, 0.08);
                    color: #E2E8F0;
                    font-size: 0.82rem;
                    font-weight: 800;
                    letter-spacing: 0.02em;
                    padding: 8px 10px;
                    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
                }

                #main-menu-overlay .leaderboard-tab.active {
                    background: linear-gradient(90deg, rgba(246, 125, 49, 0.95), rgba(222, 26, 88, 0.92));
                    border-color: rgba(255, 214, 170, 0.9);
                    color: white;
                }

                #main-menu-overlay .leaderboard-list {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                    margin-bottom: 12px;
                }

                #main-menu-overlay .leaderboard-row {
                    display: grid;
                    grid-template-columns: 38px minmax(0, 1fr) 88px;
                    align-items: center;
                    gap: 8px;
                    min-height: 32px;
                    padding: 6px 8px;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 8px;
                    background: rgba(255, 255, 255, 0.07);
                    font-size: 0.84rem;
                }

                #main-menu-overlay .leaderboard-rank {
                    color: #F67D31;
                    font-weight: 900;
                }

                #main-menu-overlay .leaderboard-name {
                    overflow: hidden;
                    min-width: 0;
                    font-weight: 700;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                #main-menu-overlay .leaderboard-score {
                    color: #C7D2FE;
                    font-weight: 800;
                    text-align: right;
                    white-space: nowrap;
                    font-size: 0.78rem;
                }

                #main-menu-overlay .leaderboard-status {
                    margin: 0;
                    padding-top: 12px;
                    border-top: 1px solid rgba(255, 255, 255, 0.14);
                    color: #E0F2FE;
                    font-size: 0.86rem;
                    font-weight: 700;
                    line-height: 1.35;
                    text-align: center;
                }

                #main-menu-overlay .leaderboard-status strong {
                    color: #FDE68A;
                }

                #main-menu-overlay .leaderboard-empty {
                    margin: 8px 0 12px;
                    color: #CBD5E1;
                    font-size: 0.88rem;
                    text-align: center;
                }

                @media (max-width: 980px) {
                    #main-menu-overlay .leaderboard-panel {
                        top: auto;
                        right: 50%;
                        bottom: 18px;
                        width: min(560px, calc(100vw - 32px));
                        max-height: 34vh;
                        padding: 14px;
                        transform: translateX(50%);
                    }

                    #main-menu-overlay .leaderboard-list {
                        max-height: 18vh;
                        overflow: hidden;
                    }
                }
            </style>
            <div id="pantalla-principal" class="d-flex align-items-center justify-content-center w-100 h-100 position-relative">
                <div class="main-menu-account">
                    <button id="btn-account" type="button" title="Crear cuenta o iniciar sesión">${ACCOUNT_GUEST_LABEL}</button>
                </div>
                <section class="main-menu-card">
                    <div class="menu-heading">
                        <p class="menu-subtitle">Snake Multijugador</p>
                        <h1 class="menu-title">Menú Principal</h1>
                        <p class="menu-description">Elige tu modo de juego o abre el submenú para opciones extra.</p>
                    </div>

                    <div class="main-menu-buttons">
                        <button id="btn-local" class="btn text-white fw-bold shadow menu-btn w-100 primary-action" style="background-color: #DE1A58; border: 2px solid #F67D31;">
                            JUEGO LOCAL
                        </button>

                        <button id="btn-online" class="btn text-white fw-bold shadow menu-btn w-100 primary-action" style="background-color: #8F0177; border: 2px solid #F67D31;">
                            1 VS 1 ONLINE
                        </button>

                        <button id="btn-tutorial" class="btn text-white fw-bold shadow menu-btn w-100 primary-action" style="background-color: #0F766E; border: 2px solid #22D3EE;">
                            TUTORIAL
                        </button>
                    </div>

                    <div class="secondary-panel">
                        <button id="btn-submenu-toggle" class="btn text-white fw-semibold w-100 menu-btn secondary-action">
                            MÁS OPCIONES
                        </button>
                        <div id="secondary-actions" class="d-none">
                            <button id="btn-solo" class="btn text-white fw-bold shadow menu-btn w-100 secondary-action" style="background-color: rgba(15, 23, 42, 0.82); border: 1px solid rgba(255, 255, 255, 0.14);">
                                JUEGO SOLITARIO
                            </button>
                            <button id="btn-opciones" class="btn text-white fw-bold shadow menu-btn w-100 secondary-action" style="background-color: rgba(31, 41, 55, 0.88); border: 1px solid rgba(34, 211, 238, 0.45);">
                                AJUSTES
                            </button>
                        </div>
                    </div>
                </section>

                <aside class="leaderboard-panel" aria-label="Tabla de clasificación">
                    <div class="leaderboard-header">
                        <h2 id="leaderboard-title" class="leaderboard-title">TOP 10 COMPETITIVO</h2>
                        <div class="leaderboard-tabs" role="tablist" aria-label="Tipo de clasificación">
                            <button id="leaderboard-tab-online" class="leaderboard-tab active" type="button">Competitivo</button>
                            <button id="leaderboard-tab-local" class="leaderboard-tab" type="button">Local / Amigos</button>
                        </div>
                    </div>
                    <div id="leaderboard-list" class="leaderboard-list">
                        <p class="leaderboard-empty">Cargando clasificación...</p>
                    </div>
                    <p id="leaderboard-user-rank" class="leaderboard-status">Comprobando tu puesto...</p>
                </aside>
            </div>

            <div id="pantalla-opciones" class="d-none position-absolute top-50 start-50 translate-middle d-flex flex-column gap-4 px-4 py-4" style="width: 100%; max-width: 500px; background: rgba(15, 23, 42, 0.95); border: 2px solid rgba(34, 211, 238, 0.4); border-radius: 16px; backdrop-filter: blur(10px); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
                <h2 class="text-white text-center fw-bold mb-3" style="font-family: 'Montserrat', sans-serif;">AJUSTES</h2>

                <div class="text-start">
                    <label for="music-vol" class="form-label text-white fw-semibold mb-1 small">Música de la partida</label>
                    <input type="range" class="form-range" id="music-vol" min="0" max="1" step="0.05" value="${savedMusicVol}">
                </div>

                <div class="text-start">
                    <label for="sfx-vol" class="form-label text-white fw-semibold mb-1 small">Efectos SFX</label>
                    <input type="range" class="form-range" id="sfx-vol" min="0" max="1" step="0.05" value="${savedSfxVol}">
                </div>

                <div class="text-start mb-3">
                    <label for="music-select" class="form-label text-white fw-semibold mb-1 small">Elegir Pista</label>
                    <select class="form-select form-select-sm bg-dark text-white border-secondary" id="music-select">
                        <option value="musica_in_game" ${savedMusicKey === 'musica_in_game' ? 'selected' : ''}>Música 1</option>
                        <option value="musica2" ${savedMusicKey === 'musica2' ? 'selected' : ''}>Música 2</option>
                        <option value="musica3" ${savedMusicKey === 'musica3' ? 'selected' : ''}>Música 3</option>
                    </select>
                </div>

                <button id="btn-controles" class="btn text-white fw-bold shadow menu-btn w-100" style="padding: 12px; background-color: #006B7C; border: 2px solid #F67D31; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem; transition: all 0.2s ease; margin-bottom: 10px;">
                    ⚙️ CONFIGURAR CONTROLES
                </button>

                <button id="btn-volver" class="btn text-white fw-bold shadow mt-3 menu-btn" style="width: 100%; padding: 12px; background-color: #334155; border: 2px solid #94A3B8; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem;">
                    VOLVER
                </button>
            </div>
        `;

        document.getElementById('game-container').appendChild(menuDiv);
        this.initializeLeaderboardTabs(menuDiv);
        this.renderLeaderboard(menuDiv);
        this.loadLeaderboard(menuDiv);

        const pantallaPrincipal = document.getElementById('pantalla-principal');
        const pantallaOpciones = document.getElementById('pantalla-opciones');

        const clearMenu = () => {
            if (document.getElementById('game-container').contains(menuDiv)) {
                document.getElementById('game-container').removeChild(menuDiv);
            }
        };

        const detenerAudioPrueba = () => {
            if (this.menuMusic) this.menuMusic.stop();
            if (this.musicTimeout) clearTimeout(this.musicTimeout);
        };

        const rebuildMenuMusic = (musicKey, volume) => {
            if (this.menuMusic) {
                this.menuMusic.stop();
                this.menuMusic.destroy();
            }
            this.menuMusic = this.sound.add(musicKey, { loop: true, volume });
        };

        const accountButton = menuDiv.querySelector('#btn-account');
        bindAccountButton({
            scene: this,
            buttonEl: accountButton,
            returnScene: 'MainMenu',
            onBeforeNavigate: () => {
                closeAccountDropdown();
                detenerAudioPrueba();
                clearMenu();
            },
        });

        accountButton?.addEventListener('mouseenter', (event) => {
            event.currentTarget.style.transform = 'scale(1.04)';
        });
        accountButton?.addEventListener('mouseleave', (event) => {
            event.currentTarget.style.transform = 'scale(1)';
        });

        document.getElementById('btn-local').addEventListener('click', () => {
            detenerAudioPrueba();
            clearMenu();
            this.scene.start('LocalGameSetup', { gameMode: 'normal' });
        });

        document.getElementById('btn-solo').addEventListener('click', () => {
            detenerAudioPrueba();
            clearMenu();
            this.scene.start('SoloGameSetup');
        });

        document.getElementById('btn-online').addEventListener('click', () => {
            detenerAudioPrueba();
            clearMenu();
            this.scene.start('OnlineMenu');
        });

        document.getElementById('btn-tutorial').addEventListener('click', () => {
            detenerAudioPrueba();
            clearMenu();
            this.scene.start('Tutorial');
        });

        document.getElementById('btn-opciones').addEventListener('click', () => {
            pantallaPrincipal.classList.add('d-none');
            pantallaOpciones.classList.remove('d-none');
        });

        const btnSubmenuToggle = document.getElementById('btn-submenu-toggle');
        const secondaryActions = document.getElementById('secondary-actions');
        btnSubmenuToggle?.addEventListener('click', () => {
            const isOpen = !secondaryActions.classList.toggle('d-none');
            btnSubmenuToggle.textContent = isOpen ? 'MENOS OPCIONES' : 'MÁS OPCIONES';
        });

        document.getElementById('btn-controles').addEventListener('click', () => {
            detenerAudioPrueba();
            clearMenu();
            this.scene.start('ControlsMenu');
        });

        document.getElementById('btn-volver').addEventListener('click', () => {
            detenerAudioPrueba();
            pantallaOpciones.classList.add('d-none');
            pantallaPrincipal.classList.remove('d-none');
        });

        const sliderMusic = document.getElementById('music-vol');
        const sliderSfx = document.getElementById('sfx-vol');

        sliderMusic.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            saveMusicVolume(localStorage, vol);
            this.menuMusic.setVolume(vol);
            if (vol > 0 && !this.menuMusic.isPlaying) this.menuMusic.play();
            if (this.musicTimeout) clearTimeout(this.musicTimeout);
            this.musicTimeout = setTimeout(() => { this.menuMusic.pause(); }, 2000);
        });

        sliderSfx.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            saveSfxVolume(localStorage, vol);
            if (this.time.now > this.lastSfxTime + 150) {
                this.sound.play('sonido_choque', { volume: vol });
                this.lastSfxTime = this.time.now;
            }
        });

        const elementsToHover = document.querySelectorAll('.menu-btn, .arcade-card');
        elementsToHover.forEach((el) => {
            el.addEventListener('mouseenter', () => {
                el.style.transform = 'scale(1.05)';
                if (el.classList.contains('arcade-card')) {
                    el.style.setProperty('box-shadow', '0 0 30px rgba(246, 125, 49, 0.4)', 'important');
                    el.querySelector('.arcade-img').style.opacity = '1';
                }
            });
            el.addEventListener('mouseleave', () => {
                el.style.transform = 'scale(1)';
                if (el.classList.contains('arcade-card')) {
                    el.style.setProperty('box-shadow', 'var(--bs-box-shadow-lg)', 'important');
                    el.querySelector('.arcade-img').style.opacity = '0.85';
                }
            });
        });

        const musicSelect = document.getElementById('music-select');
        musicSelect.addEventListener('change', (e) => {
            const newKey = e.target.value;
            saveSelectedMusic(localStorage, newKey);
            if (this.menuMusic.isPlaying || this.musicTimeout) {
                rebuildMenuMusic(newKey, parseFloat(sliderMusic.value));
                if (parseFloat(sliderMusic.value) > 0) this.menuMusic.play();
                if (this.musicTimeout) clearTimeout(this.musicTimeout);
                this.musicTimeout = setTimeout(() => { this.menuMusic.pause(); }, 2000);
            } else {
                rebuildMenuMusic(newKey, parseFloat(sliderMusic.value));
            }
        });
    }

    async loadLeaderboard(menuDiv) {
        this.leaderboardData.localEntries = getLocalLeaderboardEntries(localStorage);
        this.renderLeaderboard(menuDiv);

        try {
            const [entries, currentUser] = await Promise.all([
                LeaderboardService.getAll(),
                getCurrentUser(),
            ]);

            if (!menuDiv.isConnected) return;

            this.leaderboardData.onlineEntries = entries
                .filter((entry) => entry && entry.userName)
                .sort((first, second) => second.winCount - first.winCount || first.userName.localeCompare(second.userName));
            this.leaderboardData.onlineError = false;

            await refreshAccountButton(menuDiv.querySelector('#btn-account'));

            if (!currentUser) {
                this.leaderboardData.onlineStatus = 'Inicia sesión para ver tu puesto.';
                this.renderLeaderboard(menuDiv);
                return;
            }

            const userName = extractLeaderboardUserName(currentUser);
            const userIndex = this.leaderboardData.onlineEntries.findIndex((entry) => entry.userName === userName);

            this.leaderboardData.onlineStatus = userIndex >= 0
                ? `Tu puesto: #${userIndex + 1}`
                : 'Aún no tienes puesto. Gana una partida competitiva.';
            this.renderLeaderboard(menuDiv);
        } catch (error) {
            console.error('Could not load leaderboard.', error);
            if (!menuDiv.isConnected) return;
            this.leaderboardData.onlineError = true;
            this.leaderboardData.onlineStatus = 'Inténtalo de nuevo más tarde.';
            this.renderLeaderboard(menuDiv);
        }
    }

    initializeLeaderboardTabs(menuDiv) {
        const onlineTab = menuDiv.querySelector('#leaderboard-tab-online');
        const localTab = menuDiv.querySelector('#leaderboard-tab-local');

        onlineTab?.addEventListener('click', () => {
            this.leaderboardView = 'online';
            this.renderLeaderboard(menuDiv);
        });

        localTab?.addEventListener('click', () => {
            this.leaderboardView = 'local';
            this.leaderboardData.localEntries = getLocalLeaderboardEntries(localStorage);
            this.renderLeaderboard(menuDiv);
        });
    }

    renderLeaderboard(menuDiv) {
        const listElement = menuDiv.querySelector('#leaderboard-list');
        const statusElement = menuDiv.querySelector('#leaderboard-user-rank');
        const titleElement = menuDiv.querySelector('#leaderboard-title');
        const onlineTab = menuDiv.querySelector('#leaderboard-tab-online');
        const localTab = menuDiv.querySelector('#leaderboard-tab-local');

        if (!listElement || !statusElement || !titleElement) return;

        const isLocal = this.leaderboardView === 'local';
        titleElement.textContent = isLocal ? 'RANKING LOCAL / AMIGOS' : 'TOP 10 COMPETITIVO';
        onlineTab?.classList.toggle('active', !isLocal);
        localTab?.classList.toggle('active', isLocal);

        if (isLocal) {
            const localEntries = (this.leaderboardData.localEntries ?? []).slice(0, 10);
            listElement.innerHTML = localEntries.length > 0
                ? localEntries.map((entry, index) => this.createLocalLeaderboardRow(entry, index + 1)).join('')
                : '<p class="leaderboard-empty">Todavía no hay perfiles locales.</p>';
            statusElement.innerHTML = localEntries.length > 0
                ? `Perfiles guardados: <strong>${this.leaderboardData.localEntries.length}</strong>`
                : 'Crea una partida local para empezar a registrar amigos.';
            return;
        }

        if (this.leaderboardData.onlineError) {
            listElement.innerHTML = '<p class="leaderboard-empty">No se pudo cargar la clasificación.</p>';
            statusElement.textContent = this.leaderboardData.onlineStatus;
            return;
        }

        const onlineEntries = (this.leaderboardData.onlineEntries ?? []).slice(0, 10);
        listElement.innerHTML = onlineEntries.length > 0
            ? onlineEntries.map((entry, index) => this.createLeaderboardRow(entry, index + 1)).join('')
            : '<p class="leaderboard-empty">Cargando clasificación...</p>';
        statusElement.textContent = this.leaderboardData.onlineStatus;
    }

    createLeaderboardRow(entry, rank) {
        return `
            <div class="leaderboard-row">
                <span class="leaderboard-rank">#${rank}</span>
                <span class="leaderboard-name">${this.escapeHtml(entry.userName)}</span>
                <span class="leaderboard-score">${entry.winCount}</span>
            </div>
        `;
    }

    createLocalLeaderboardRow(entry, rank) {
        return `
            <div class="leaderboard-row">
                <span class="leaderboard-rank">#${rank}</span>
                <span class="leaderboard-name">${this.escapeHtml(entry.name)}</span>
                <span class="leaderboard-score">${this.escapeHtml(`${entry.wins}V · ${entry.losses}D · ${entry.gamesPlayed}PJ`)}</span>
            </div>
        `;
    }

    escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }
}
