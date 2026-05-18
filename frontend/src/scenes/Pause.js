import Phaser from 'phaser';
import {
    DEFAULT_MUSIC_KEY,
    getAudioSettings,
    saveMusicVolume,
    saveSelectedMusic,
    saveSfxVolume,
} from '../utils/audioSettings.js';
import { getPlayerCardTheme } from '../utils/playerIdentity.js';
import {
    arcadeButton,
    buildArcadeScreenStyles,
    mountArcadeOverlay,
    unmountArcadeOverlay,
} from '../ui/arcadeScreenStyles.js';

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

        const p1Score = data?.p1Score ?? 0;
        const p2Score = data?.p2Score ?? 0;
        const p1Lives = data?.p1Lives ?? 0;
        const p2Lives = data?.p2Lives ?? 0;
        const scoreLabel = data?.scoreLabel ?? 'Puntuación';

        const pauseDiv = document.createElement('div');
        pauseDiv.id = 'pause-screen';

        pauseDiv.innerHTML = `
            <style>${buildArcadeScreenStyles('#pause-screen', { duelBackground: true, arcadeEnhanced: true })}</style>
            <article class="arcade-card arcade-screen-card" aria-label="Menú de pausa">
                <header class="arcade-screen-header">
                    <span class="arcade-screen-badge">Partida en pausa</span>
                    <h1 class="arcade-title">PAUSA</h1>
                    <p class="arcade-subtitle">Pulsa ESC o usa los botones para continuar.</p>
                </header>

                <div class="arcade-players">
                    <div class="arcade-player-card" style="--player-accent:${p1Theme.accentHex};">
                        <p class="arcade-player-name"><span class="player-color-tag">${p1.label}</span>: ${p1.name}</p>
                        <span class="arcade-stat">${scoreLabel}: ${p1Score}</span>
                        <span class="arcade-stat">Vidas: ${p1Lives}</span>
                    </div>
                    <div class="arcade-player-card" style="--player-accent:${p2Theme.accentHex};">
                        <p class="arcade-player-name"><span class="player-color-tag">${p2.label}</span>: ${p2.name}</p>
                        <span class="arcade-stat">${scoreLabel}: ${p2Score}</span>
                        <span class="arcade-stat">Vidas: ${p2Lives}</span>
                    </div>
                </div>

                <section class="arcade-section" aria-label="Ajustes de sonido">
                    <h2 class="arcade-section-title">Sonido</h2>
                    <label class="arcade-label" for="pause-music-vol">Música</label>
                    <input type="range" class="form-range mb-3" id="pause-music-vol" min="0" max="1" step="0.05" value="${audioSettings.musicVolume}">
                    <label class="arcade-label" for="pause-sfx-vol">Efectos SFX</label>
                    <input type="range" class="form-range mb-3" id="pause-sfx-vol" min="0" max="1" step="0.05" value="${audioSettings.sfxVolume}">
                    <label class="arcade-label" for="pause-music-select">Pista</label>
                    <select class="form-select form-select-sm" id="pause-music-select">
                        <option value="musica_in_game" ${audioSettings.selectedMusic === 'musica_in_game' ? 'selected' : ''}>Música 1</option>
                        <option value="musica2" ${audioSettings.selectedMusic === 'musica2' ? 'selected' : ''}>Música 2</option>
                        <option value="musica3" ${audioSettings.selectedMusic === 'musica3' ? 'selected' : ''}>Música 3</option>
                    </select>
                </section>

                <div class="arcade-actions is-row">
                    ${arcadeButton('resume-btn', 'REANUDAR', 'primary')}
                    ${arcadeButton('menu-btn', 'SALIR AL MENÚ', 'secondary')}
                </div>
            </article>
        `;


        mountArcadeOverlay(pauseDiv);

        const musicSlider = pauseDiv.querySelector('#pause-music-vol');
        const sfxSlider = pauseDiv.querySelector('#pause-sfx-vol');
        const musicSelect = pauseDiv.querySelector('#pause-music-select');

        const removePauseOverlay = () => unmountArcadeOverlay(pauseDiv);

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

        pauseDiv.querySelector('#resume-btn')?.addEventListener('click', reanudarJuego);

        pauseDiv.querySelector('#menu-btn')?.addEventListener('click', () => {
            removePauseOverlay();
            document.getElementById('hud-food-help')?.classList.add('d-none');
            this.scene.stop(callerScene);
            this.scene.start('MainMenu');
        });

        this.input.keyboard.on('keydown-ESC', reanudarJuego);
    }
}
