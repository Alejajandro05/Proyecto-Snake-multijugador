import Phaser from 'phaser';
import { SnakeEngine } from '@shared/SnakeEngine.ts';
import { MAX_LIVES, TICK_MS } from '@shared/GameConfig';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';
import { loadLocalGameSettings, normalizeLocalGameSettings, saveLocalGameSettings } from '../../utils/localGameSettings.js';
import { applyPlayerThemeToHud, buildPlayerIdentityMap } from '../../utils/playerIdentity.js';
import { getLivesWinner, getScoreWinner } from '../gameOverRouting.js';
import { DEFAULT_MUSIC_KEY, getAudioSettings } from '../../utils/audioSettings.js';
import { recordLocalMatchResult } from '../../utils/localProfiles.js';
import { getControlsConfig } from '../../utils/controlsConfig.js';

const P1_ID = 'player1';
const P2_ID = 'player2';

/** Puntos para victoria por dominar la zona (el primero en llegar gana). */
const HILL_WIN_SCORE = 100;

/** Puntos por tick de engine si la cabeza está dentro de la zona. */
const HILL_POINTS_PER_TICK = 1;

/** Cada cuánto se elige una nueva posición aleatoria para la zona (ms). */
const HILL_ZONE_SHIFT_MS = 6000;

function getHillZoneDimensions(gridCols, gridRows) {
    let zoneW = Math.max(5, Math.floor(gridCols * 0.32));
    let zoneH = Math.max(4, Math.floor(gridRows * 0.28));
    zoneW = Math.min(zoneW, gridCols);
    zoneH = Math.min(zoneH, gridRows);
    return { zoneW, zoneH };
}

/**
 * Coloca un rectángulo zoneW×zoneH totalmente dentro del tablero, en una posición aleatoria.
 * Si `previous` existe, intenta no repetir la misma esquina superior izquierda.
 */
function randomHillCellBounds(gridCols, gridRows, zoneW, zoneH, previous) {
    const maxCol0 = gridCols - zoneW;
    const maxRow0 = gridRows - zoneH;

    if (maxCol0 < 0 || maxRow0 < 0) {
        const cx = Math.floor(gridCols / 2);
        const cy = Math.floor(gridRows / 2);
        let col0 = Math.max(0, cx - Math.floor(zoneW / 2));
        let row0 = Math.max(0, cy - Math.floor(zoneH / 2));
        col0 = Math.min(col0, Math.max(0, gridCols - zoneW));
        row0 = Math.min(row0, Math.max(0, gridRows - zoneH));
        return { col0, col1: col0 + zoneW - 1, row0, row1: row0 + zoneH - 1 };
    }

    let col0 = 0;
    let row0 = 0;
    for (let attempt = 0; attempt < 16; attempt++) {
        col0 = Math.floor(Math.random() * (maxCol0 + 1));
        row0 = Math.floor(Math.random() * (maxRow0 + 1));
        if (!previous || col0 !== previous.col0 || row0 !== previous.row0) break;
    }

    return { col0, col1: col0 + zoneW - 1, row0, row1: row0 + zoneH - 1 };
}

function headCell(head, gridSize) {
    const col = Math.round(head.x / gridSize);
    const row = Math.round(head.y / gridSize);
    return { col, row };
}

function isHeadInHill(player, gridSize, bounds) {
    if (!player?.alive || !player.segments?.length) return false;
    const { col, row } = headCell(player.segments[0], gridSize);
    return col >= bounds.col0 && col <= bounds.col1 && row >= bounds.row0 && row <= bounds.row1;
}

export class KingOfTheHillGame extends Phaser.Scene {
    constructor() {
        super('KingOfTheHillGame');
    }

    init(data) {
        const fromStorage = loadLocalGameSettings();
        const merged = normalizeLocalGameSettings({ ...fromStorage, ...(data ?? {}), gameMode: 'kingOfTheHill' });
        this.matchSettings = merged;
        saveLocalGameSettings(merged);
    }

    create() {
        this.boardRenderer = new SnakeBoardRenderer(this, {
            mapId: this.matchSettings?.mapId,
            gridCols: this.matchSettings?.boardCols,
            gridRows: this.matchSettings?.boardRows,
        });

        this.hillGraphics = this.add.graphics().setDepth(4);

        this.cacheHudElements();
        this.toggleHud(true);

        const difficulty = this.matchSettings?.difficulty ?? 'normal';
        const p1Cfg = this.matchSettings?.players?.p1 ?? {};
        const p2Cfg = this.matchSettings?.players?.p2 ?? {};

        this.engine = new SnakeEngine({
            difficulty,
            gridCols: this.matchSettings?.boardCols,
            gridRows: this.matchSettings?.boardRows,
            foodCount: this.matchSettings?.foodCount,
        });

        this.engine.addPlayer(P1_ID, { color: p1Cfg.color, skinId: p1Cfg.skinId, startCol: 8, startRow: 12 });
        this.engine.addPlayer(P2_ID, { color: p2Cfg.color, skinId: p2Cfg.skinId, startCol: 24, startRow: 12 });

        const cfg = this.engine.getConfig();
        const { zoneW, zoneH } = getHillZoneDimensions(cfg.gridCols, cfg.gridRows);
        this.hillZoneW = zoneW;
        this.hillZoneH = zoneH;
        this.hillBounds = randomHillCellBounds(cfg.gridCols, cfg.gridRows, zoneW, zoneH, null);

        this.inputBuffers = { [P1_ID]: [], [P2_ID]: [] };

        const controls = getControlsConfig(localStorage);

        this.isPaused = false;
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.isPaused) return;
            this.isPaused = true;

            const state = this.engine.getState();
            const p1 = state.players.get(P1_ID);
            const p2 = state.players.get(P2_ID);

            this.scene.pause();
            this.scene.launch('Pause', {
                caller: 'KingOfTheHillGame',
                p1Score: p1.score ?? 0,
                p2Score: p2.score ?? 0,
                p1Lives: p1.lives ?? 0,
                p2Lives: p2.lives ?? 0,
                players: buildPlayerIdentityMap(this.matchSettings),
            });
        });

        this.input.keyboard.on(`keydown-${controls.player1.up}`, () => this.pushDirection(P1_ID, 'up'));
        this.input.keyboard.on(`keydown-${controls.player1.left}`, () => this.pushDirection(P1_ID, 'left'));
        this.input.keyboard.on(`keydown-${controls.player1.down}`, () => this.pushDirection(P1_ID, 'down'));
        this.input.keyboard.on(`keydown-${controls.player1.right}`, () => this.pushDirection(P1_ID, 'right'));

        this.input.keyboard.on(`keydown-${controls.player2.up}`, () => this.pushDirection(P2_ID, 'up'));
        this.input.keyboard.on(`keydown-${controls.player2.left}`, () => this.pushDirection(P2_ID, 'left'));
        this.input.keyboard.on(`keydown-${controls.player2.down}`, () => this.pushDirection(P2_ID, 'down'));
        this.input.keyboard.on(`keydown-${controls.player2.right}`, () => this.pushDirection(P2_ID, 'right'));

        const runtimeConfig = this.engine.getConfig?.() ?? {};
        this.gameTimer = this.time.addEvent({
            delay: runtimeConfig.tickMs ?? TICK_MS,
            loop: true,
            callback: this.gameTick,
            callbackScope: this,
        });

        this.hillShiftTimer = this.time.addEvent({
            delay: HILL_ZONE_SHIFT_MS,
            loop: true,
            callback: () => {
                this.rollNewHillZone();
                this.redrawHillOverlay();
            },
            callbackScope: this,
        });

        this.resizeHandler = (gameSize) => this.updateLayout(gameSize.width, gameSize.height);
        this.scale.on('resize', this.resizeHandler);

        const audioSettings = getAudioSettings(localStorage);
        this.userMusicVol = audioSettings.musicVolume;
        this.userSfxVol = audioSettings.sfxVolume;

        const musicKey = this.cache.audio.exists(audioSettings.selectedMusic) ? audioSettings.selectedMusic : DEFAULT_MUSIC_KEY;
        this.music = this.sound.add(musicKey, { loop: true, volume: this.userMusicVol });
        if (this.userMusicVol > 0) this.music.play();

        this.events.on('shutdown', () => {
            if (this.music) this.music.stop();
            if (this.hillShiftTimer) this.hillShiftTimer.remove();
            this.scale.off('resize', this.resizeHandler);
            this.toggleHud(false);
            if (this.hillGraphics) this.hillGraphics.destroy();
        });

        this.events.on('pause', () => {
            if (this.music) this.music.pause();
        });
        this.events.on('resume', () => {
            this.isPaused = false;
            if (this.music?.isPaused) this.music.resume();
            else if (this.music && !this.music.isPlaying && this.userMusicVol > 0) this.music.play();
        });

        this.updateLayout(this.scale.width, this.scale.height);
        this.renderState(this.engine.getState());

        this.time.delayedCall(0, () => {
            this.scene.pause();
            this.scene.launch('InitCounter', {
                caller: this.scene.key
            });
        });
    }

    rollNewHillZone() {
        const cfg = this.engine.getConfig();
        this.hillBounds = randomHillCellBounds(
            cfg.gridCols,
            cfg.gridRows,
            this.hillZoneW,
            this.hillZoneH,
            this.hillBounds,
        );
    }

    redrawHillOverlay() {
        if (!this.hillGraphics || !this.hillBounds) return;

        const br = this.boardRenderer;
        const { col0, col1, row0, row1 } = this.hillBounds;
        const cs = br.cellSize;
        const bx = br.boardOffsetX;
        const by = br.boardOffsetY;

        const x = bx + col0 * cs;
        const y = by + row0 * cs;
        const w = (col1 - col0 + 1) * cs;
        const h = (row1 - row0 + 1) * cs;

        this.hillGraphics.clear();
        this.hillGraphics.fillStyle(0xf67d31, 0.2);
        this.hillGraphics.fillRect(x, y, w, h);
        this.hillGraphics.lineStyle(Math.max(2, Math.floor(cs * 0.08)), 0xf67d31, 0.65);
        this.hillGraphics.strokeRect(x + 1, y + 1, w - 2, h - 2);
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

        this.applyHudIdentity();

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
            this.hudHelp.textContent = `Meta ${HILL_WIN_SCORE} pts o ganar por vidas · ESC`;
        }
    }

    toggleHud(visible) {
        if (this.hudRoot) this.hudRoot.classList.toggle('d-none', !visible);
    }

    updateLayout(viewportWidth, viewportHeight) {
        const safePadding = 18;
        const helpHeight = this.hudHelpWrap ? this.hudHelpWrap.offsetHeight : 42;
        const topGap = helpHeight + 26;
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
        this.redrawHillOverlay();
    }

    positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight) {
        if (this.hudLeftPlayer) {
            const leftX = Math.floor(safePadding + (this.boardOffsetX - sideGap - safePadding - sidePanelWidthLeft) * 0.5);
            const leftY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudLeftPlayer.offsetHeight) * 0.5);
            this.hudLeftPlayer.style.left = `${leftX}px`;
            this.hudLeftPlayer.style.top = `${Math.max(8, leftY)}px`;
        }
        if (this.hudRightPlayer) {
            const rightX = Math.floor(
                (this.boardOffsetX + this.boardWidth + sideGap) +
                    (viewportWidth - safePadding - (this.boardOffsetX + this.boardWidth + sideGap) - sidePanelWidthRight) * 0.5,
            );
            const rightY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudRightPlayer.offsetHeight) * 0.5);
            this.hudRightPlayer.style.left = `${rightX}px`;
            this.hudRightPlayer.style.top = `${Math.max(8, rightY)}px`;
        }
        if (this.hudHelpWrap) {
            this.hudHelpWrap.style.top = `${Math.max(8, this.boardOffsetY - helpHeight - 10)}px`;
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

    applyHillCapture(state) {
        const gridSize = this.engine.getConfig().gridSize;
        [P1_ID, P2_ID].forEach((id) => {
            const p = state.players.get(id);
            if (!p || !p.alive) return;
            if (isHeadInHill(p, gridSize, this.hillBounds)) {
                p.score += HILL_POINTS_PER_TICK;
            }
        });
    }

    gameTick() {
        this.handleInput();

        const oldState = this.engine.getState();
        const p1Old = oldState.players.get(P1_ID);
        const p2Old = oldState.players.get(P2_ID);

        const score1 = p1Old?.score || 0;
        const score2 = p2Old?.score || 0;
        const lives1 = p1Old?.lives || 0;
        const lives2 = p2Old?.lives || 0;

        const state = this.engine.tick();

        const postEngineP1 = state.players.get(P1_ID)?.score ?? 0;
        const postEngineP2 = state.players.get(P2_ID)?.score ?? 0;

        if (postEngineP1 > score1 || postEngineP2 > score2) {
            this.sound.play('eat_apple', { volume: this.userSfxVol * 0.7 });
        }

        if (
            (state.players.get(P1_ID) && state.players.get(P1_ID).lives < lives1) ||
            (state.players.get(P2_ID) && state.players.get(P2_ID).lives < lives2)
        ) {
            this.sound.play('sonido_choque', { volume: this.userSfxVol });
        }

        this.applyHillCapture(state);

        this.renderState(state);
    }

    handleInput() {
        [P1_ID, P2_ID].forEach((id) => {
            if (this.inputBuffers[id].length > 0) this.engine.setNextDirection(id, this.inputBuffers[id].shift());
        });
    }

    renderState(state) {
        this.boardRenderer.renderState(state);
        const p1 = state.players.get(P1_ID);
        const p2 = state.players.get(P2_ID);
        if (p1 && this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${p1.score}`;
        if (p2 && this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = `${p2.score}`;
        if (p1) this.updateLivesHud(this.hudJ1Lives, p1.lives);
        if (p2) this.updateLivesHud(this.hudJ2Lives, p2.lives);

        if (p1.score >= HILL_WIN_SCORE || p2.score >= HILL_WIN_SCORE) this.gameOver(true);
        if (p1.lives <= 0 || p2.lives <= 0) this.gameOver(false);
    }

    gameOver(byScore) {
        if (this.gameTimer) this.gameTimer.remove();
        const state = this.engine.getState();
        const p1 = state.players.get(P1_ID);
        const p2 = state.players.get(P2_ID);
        const winner = byScore ? getScoreWinner(p1.score, p2.score) : getLivesWinner(p1.lives, p2.lives);
        const p1Name = this.matchSettings?.players?.p1?.name ?? 'Jugador 1';
        const p2Name = this.matchSettings?.players?.p2?.name ?? 'Jugador 2';
        recordLocalMatchResult(localStorage, { winner, p1Name, p2Name });
        this.scene.start('GameOver', {
            winner,
            p1Name,
            p2Name,
            p1Score: p1.score,
            p1Lives: p1.lives,
            p2Score: p2.score,
            p2Lives: p2.lives,
            reason: byScore ? 'hill' : 'lives',
            mode: 'kingOfTheHill',
            rematchScene: 'KingOfTheHillGame',
            players: buildPlayerIdentityMap(this.matchSettings),
        });
    }
}
