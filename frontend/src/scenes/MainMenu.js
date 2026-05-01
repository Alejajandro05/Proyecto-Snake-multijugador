import Phaser from 'phaser';
import { getCurrentUser } from '../services/firebaseAuthService.js';
import { LeaderboardService } from '../services/LeaderboardService.js';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
        this.musicTimeout = null;
        this.lastSfxTime = 0;
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

        const savedMusicVol = localStorage.getItem('musicVolume') !== null ? parseFloat(localStorage.getItem('musicVolume')) : 0.2;
        const savedSfxVol = localStorage.getItem('sfxVolume') !== null ? parseFloat(localStorage.getItem('sfxVolume')) : 0.7;
        const savedMusicKey = localStorage.getItem('selectedMusic') || 'musica_in_game';

        this.menuMusic = this.sound.add(savedMusicKey, { loop: true, volume: savedMusicVol });

        const menuDiv = document.createElement('div');
        menuDiv.id = 'main-menu-overlay';
        menuDiv.className = 'position-absolute top-0 start-0 w-100 h-100';
        menuDiv.style.zIndex = '1000';
        menuDiv.style.overflow = 'hidden';

        // Menú centrado sobre el fondo.
        menuDiv.innerHTML = `
            <style>
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

                #main-menu-overlay .leaderboard-title {
                    margin: 0 0 12px;
                    color: #FDE68A;
                    font-size: 1.05rem;
                    font-weight: 800;
                    letter-spacing: 0;
                    text-align: center;
                    text-transform: uppercase;
                }

                #main-menu-overlay .leaderboard-list {
                    display: flex;
                    flex-direction: column;
                    gap: 7px;
                    margin-bottom: 12px;
                }

                #main-menu-overlay .leaderboard-row {
                    display: grid;
                    grid-template-columns: 38px minmax(0, 1fr) 58px;
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
            <div id="pantalla-principal" class="w-100 h-100 position-relative">
                
                <div class="position-absolute top-50 start-50 translate-middle d-flex flex-column align-items-center" style="margin-top: -50px; width: 100%; max-width: 400px;">
                    <h1 class="display-1 fw-bold text-white mb-5 text-center" style="font-family: 'Teko', sans-serif; text-shadow: 0px 4px 20px #F67D31, 0px 0px 10px #F67D31; letter-spacing: 2px;">
                        SNAKE CLASH
                    </h1>
                    
                    <div class="d-flex flex-column gap-3 w-100 align-items-center">
                        <button id="btn-local" class="btn text-white fw-bold shadow menu-btn w-100" style="padding: 14px; background-color: #DE1A58; border: 2px solid #F67D31; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: all 0.2s ease; max-width: 280px;">
                            🎮 JUEGO LOCAL
                        </button>
                        
                        <button id="btn-online" class="btn text-white fw-bold shadow menu-btn w-100" style="padding: 14px; background-color: #8F0177; border: 2px solid #F67D31; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: all 0.2s ease; max-width: 280px;">
                            🌐 1 VS 1 ONLINE
                        </button>

                        <button id="btn-opciones" class="btn text-white fw-bold shadow menu-btn w-100" style="padding: 14px; background-color: #1A05A2; border: 2px solid #F67D31; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.2rem; transition: all 0.2s ease; max-width: 280px;">
                            ⚙️ OPCIONES
                        </button>
                    </div>
                </div>

                <aside class="leaderboard-panel" aria-label="Tabla de clasificación">
                    <h2 class="leaderboard-title">TOP 10 JUGADORES</h2>
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

                <button id="btn-volver" class="btn text-white fw-bold shadow mt-3 menu-btn" style="width: 100%; padding: 12px; background-color: #334155; border: 2px solid #94A3B8; border-radius: 12px; font-family: 'Montserrat', sans-serif; font-size: 1.1rem;">
                    VOLVER
                </button>
            </div>
        `;

        document.getElementById('game-container').appendChild(menuDiv);
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

        document.getElementById('btn-local').addEventListener('click', () => {
            detenerAudioPrueba();
            clearMenu();
            this.scene.start('LocalGameSetup', { gameMode: 'classic' });
        });

        document.getElementById('btn-online').addEventListener('click', () => {
            detenerAudioPrueba();
            clearMenu();
            this.scene.start('OnlineMenu');
        });

        document.getElementById('btn-opciones').addEventListener('click', () => {
            pantallaPrincipal.classList.add('d-none');
            pantallaOpciones.classList.remove('d-none');
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
            localStorage.setItem('musicVolume', vol);
            this.menuMusic.setVolume(vol);
            if (!this.menuMusic.isPlaying) this.menuMusic.play();
            if (this.musicTimeout) clearTimeout(this.musicTimeout);
            this.musicTimeout = setTimeout(() => { this.menuMusic.pause(); }, 2000);
        });

        sliderSfx.addEventListener('input', (e) => {
            const vol = parseFloat(e.target.value);
            localStorage.setItem('sfxVolume', vol);
            if (this.time.now > this.lastSfxTime + 150) {
                this.sound.play('sonido_choque', { volume: vol });
                this.lastSfxTime = this.time.now;
            }
        });

        const elementsToHover = document.querySelectorAll('.menu-btn, .arcade-card');
        elementsToHover.forEach(el => {
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
            localStorage.setItem('selectedMusic', newKey);
            if (this.menuMusic.isPlaying || this.musicTimeout) {
                this.menuMusic.stop();
                this.menuMusic = this.sound.add(newKey, { loop: true, volume: parseFloat(sliderMusic.value) });
                this.menuMusic.play();
                if (this.musicTimeout) clearTimeout(this.musicTimeout);
                this.musicTimeout = setTimeout(() => { this.menuMusic.pause(); }, 2000);
            } else {
                this.menuMusic = this.sound.add(newKey, { loop: true, volume: parseFloat(sliderMusic.value) });
            }
        });
    }

    async loadLeaderboard(menuDiv) {
        const listElement = menuDiv.querySelector('#leaderboard-list');
        const userRankElement = menuDiv.querySelector('#leaderboard-user-rank');

        try {
            const [entries, currentUser] = await Promise.all([
                LeaderboardService.getAll(),
                getCurrentUser(),
            ]);

            if (!menuDiv.isConnected) return;

            const sortedEntries = entries
                .filter((entry) => entry && entry.userName)
                .sort((first, second) => second.winCount - first.winCount || first.userName.localeCompare(second.userName));

            const topEntries = sortedEntries.slice(0, 10);
            listElement.innerHTML = topEntries.length > 0
                ? topEntries.map((entry, index) => this.createLeaderboardRow(entry, index + 1)).join('')
                : '<p class="leaderboard-empty">Todavía no hay jugadores.</p>';

            if (!currentUser) {
                userRankElement.textContent = 'Inicia sesión para ver tu puesto.';
                return;
            }

            const userName = this.getUserNameFromFirebaseUser(currentUser);
            const userIndex = sortedEntries.findIndex((entry) => entry.userName === userName);

            userRankElement.textContent = userIndex >= 0
                ? `Tu puesto: #${userIndex + 1}`
                : 'Aún no tienes puesto. Gana una partida.';
        } catch (error) {
            console.error('Could not load leaderboard.', error);
            if (!menuDiv.isConnected) return;
            listElement.innerHTML = '<p class="leaderboard-empty">No se pudo cargar la clasificación.</p>';
            userRankElement.textContent = 'Inténtalo de nuevo más tarde.';
        }
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

    getUserNameFromFirebaseUser(user) {
        const emailUserName = String(user?.email ?? '').split('@')[0]?.trim();
        const displayName = String(user?.displayName ?? '').trim();
        return displayName || emailUserName || '';
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
