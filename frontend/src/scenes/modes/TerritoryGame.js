import Phaser from 'phaser';
import { SnakeEngine } from '@shared/SnakeEngine.ts';
import { MAX_LIVES, TICK_MS } from '@shared/GameConfig';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';
import { loadLocalGameSettings, normalizeLocalGameSettings, saveLocalGameSettings } from '../../utils/localGameSettings.js';
import { applyPlayerThemeToHud, buildPlayerIdentityMap } from '../../utils/playerIdentity.js';
import { getLivesWinner, getScoreWinner } from '../gameOverRouting.js';
import { getTerritoryPlayers, shouldTerritoryMatchEndOnDeath } from '../territoryModeHelpers.js';
import { getControlsConfig } from '../../utils/controlsConfig.js';

const P1_ID = 'player1';
const P2_ID = 'player2';
const TERRITORY_MATCH_SECONDS = 60;

export class TerritoryGame extends Phaser.Scene {
    constructor() {
        super('TerritoryGame');
        this.isPaused = false;
    }

    init(data) {
        const fromStorage = loadLocalGameSettings();
        const merged = normalizeLocalGameSettings({ ...fromStorage, ...(data ?? {}), gameMode: 'territory' });
        const territoryPlayers = getTerritoryPlayers(merged);
        this.matchSettings = {
            ...merged,
            players: {
                ...merged.players,
                p1: { ...merged.players?.p1, ...territoryPlayers.p1 },
                p2: { ...merged.players?.p2, ...territoryPlayers.p2 },
            },
        };
        saveLocalGameSettings(this.matchSettings);
    }

    create() {
        this.boardRenderer = new SnakeBoardRenderer(this, { mapId: this.matchSettings?.mapId });
        this.cacheHudElements();
        this.createTimerDom();
        this.toggleHud(true);

        const difficulty = this.matchSettings?.difficulty ?? 'normal';
        const p1Cfg = this.matchSettings?.players?.p1 ?? {};
        const p2Cfg = this.matchSettings?.players?.p2 ?? {};

        this.engine = new SnakeEngine({ difficulty, territoryMode: true, maxLives: 1 });
        this.engine.addPlayer(P1_ID, { color: p1Cfg.color, skinId: p1Cfg.skinId, startCol: 8, startRow: 12 });
        this.engine.addPlayer(P2_ID, { color: p2Cfg.color, skinId: p2Cfg.skinId, startCol: 24, startRow: 12 });

        this.inputBuffers = { [P1_ID]: [], [P2_ID]: [] };

        const controls = getControlsConfig(localStorage);

        this.input.keyboard.on(`keydown-${controls.player1.up}`, () => this.pushDirection(P1_ID, 'up'));
        this.input.keyboard.on(`keydown-${controls.player1.left}`, () => this.pushDirection(P1_ID, 'left'));
        this.input.keyboard.on(`keydown-${controls.player1.down}`, () => this.pushDirection(P1_ID, 'down'));
        this.input.keyboard.on(`keydown-${controls.player1.right}`, () => this.pushDirection(P1_ID, 'right'));
        this.input.keyboard.on(`keydown-${controls.player2.up}`, () => this.pushDirection(P2_ID, 'up'));
        this.input.keyboard.on(`keydown-${controls.player2.left}`, () => this.pushDirection(P2_ID, 'left'));
        this.input.keyboard.on(`keydown-${controls.player2.down}`, () => this.pushDirection(P2_ID, 'down'));
        this.input.keyboard.on(`keydown-${controls.player2.right}`, () => this.pushDirection(P2_ID, 'right'));

        this.input.keyboard.on('keydown-ESC', () => {
            if (this.isPaused) return;
            this.isPaused = true;

            const state = this.engine.getState();
            this.scene.pause();
            this.scene.launch('Pause', {
                caller: 'TerritoryGame',
                p1Score: state.territoryCounts.get(P1_ID) || 0,
                p2Score: state.territoryCounts.get(P2_ID) || 0,
                p1Lives: state.players.get(P1_ID)?.lives ?? 0,
                p2Lives: state.players.get(P2_ID)?.lives ?? 0,
                players: buildPlayerIdentityMap(this.matchSettings),
                scoreLabel: 'Territorio',
            });
        });

        const runtimeConfig = this.engine.getConfig?.() ?? {};
        this.gameTimer = this.time.addEvent({
            delay: runtimeConfig.tickMs ?? TICK_MS,
            loop: true,
            callback: this.gameTick,
            callbackScope: this,
        });

        this.timeLeft = TERRITORY_MATCH_SECONDS;
        this.clockTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: this.updateClock,
            callbackScope: this,
        });

        this.resizeHandler = (gameSize) => this.updateLayout(gameSize.width, gameSize.height);
        this.scale.on('resize', this.resizeHandler);

        this.userMusicVol = parseFloat(localStorage.getItem('musicVolume')) || 0.2;
        this.userSfxVol = parseFloat(localStorage.getItem('sfxVolume')) || 0.7;
        const musicKey = localStorage.getItem('selectedMusic') || 'musica_in_game';
        this.music = this.sound.add(musicKey, { loop: true, volume: this.userMusicVol });
        this.music.play();

        this.events.on('shutdown', () => {
            if (this.music) this.music.stop();
            if (this.timerDiv) this.timerDiv.remove();
            this.scale.off('resize', this.resizeHandler);
            this.toggleHud(false);
            if (this.hudHelpWrap) this.hudHelpWrap.style.top = '';
        });

        this.events.on('pause', () => {
            if (this.music) this.music.pause();
        });
        this.events.on('resume', () => {
            this.isPaused = false;
            if (this.music) this.music.resume();
        });

        this.applyHudIdentity();
        this.updateLayout(this.scale.width, this.scale.height);
        this.renderState(this.engine.getState());

        this.time.delayedCall(0, () => {
            this.scene.pause();
            this.scene.launch('InitCounter', {
                caller: this.scene.key
            });
        });
    }

    createTimerDom() {
        this.timerDiv = document.createElement('div');
        this.timerDiv.id = 'territory-clock';
        this.timerDiv.className = 'position-absolute start-50 translate-middle-x text-white fw-bold px-5 py-2 rounded-pill shadow-lg text-center';
        this.timerDiv.style = 'background: linear-gradient(180deg, #0f4c5c, #0B081A); border: 4px solid #F67D31; font-size: 3.3rem; z-index: 1000; top: 15px; box-shadow: 0 0 30px rgba(246, 125, 49, 0.45); line-height: 1;';
        this.timerDiv.innerText = '01:00';
        document.getElementById('game-container')?.appendChild(this.timerDiv);

        if (this.hudHelpWrap) {
            this.hudHelpWrap.style.top = '112px';
        }
    }

    cacheHudElements() {
        this.hudRoot = document.getElementById('localgame-hud');
        this.hudJ1Score = document.getElementById('hud-j1-score');
        this.hudJ1ScoreBig = document.getElementById('hud-j1-score-big');
        this.hudJ1Lives = document.getElementById('hud-j1-lives');
        this.hudJ2Score = document.getElementById('hud-j2-score');
        this.hudJ2ScoreBig = document.getElementById('hud-j2-score-big');
        this.hudJ2Lives = document.getElementById('hud-j2-lives');
        this.hudHelp = document.getElementById('hud-help');
        this.hudHelpWrap = document.getElementById('hud-help-wrap');
        this.hudLeftPlayer = document.getElementById('hud-left-player');
        this.hudRightPlayer = document.getElementById('hud-right-player');

        this.updateLivesHud(this.hudJ1Lives, MAX_LIVES);
        this.updateLivesHud(this.hudJ2Lives, MAX_LIVES);
    }

    applyHudIdentity() {
        const p1Name = this.matchSettings?.players?.p1?.name ?? 'J1';
        const p2Name = this.matchSettings?.players?.p2?.name ?? 'J2';
        const p1Color = this.matchSettings?.players?.p1?.color;
        const p2Color = this.matchSettings?.players?.p2?.color;

        if (this.hudJ1Score) this.hudJ1Score.textContent = p1Name;
        if (this.hudJ2Score) this.hudJ2Score.textContent = p2Name;

        if (p1Color !== undefined) applyPlayerThemeToHud({ panelEl: this.hudLeftPlayer, titleEl: this.hudJ1Score, scoreEl: this.hudJ1ScoreBig, livesEl: this.hudJ1Lives, colorNumber: p1Color });
        if (p2Color !== undefined) applyPlayerThemeToHud({ panelEl: this.hudRightPlayer, titleEl: this.hudJ2Score, scoreEl: this.hudJ2ScoreBig, livesEl: this.hudJ2Lives, colorNumber: p2Color });

        if (this.hudHelp) {
            this.hudHelp.textContent = `Control de territorio | Pinta y roba casillas | ${p1Name} (WASD) vs ${p2Name} (Flechas) - ESC: Menu`;
        }
    }

    toggleHud(visible) {
        if (this.hudRoot) this.hudRoot.classList.toggle('d-none', !visible);
    }

    updateLayout(viewportWidth, viewportHeight) {
        const safePadding = 18;
        const helpHeight = this.hudHelpWrap ? this.hudHelpWrap.offsetHeight : 42;
        const topGap = 170;
        const sidePanelWidthLeft = this.hudLeftPlayer ? this.hudLeftPlayer.offsetWidth : 0;
        const sidePanelWidthRight = this.hudRightPlayer ? this.hudRightPlayer.offsetWidth : 0;
        const sideGap = 22;
        const metrics = this.boardRenderer.updateLayout({
            viewportWidth,
            viewportHeight,
            safePadding,
            sideGap,
            topGap,
            sidePanelWidthLeft,
            sidePanelWidthRight,
        });
        this.boardOffsetX = metrics.boardOffsetX;
        this.boardOffsetY = metrics.boardOffsetY;
        this.boardWidth = metrics.boardWidth;
        this.boardHeight = metrics.boardHeight;
        this.positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight);
    }

    positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight) {
        if (this.hudLeftPlayer) {
            const leftX = Math.floor(safePadding + (this.boardOffsetX - sideGap - safePadding - sidePanelWidthLeft) * 0.5);
            const leftY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudLeftPlayer.offsetHeight) * 0.5);
            this.hudLeftPlayer.style.left = `${leftX}px`;
            this.hudLeftPlayer.style.top = `${Math.max(8, leftY)}px`;
        }
        if (this.hudRightPlayer) {
            const rightX = Math.floor((this.boardOffsetX + this.boardWidth + sideGap) + (viewportWidth - safePadding - (this.boardOffsetX + this.boardWidth + sideGap) - sidePanelWidthRight) * 0.5);
            const rightY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudRightPlayer.offsetHeight) * 0.5);
            this.hudRightPlayer.style.left = `${rightX}px`;
            this.hudRightPlayer.style.top = `${Math.max(8, rightY)}px`;
        }
        if (this.hudHelpWrap) {
            this.hudHelpWrap.style.top = `${Math.max(92, this.boardOffsetY - helpHeight - 10)}px`;
            this.hudHelpWrap.style.left = '50%';
            this.hudHelpWrap.style.transform = 'translateX(-50%)';
        }
    }

    updateLivesHud(targetElement, lives) {
        if (!targetElement) return;
        const safeLives = Math.max(0, Math.min(MAX_LIVES, Number(lives) || 0));
        targetElement.innerHTML =
            '<span class="text-danger">&#10084;</span>'.repeat(safeLives) +
            '<span class="text-secondary opacity-50">&#10084;</span>'.repeat(MAX_LIVES - safeLives);
    }

    pushDirection(playerId, direction) {
        if (this.inputBuffers[playerId].length < 3) this.inputBuffers[playerId].push(direction);
    }

    handleInput() {
        [P1_ID, P2_ID].forEach((id) => {
            if (this.inputBuffers[id].length > 0) {
                this.engine.setNextDirection(id, this.inputBuffers[id].shift());
            }
        });
    }

    gameTick() {
        this.handleInput();

        const previousState = this.engine.getState();
        const previousP1 = previousState.players.get(P1_ID);
        const previousP2 = previousState.players.get(P2_ID);

        const state = this.engine.tick();
        const p1 = state.players.get(P1_ID);
        const p2 = state.players.get(P2_ID);

        if ((p1?.score || 0) > (previousP1?.score || 0) || (p2?.score || 0) > (previousP2?.score || 0)) {
            this.sound.play('eat_apple', { volume: this.userSfxVol * 0.7 });
        }

        if ((p1 && p1.lives < (previousP1?.lives || 0)) || (p2 && p2.lives < (previousP2?.lives || 0))) {
            this.sound.play('sonido_choque', { volume: this.userSfxVol });
        }

        if (shouldTerritoryMatchEndOnDeath(p1, p2)) {
            this.finishMatch('lives');
            return;
        }

        this.renderState(state);
    }

    updateClock() {
        if (this.isPaused) return;

        this.timeLeft--;
        const min = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
        const sec = String(this.timeLeft % 60).padStart(2, '0');
        if (this.timerDiv) this.timerDiv.innerText = `${min}:${sec}`;

        if (this.timeLeft <= 0) {
            this.finishMatch();
        }
    }

    renderState(state) {
        this.boardRenderer.renderState(state);

        const p1 = state.players.get(P1_ID);
        const p2 = state.players.get(P2_ID);
        const p1Territory = state.territoryCounts.get(P1_ID) || 0;
        const p2Territory = state.territoryCounts.get(P2_ID) || 0;

        if (this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${p1Territory}`;
        if (this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = `${p2Territory}`;
        if (p1) this.updateLivesHud(this.hudJ1Lives, p1.lives);
        if (p2) this.updateLivesHud(this.hudJ2Lives, p2.lives);
    }

    finishMatch(reason = 'territory') {
        if (this.gameTimer) this.gameTimer.remove();
        if (this.clockTimer) this.clockTimer.remove();

        const state = this.engine.getState();
        const p1 = state.players.get(P1_ID);
        const p2 = state.players.get(P2_ID);
        const p1Territory = state.territoryCounts.get(P1_ID) || 0;
        const p2Territory = state.territoryCounts.get(P2_ID) || 0;

        this.scene.start('GameOver', {
            winner: reason === 'lives' ? getLivesWinner(p1?.lives ?? 0, p2?.lives ?? 0) : getScoreWinner(p1Territory, p2Territory),
            p1Score: p1Territory,
            p1Lives: p1?.lives ?? 0,
            p2Score: p2Territory,
            p2Lives: p2?.lives ?? 0,
            reason,
            mode: 'territory',
            rematchScene: 'TerritoryGame',
            players: buildPlayerIdentityMap(this.matchSettings),
        });
    }
}
