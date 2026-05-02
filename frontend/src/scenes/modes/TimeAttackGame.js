import Phaser from 'phaser';
import { SnakeEngine } from '@shared/SnakeEngine';
import { TICK_MS } from '@shared/GameConfig';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';
import { loadLocalGameSettings, normalizeLocalGameSettings, saveLocalGameSettings } from '../../utils/localGameSettings.js';
import { applyPlayerThemeToHud, buildPlayerIdentityMap } from '../../utils/playerIdentity.js';

const P1_ID = 'player1';
const P2_ID = 'player2';

export class TimeAttackGame extends Phaser.Scene {
    constructor() {
        super('TimeAttackGame');
        this.audioStateCache = new Map();
    }

    init(data) {
        const fromStorage = loadLocalGameSettings();
        const merged = normalizeLocalGameSettings({ ...fromStorage, ...(data ?? {}), gameMode: 'timeAttack' });
        this.matchSettings = merged;
        saveLocalGameSettings(merged);
    }

    create() {
        this.boardRenderer = new SnakeBoardRenderer(this);
        this.cacheHudElements();
        this.crearRelojDOM();
        this.toggleHud(true);

        this.engine = new SnakeEngine({ foodCount: 15, maxLives: 9999 });

        const p1Cfg = this.matchSettings?.players?.p1 ?? {};
        const p2Cfg = this.matchSettings?.players?.p2 ?? {};
        this.engine.addPlayer(P1_ID, { color: p1Cfg.color ?? 0xe74c3c, skinId: p1Cfg.skinId });
        this.engine.addPlayer(P2_ID, { color: p2Cfg.color ?? 0x3498db, skinId: p2Cfg.skinId });

        this.inputBuffers = { [P1_ID]: [], [P2_ID]: [] };

        this.input.keyboard.on('keydown-W', () => this.pushDirection(P1_ID, 'up'));
        this.input.keyboard.on('keydown-A', () => this.pushDirection(P1_ID, 'left'));
        this.input.keyboard.on('keydown-S', () => this.pushDirection(P1_ID, 'down'));
        this.input.keyboard.on('keydown-D', () => this.pushDirection(P1_ID, 'right'));

        this.input.keyboard.on('keydown-UP', () => this.pushDirection(P2_ID, 'up'));
        this.input.keyboard.on('keydown-LEFT', () => this.pushDirection(P2_ID, 'left'));
        this.input.keyboard.on('keydown-DOWN', () => this.pushDirection(P2_ID, 'down'));
        this.input.keyboard.on('keydown-RIGHT', () => this.pushDirection(P2_ID, 'right'));

        this.input.keyboard.on('keydown-ESC', () => {
            if (this.isPaused) return;
            this.isPaused = true;

            const state = this.engine.getState();
            this.scene.pause();
            this.scene.launch('Pause', {
                caller: 'TimeAttackGame',
                p1Score: state.players.get(P1_ID)?.score || 0,
                p2Score: state.players.get(P2_ID)?.score || 0,
                p1Lives: '∞',
                p2Lives: '∞',
                players: buildPlayerIdentityMap(this.matchSettings)
            });
        });

        this.configurarAudio();

        this.timeLeft = 60;
        this.isPaused = false;

        // VARIABLES DEL DESEMPATE
        this.isTiebreaker = false;
        this.tiebreakerScores = { [P1_ID]: 0, [P2_ID]: 0 };

        this.gameTimer = this.time.addEvent({ delay: TICK_MS, loop: true, callback: this.gameTick, callbackScope: this });
        this.clockTimer = this.time.addEvent({ delay: 1000, loop: true, callback: this.actualizarReloj, callbackScope: this });

        this.applyHudIdentity();
        this.updateLayout(this.scale.width, this.scale.height);
        this.scale.on('resize', (gameSize) => this.updateLayout(gameSize.width, gameSize.height));
    }

    pushDirection(playerId, direction) {
        if (this.inputBuffers[playerId].length < 3) {
            this.inputBuffers[playerId].push(direction);
        }
    }

    crearRelojDOM() {
        this.timerDiv = document.createElement('div');
        this.timerDiv.id = 'time-attack-clock';
        this.timerDiv.className = 'position-absolute start-50 translate-middle-x text-white fw-bold px-5 py-2 rounded-pill shadow-lg text-center';
        this.timerDiv.style = "background: linear-gradient(180deg, #1A05A2, #0B081A); border: 4px solid #F67D31; font-size: 4rem; z-index: 1000; top: 15px; box-shadow: 0 0 30px rgba(246, 125, 49, 0.8); line-height: 1; transition: all 0.3s ease;";
        this.timerDiv.innerText = '01:00';
        document.getElementById('game-container').appendChild(this.timerDiv);

        if (this.hudHelpWrap) {
            this.hudHelpWrap.style.top = '120px';
        }
    }

    configurarAudio() {
        this.userMusicVol = parseFloat(localStorage.getItem('musicVolume')) || 0.2;
        this.userSfxVol = parseFloat(localStorage.getItem('sfxVolume')) || 0.7;
        let musicKey = localStorage.getItem('selectedMusic') || 'musica_in_game';
        if (!this.cache.audio.exists(musicKey)) musicKey = 'musica_in_game';

        this.music = this.sound.add(musicKey, { loop: true, volume: this.userMusicVol });
        this.music.play();

        this.events.on('shutdown', () => {
            if (this.music) this.music.stop();
            if (this.timerDiv) this.timerDiv.remove();

            this.toggleHud(false);

            if (this.hudHelpWrap) {
                this.hudHelpWrap.style.top = '';
            }
        });

        this.events.on('resume', () => { this.isPaused = false; });
    }

    gameTick() {
        this.handleInput();
        const state = this.engine.tick();
        this.checkAudioAndPenalize(state);
        this.renderState(state);
    }

    handleInput() {
        [P1_ID, P2_ID].forEach(id => {
            if (this.inputBuffers[id] && this.inputBuffers[id].length > 0) {
                this.engine.setNextDirection(id, this.inputBuffers[id].shift());
            }
        });
    }

    checkAudioAndPenalize(state) {
        state.players.forEach((player, id) => {
            const old = this.audioStateCache.get(id) || { score: 0, lives: 9999 };

            if (player.score > old.score) {
                this.sound.play('eat_apple', { volume: this.userSfxVol * 0.7 });

                // --- LÓGICA DE MUERTE SÚBITA AL COMER ---
                if (this.isTiebreaker) {
                    this.tiebreakerScores[id]++;
                    this.actualizarHUDDesempate();

                    if (this.tiebreakerScores[id] >= 5) {
                        const winner = id === P1_ID ? 'J1' : 'J2';
                        this.finalizarPartida(winner, state);
                    }
                }
            }

            if (player.lives < old.lives) {
                this.sound.play('sonido_choque', { volume: this.userSfxVol });
                player.score = Math.floor(player.score / 2);
                if (this.inputBuffers) this.inputBuffers[id] = [];
            }

            this.audioStateCache.set(id, { score: player.score, lives: player.lives });
        });
    }

    actualizarReloj() {
        if (this.isPaused || this.isTiebreaker) return;

        this.timeLeft--;
        const min = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
        const sec = String(this.timeLeft % 60).padStart(2, '0');
        if (this.timerDiv) this.timerDiv.innerText = `${min}:${sec}`;

        // CUANDO EL TIEMPO LLEGA A 0
        if (this.timeLeft <= 0) {
            if (this.clockTimer) this.clockTimer.remove(); // Paramos el reloj numérico

            const state = this.engine.getState();
            const score1 = state.players.get(P1_ID)?.score || 0;
            const score2 = state.players.get(P2_ID)?.score || 0;

            if (score1 === score2) {
                this.iniciarDesempate(); // ¡A MUERTE SÚBITA!
            } else {
                this.finalizarPartida(score1 > score2 ? 'J1' : 'J2', state); // Hay ganador claro
            }
        }
    }

    iniciarDesempate() {
        this.isTiebreaker = true;

        // Cambiamos el diseño del reloj para modo Peligro/Muerte Súbita
        if (this.timerDiv) {
            this.timerDiv.style.fontSize = '2.5rem';
            this.timerDiv.style.background = 'linear-gradient(180deg, #990000, #330000)';
            this.timerDiv.style.borderColor = '#FFC107'; // Borde dorado/amarillo
            this.timerDiv.style.boxShadow = '0 0 30px rgba(255, 193, 7, 0.8)';
            this.actualizarHUDDesempate();
        }
    }

    actualizarHUDDesempate() {
        if (this.timerDiv) {
            const identities = buildPlayerIdentityMap(this.matchSettings);
            this.timerDiv.innerHTML = `<span style="color:${identities.p1.colorHex};">${this.tiebreakerScores[P1_ID]}</span> - <span style="color:${identities.p2.colorHex};">${this.tiebreakerScores[P2_ID]}</span> <br><span style="font-size: 1.2rem; color: #FFC107;">¡EL PRIMERO EN 5!</span>`;
        }
    }

    finalizarPartida(winner, state) {
        if (this.gameTimer) this.gameTimer.remove();

        const score1 = state.players.get(P1_ID)?.score || 0;
        const score2 = state.players.get(P2_ID)?.score || 0;

        this.scene.start('GameOver', {
            winner: winner,
            p1Score: score1,
            p2Score: score2,
            reason: this.isTiebreaker ? 'tiebreaker' : 'time',
            mode: 'timeAttack',
            rematchScene: 'TimeAttackGame',
            players: buildPlayerIdentityMap(this.matchSettings)
        });
    }

    renderState(state) {
        this.boardRenderer.renderState(state);
        if (this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = state.players.get(P1_ID)?.score || 0;
        if (this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = state.players.get(P2_ID)?.score || 0;
    }

    cacheHudElements() {
        this.hudRoot = document.getElementById('localgame-hud');
        this.hudJ1Score = document.getElementById('hud-j1-score');
        this.hudJ1ScoreBig = document.getElementById('hud-j1-score-big');
        this.hudJ2Score = document.getElementById('hud-j2-score');
        this.hudJ2ScoreBig = document.getElementById('hud-j2-score-big');
        this.hudHelpWrap = document.getElementById('hud-help-wrap');
        this.hudHelp = document.getElementById('hud-help');
        this.hudLeftPlayer = document.getElementById('hud-left-player');
        this.hudRightPlayer = document.getElementById('hud-right-player');
        const lives = [document.getElementById('hud-j1-lives'), document.getElementById('hud-j2-lives')];
        lives.forEach(l => { if (l) l.style.display = 'none'; });
    }

    applyHudIdentity() {
        const p1Name = this.matchSettings?.players?.p1?.name ?? 'J1';
        const p2Name = this.matchSettings?.players?.p2?.name ?? 'J2';
        const p1Color = this.matchSettings?.players?.p1?.color;
        const p2Color = this.matchSettings?.players?.p2?.color;

        if (this.hudJ1Score) this.hudJ1Score.textContent = p1Name;
        if (this.hudJ2Score) this.hudJ2Score.textContent = p2Name;

        if (p1Color !== undefined) applyPlayerThemeToHud({ panelEl: this.hudLeftPlayer, titleEl: this.hudJ1Score, scoreEl: this.hudJ1ScoreBig, colorNumber: p1Color });
        if (p2Color !== undefined) applyPlayerThemeToHud({ panelEl: this.hudRightPlayer, titleEl: this.hudJ2Score, scoreEl: this.hudJ2ScoreBig, colorNumber: p2Color });

        if (this.hudHelp) {
            this.hudHelp.textContent = `Contrarreloj | ${p1Name} (WASD) vs ${p2Name} (Flechas) — ESC: Menu`;
        }
    }

    toggleHud(v) { if (this.hudRoot) this.hudRoot.classList.toggle('d-none', !v); }

    updateLayout(w, h) {
        this.boardRenderer.updateLayout({
            viewportWidth: w,
            viewportHeight: h,
            safePadding: 18,
            sideGap: 22,
            topGap: 180,
            sidePanelWidthLeft: 0,
            sidePanelWidthRight: 0
        });
    }
}
