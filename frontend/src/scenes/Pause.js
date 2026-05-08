import Phaser from 'phaser';
import {
    DEFAULT_MUSIC_KEY,
    getAudioSettings,
    saveMusicVolume,
    saveSelectedMusic,
    saveSfxVolume,
} from '../utils/audioSettings.js';
import { getPlayerCardTheme } from '../utils/playerIdentity.js';

const PAUSE_MUSIC_KEYS = ['musica_in_game', 'musica2', 'musica3'];

export class Pause extends Phaser.Scene {
    constructor() {
        super('Pause');
    }

    create(data) {
        const callerScene = data.caller || 'LocalGame';
        const callerGameScene = this.scene.get(callerScene);
        const audioSettings = getAudioSettings(localStorage, PAUSE_MUSIC_KEYS);
        const players = data?.players ?? {};
        const p1 = players.p1 ?? { label: 'Jugador 1', name: 'J1', color: 0xe74c3c };
        const p2 = players.p2 ?? { label: 'Jugador 2', name: 'J2', color: 0x3498db };
        const p1Theme = getPlayerCardTheme(p1.color);
        const p2Theme = getPlayerCardTheme(p2.color);

        const pauseDiv = document.createElement('div');
        pauseDiv.id = 'pause-screen';
        pauseDiv.style.position = 'fixed';
        pauseDiv.style.top = '0';
        pauseDiv.style.left = '0';
        pauseDiv.style.width = '100vw';
        pauseDiv.style.height = '100vh';
        pauseDiv.style.background = 'rgba(11,18,45,0.5)';
        pauseDiv.style.backdropFilter = 'blur(15px)';
        pauseDiv.style.zIndex = '1000';
        pauseDiv.style.display = 'flex';
        pauseDiv.style.alignItems = 'center';
        pauseDiv.style.justifyContent = 'center';
        pauseDiv.style.padding = '28px';
        pauseDiv.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

        const p1Score = data?.p1Score ?? 0;
        const p2Score = data?.p2Score ?? 0;
        const p1Lives = data?.p1Lives ?? 0;
        const p2Lives = data?.p2Lives ?? 0;
        const scoreLabel = data?.scoreLabel ?? 'Puntuacion';

        pauseDiv.innerHTML = `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-xl-6 col-lg-7 col-md-9">
                        <div class="card shadow" style="background: rgba(12, 18, 42, 0.95); border: 4px solid rgba(34, 211, 238, 0.45); border-radius: 28px; box-shadow: 0 26px 80px rgba(0,0,0,0.35);">
                            <div class="card-body p-5 text-center">
                                <h1 class="display-5 fw-bold text-white mb-2">PAUSA</h1>
                                <p class="text-white mb-4">Pulsa ESC o usa los botones para continuar.</p>

                                <div class="row gx-3 gy-3 mb-4">
                                    <div class="col-6">
                                        <div class="card h-100" style="background: ${p1Theme.gradient}; border: 2px solid ${p1Theme.softBorder}; border-radius: 18px;">
                                            <div class="card-body text-center py-4">
                                                <h5 class="fw-bold mb-3" style="color: ${p1Theme.textColor};">${p1.label}: ${p1.name}</h5>
                                                <div class="mb-3">
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">${scoreLabel}: ${p1Score}</span>
                                                </div>
                                                <div>
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">Vidas restantes: ${p1Lives}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="card h-100" style="background: ${p2Theme.gradient}; border: 2px solid ${p2Theme.softBorder}; border-radius: 18px;">
                                            <div class="card-body text-center py-4">
                                                <h5 class="fw-bold mb-3" style="color: ${p2Theme.textColor};">${p2.label}: ${p2.name}</h5>
                                                <div class="mb-3">
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">${scoreLabel}: ${p2Score}</span>
                                                </div>
                                                <div>
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">Vidas restantes: ${p2Lives}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="text-start rounded-4 p-4 mb-4" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);">
                                    <h2 class="h5 text-white text-center fw-bold mb-3">Sonido</h2>

                                    <div class="mb-3">
                                        <label for="pause-music-vol" class="form-label text-white fw-semibold mb-1 small">Musica</label>
                                        <input type="range" class="form-range" id="pause-music-vol" min="0" max="1" step="0.05" value="${audioSettings.musicVolume}">
                                    </div>

                                    <div class="mb-3">
                                        <label for="pause-sfx-vol" class="form-label text-white fw-semibold mb-1 small">Efectos SFX</label>
                                        <input type="range" class="form-range" id="pause-sfx-vol" min="0" max="1" step="0.05" value="${audioSettings.sfxVolume}">
                                    </div>

                                    <div>
                                        <label for="pause-music-select" class="form-label text-white fw-semibold mb-1 small">Pista</label>
                                        <select class="form-select form-select-sm bg-dark text-white border-secondary" id="pause-music-select">
                                            <option value="musica_in_game" ${audioSettings.selectedMusic === 'musica_in_game' ? 'selected' : ''}>Musica 1</option>
                                            <option value="musica2" ${audioSettings.selectedMusic === 'musica2' ? 'selected' : ''}>Musica 2</option>
                                            <option value="musica3" ${audioSettings.selectedMusic === 'musica3' ? 'selected' : ''}>Musica 3</option>
                                        </select>
                                    </div>
                                </div>

                                <div class="d-flex flex-column flex-sm-row justify-content-center gap-3">
                                    <button id="resume-btn" class="btn btn-lg px-5 py-3 fw-bold pixel-btn pixel-btn-accent" style="min-width: 180px;">Reanudar</button>
                                    <button id="menu-btn" class="btn btn-lg px-5 py-3 fw-bold pixel-btn pixel-btn-secondary" style="min-width: 180px;">Salir al Menu</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(pauseDiv);

        const musicSlider = pauseDiv.querySelector('#pause-music-vol');
        const sfxSlider = pauseDiv.querySelector('#pause-sfx-vol');
        const musicSelect = pauseDiv.querySelector('#pause-music-select');

        const removePauseOverlay = () => {
            if (document.body.contains(pauseDiv)) {
                document.body.removeChild(pauseDiv);
            }
        };

        const syncCallerSceneAudio = () => {
            if (!callerGameScene) return;

            const nextMusicVolume = parseFloat(musicSlider.value);
            const nextSfxVolume = parseFloat(sfxSlider.value);
            const nextMusicKey = musicSelect.value || DEFAULT_MUSIC_KEY;

            callerGameScene.userMusicVol = nextMusicVolume;
            callerGameScene.userSfxVol = nextSfxVolume;

            if (callerGameScene.music?.key !== nextMusicKey) {
                if (callerGameScene.music) {
                    callerGameScene.music.stop();
                    callerGameScene.music.destroy();
                }

                if (callerGameScene.cache?.audio?.exists?.(nextMusicKey)) {
                    callerGameScene.music = callerGameScene.sound.add(nextMusicKey, {
                        loop: true,
                        volume: nextMusicVolume,
                    });
                } else {
                    callerGameScene.music = null;
                }
            } else if (callerGameScene.music) {
                callerGameScene.music.setVolume(nextMusicVolume);
            }
        };

        const reanudarJuego = () => {
            removePauseOverlay();
            this.scene.stop();
            this.scene.resume(callerScene);
            if (callerGameScene) callerGameScene.isPaused = false;
        };

        musicSlider.addEventListener('input', () => {
            saveMusicVolume(localStorage, musicSlider.value);
            syncCallerSceneAudio();
        });

        sfxSlider.addEventListener('input', () => {
            saveSfxVolume(localStorage, sfxSlider.value);
            syncCallerSceneAudio();
        });

        musicSelect.addEventListener('change', () => {
            saveSelectedMusic(localStorage, musicSelect.value);
            syncCallerSceneAudio();
        });

        pauseDiv.querySelector('#resume-btn').addEventListener('click', reanudarJuego);

        pauseDiv.querySelector('#menu-btn').addEventListener('click', () => {
            removePauseOverlay();
            document.getElementById('hud-food-help')?.classList.add('d-none');
            this.scene.stop(callerScene);
            this.scene.start('MainMenu');
        });

        this.input.keyboard.on('keydown-ESC', reanudarJuego);
    }
}
