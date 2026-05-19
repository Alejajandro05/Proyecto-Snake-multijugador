import Phaser from 'phaser';
import { SnakeEngine, FOOD_CONFIG } from '@shared/SnakeEngine.ts';
import { GRID_COLS, GRID_ROWS } from '@shared/GameConfig.js';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';
import { DEFAULT_MUSIC_KEY, getAudioSettings } from '../../utils/audioSettings.js';
import { getControlsConfig } from '../../utils/controlsConfig.js';
import { applyPlayerThemeToHud } from '../../utils/playerIdentity.js';
import { loadSoloGameSettings, saveSoloGameSettings } from '../../utils/soloGameSettings.js';

const SOLO_MAX_LIVES = 1;
const SOLO_POISON_TTL_MS = 20_000;
/** ~32% kiwis (antes ~10% con pesos por defecto). */
const SOLO_FOOD_WEIGHTS = {
    apple: 48,
    grape: 12,
    speed: 8,
    poison: 32,
};

const PLAYER_ID = 'solo-player';

const INITIAL_TICK_MS = 115;
const MIN_TICK_MS = 65;
const SOLO_INITIAL_PLAYER_SPEED = 1;
const TICK_STEP_MS = 6;
const SPEED_RAMP_INTERVAL_MS = 22_000;
const OBSTACLE_EVERY_SCORE = 7;
const OBSTACLES_PER_RAMP = 2;
const MAX_EXTRA_OBSTACLES = 28;

export class SoloGame extends Phaser.Scene {
    constructor() {
        super('SoloGame');
    }

    init(data) {
        const fromStorage = loadSoloGameSettings();
        this.matchSettings = saveSoloGameSettings({ ...fromStorage, ...(data ?? {}) });
    }

    create() {
        this.isPaused = false;
        this.difficultyLevel = 1;
        this.currentTickMs = INITIAL_TICK_MS;
        this.obstaclesPlaced = 0;
        this.gameEnded = false;
        this.inputBuffers = [];

        this.boardRenderer = new SnakeBoardRenderer(this, { mapId: this.matchSettings.mapId });

        this.engine = new SnakeEngine({
            difficulty: 'easy',
            maxLives: SOLO_MAX_LIVES,
            tickMs: INITIAL_TICK_MS,
            foodCount: 10,
            obstaclesPerQuadrant: 3,
            poisonFoodTtlMs: SOLO_POISON_TTL_MS,
            foodWeightOverrides: SOLO_FOOD_WEIGHTS,
            wallCollision: true,
            initialPlayerSpeed: SOLO_INITIAL_PLAYER_SPEED,
        });

        this.engine.addPlayer(PLAYER_ID, {
            color: this.matchSettings.color,
            skinId: this.matchSettings.skinId,
            startCol: Math.floor(GRID_COLS / 2),
            startRow: Math.floor(GRID_ROWS / 2),
        });

        this.engine.events.on('playerEatFood', ({ food }) => {
            this.sound.play('eat_apple', { volume: (this.userSfxVol ?? 0.5) * 0.7 });
            this.showPlayerEffect(food);
        });

        const controls = getControlsConfig(localStorage);
        this.bindControls(controls);
        this.cacheHud();
        this.setupAudio();
        this.startGameLoop();
        this.scheduleDifficultyRamp();

        this.resizeHandler = (gameSize) => this.updateLayout(gameSize.width, gameSize.height);
        this.scale.on('resize', this.resizeHandler);
        this.updateLayout(this.scale.width, this.scale.height);

        this.events.on('shutdown', () => {
            this.scale.off('resize', this.resizeHandler);
            this.gameTimer?.remove();
            this.difficultyTimer?.remove();
            this.toggleHud(false);
            if (this.music) this.music.stop();
        });

        this.events.on('pause', () => { if (this.music) this.music.pause(); });
        this.events.on('resume', () => {
            this.isPaused = false;
            if (this.music?.isPaused) this.music.resume();
            else if (this.music && !this.music.isPlaying && this.userMusicVol > 0) this.music.play();
        });

        this.renderState(this.engine.getState());
    }

    bindControls(controls) {
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.isPaused) return;
            this.openPause();
        });

        const bind = (key, direction) => {
            this.input.keyboard.on(`keydown-${key}`, () => this.pushDirection(direction));
        };

        bind(controls.player1.up, 'up');
        bind(controls.player1.down, 'down');
        bind(controls.player1.left, 'left');
        bind(controls.player1.right, 'right');
    }

    cacheHud() {
        this.hudRoot = document.getElementById('localgame-hud');
        this.hudJ1Score = document.getElementById('hud-j1-score');
        this.hudJ1ScoreBig = document.getElementById('hud-j1-score-big');
        this.hudJ1Lives = document.getElementById('hud-j1-lives');
        this.hudJ1Effect = document.getElementById('hud-j1-effect');
        this.hudHelp = document.getElementById('hud-help');
        this.hudHelpWrap = document.getElementById('hud-help-wrap');
        this.hudLeftPlayer = document.getElementById('hud-left-player');
        this.hudRightPlayer = document.getElementById('hud-right-player');
        this.hudFoodHelp = document.getElementById('hud-food-help');

        if (this.hudRightPlayer) this.hudRightPlayer.classList.add('d-none');
        if (this.hudJ1Score) this.hudJ1Score.textContent = this.matchSettings.playerName;
        if (this.hudFoodHelp) {
            this.hudFoodHelp.classList.remove('d-none');
            this.hudFoodHelp.textContent = Object.values(FOOD_CONFIG).map((f) => f.hudHelp).join(' | ');
        }

        applyPlayerThemeToHud({
            panelEl: this.hudLeftPlayer,
            titleEl: this.hudJ1Score,
            scoreEl: this.hudJ1ScoreBig,
            livesEl: this.hudJ1Lives,
            colorNumber: this.matchSettings.color,
        });

        this.updateLivesHud(SOLO_MAX_LIVES);
        this.updateHudHelp();
        this.toggleHud(true);
    }

    setupAudio() {
        const audioSettings = getAudioSettings(localStorage);
        this.userMusicVol = audioSettings.musicVolume;
        this.userSfxVol = audioSettings.sfxVolume;
        const musicKey = this.cache.audio.exists(audioSettings.selectedMusic)
            ? audioSettings.selectedMusic
            : DEFAULT_MUSIC_KEY;
        this.music = this.sound.add(musicKey, { loop: true, volume: this.userMusicVol });
        if (this.userMusicVol > 0) this.music.play();
    }

    startGameLoop() {
        this.gameTimer = this.time.addEvent({
            delay: this.currentTickMs,
            loop: true,
            callback: this.gameTick,
            callbackScope: this,
        });
    }

    resetGameTimer() {
        if (this.gameTimer) this.gameTimer.remove();
        this.startGameLoop();
    }

    scheduleDifficultyRamp() {
        this.difficultyTimer = this.time.addEvent({
            delay: SPEED_RAMP_INTERVAL_MS,
            loop: true,
            callback: () => {
                if (this.isPaused) return;
                this.difficultyLevel += 1;
                this.currentTickMs = Math.max(MIN_TICK_MS, this.currentTickMs - TICK_STEP_MS);
                this.resetGameTimer();
                this.updateHudHelp();
            },
        });
    }

    pushDirection(direction) {
        if (this.isPaused || this.inputBuffers.length >= 3) return;
        this.inputBuffers.push(direction);
    }

    gameTick() {
        if (this.isPaused) return;

        const oldState = this.engine.getState();
        const oldPlayer = oldState.players.get(PLAYER_ID);
        const oldScore = oldPlayer?.score ?? 0;
        const oldLives = oldPlayer?.lives ?? 0;

        while (this.inputBuffers.length > 0) {
            this.engine.setNextDirection(PLAYER_ID, this.inputBuffers.shift());
        }

        const state = this.engine.tick();
        const player = state.players.get(PLAYER_ID);

        if ((player?.score ?? 0) > oldScore) {
            this.maybeRampObstacles(player?.score ?? 0);
        }

        if ((player?.lives ?? 0) < oldLives) {
            this.sound.play('sonido_choque', { volume: this.userSfxVol ?? 0.5 });
        }

        this.renderState(state);
    }

    maybeRampObstacles(score) {
        const milestones = Math.floor(score / OBSTACLE_EVERY_SCORE);
        const targetExtra = milestones * OBSTACLES_PER_RAMP;
        const toAdd = Math.min(targetExtra - this.obstaclesPlaced, OBSTACLES_PER_RAMP, MAX_EXTRA_OBSTACLES - this.obstaclesPlaced);
        if (toAdd <= 0) return;

        this.engine.addRandomObstacles(toAdd);
        this.obstaclesPlaced += toAdd;
        this.difficultyLevel += 1;
        this.updateHudHelp();
    }

    updateHudHelp() {
        if (!this.hudHelp) return;
        const mapId = this.matchSettings.mapId ?? 'arena';
        this.hudHelp.textContent = `Solitario | ${mapId} | Nivel ${this.difficultyLevel} | 1 vida | Paredes activas | WASD — ESC: Pausa`;
    }

    updateLivesHud(lives) {
        if (!this.hudJ1Lives) return;
        const safeLives = Math.max(0, Math.min(SOLO_MAX_LIVES, Number(lives) || 0));
        this.hudJ1Lives.innerHTML = '<span class="text-danger">&#10084;</span>'.repeat(safeLives)
            + '<span class="text-secondary opacity-50">&#10084;</span>'.repeat(SOLO_MAX_LIVES - safeLives);
    }

    toggleHud(visible) {
        if (this.hudRoot) this.hudRoot.classList.toggle('d-none', !visible);
    }

    updateLayout(viewportWidth, viewportHeight) {
        const safePadding = 18;
        const helpHeight = this.hudHelpWrap?.offsetHeight ?? 42;
        const topGap = helpHeight + 26;
        const sidePanelWidthLeft = this.hudLeftPlayer?.offsetWidth ?? 0;
        const sideGap = 22;
        const metrics = this.boardRenderer.updateLayout({
            viewportWidth,
            viewportHeight,
            safePadding,
            sideGap,
            topGap,
            sidePanelWidthLeft,
            sidePanelWidthRight: 0,
        });
        this.boardOffsetX = metrics.boardOffsetX;
        this.boardOffsetY = metrics.boardOffsetY;
        this.boardWidth = metrics.boardWidth;
        this.boardHeight = metrics.boardHeight;

        if (this.hudLeftPlayer) {
            const leftX = Math.floor(safePadding + (this.boardOffsetX - sideGap - safePadding - sidePanelWidthLeft) * 0.5);
            const leftY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudLeftPlayer.offsetHeight) * 0.5);
            this.hudLeftPlayer.style.left = `${Math.max(8, leftX)}px`;
            this.hudLeftPlayer.style.top = `${Math.max(8, leftY)}px`;
        }
        if (this.hudHelpWrap) {
            this.hudHelpWrap.style.top = `${Math.max(8, this.boardOffsetY - helpHeight - 10)}px`;
            this.hudHelpWrap.style.left = '50%';
            this.hudHelpWrap.style.transform = 'translateX(-50%)';
        }
    }

    showPlayerEffect(food) {
        if (!food || !this.hudJ1Effect) return;
        this.hudJ1Effect.textContent = food.hudEffect;
        if (this.effectTimeout) clearTimeout(this.effectTimeout);
        this.effectTimeout = setTimeout(() => {
            if (this.hudJ1Effect) this.hudJ1Effect.textContent = '';
        }, food.hudDuration ?? 2000);
    }

    renderState(state) {
        this.boardRenderer.renderState(state);
        const player = state.players.get(PLAYER_ID);
        if (!player) return;

        if (this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${player.score}`;
        this.updateLivesHud(player.lives);

        if (player.lives <= 0) {
            this.gameOver();
        }
    }

    openPause() {
        this.isPaused = true;
        const state = this.engine.getState();
        const player = state.players.get(PLAYER_ID);

        this.scene.pause();
        this.scene.launch('Pause', {
            caller: 'SoloGame',
            soloMode: true,
            p1Score: player?.score ?? 0,
            p2Score: 0,
            p1Lives: player?.lives ?? 0,
            p2Lives: 0,
            scoreLabel: 'Puntuación',
            players: {
                p1: {
                    label: 'Jugador',
                    name: this.matchSettings.playerName,
                    color: this.matchSettings.color,
                },
            },
        });
    }

    gameOver() {
        if (this.gameEnded) return;
        this.gameEnded = true;
        this.gameTimer?.remove();
        this.difficultyTimer?.remove();
        this.hudFoodHelp?.classList.add('d-none');

        const player = this.engine.getState().players.get(PLAYER_ID);
        const score = player?.score ?? 0;

        this.scene.start('GameOver', {
            winner: 'J1',
            reason: 'solo',
            soloMode: true,
            p1Name: this.matchSettings.playerName,
            p1Score: score,
            p1Lives: 0,
            p2Score: 0,
            p2Lives: 0,
            showLives: true,
            scoreLabel: 'Puntuación',
            mode: 'solo',
            rematchScene: 'SoloGame',
            rematchData: this.matchSettings,
            players: {
                p1: {
                    label: 'Jugador',
                    name: this.matchSettings.playerName,
                    color: this.matchSettings.color,
                },
            },
        });
    }
}
