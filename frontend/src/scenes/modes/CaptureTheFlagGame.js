import Phaser from 'phaser';
import { SnakeEngine } from '@shared/SnakeEngine.ts';
import { GRID_SIZE, TICK_MS } from '@shared/GameConfig';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';
import { loadLocalGameSettings, normalizeLocalGameSettings, saveLocalGameSettings } from '../../utils/localGameSettings.js';
import { DEFAULT_MUSIC_KEY, getAudioSettings } from '../../utils/audioSettings.js';
import { recordLocalMatchResult } from '../../utils/localProfiles.js';
import { applyPlayerThemeToHud, buildPlayerIdentityMap } from '../../utils/playerIdentity.js';
import { getScoreWinner } from '../gameOverRouting.js';
import { shouldDieAtWall } from '../localModeHelpers.js';
import {
    CTF_PLAYER_IDS,
    cellsEqual,
    getCtfOpponentId,
    getCtfWinnerByCaptureLimit,
    isCellInsideBounds,
    isFlagAtHome,
} from '../captureTheFlagRules.js';

const P1_ID = 'player1';
const P2_ID = 'player2';
const CTF_CAPTURE_LIMIT = 3;
const CTF_MATCH_SECONDS = 180;
const RESPAWN_LIVES = 9999;

const DIRECTION_OFFSETS = {
    right: { col: 1, row: 0 },
    left: { col: -1, row: 0 },
    down: { col: 0, row: 1 },
    up: { col: 0, row: -1 },
};

const OPPOSITE_DIRECTION = {
    right: 'left',
    left: 'right',
    down: 'up',
    up: 'down',
};

export class CaptureTheFlagGame extends Phaser.Scene {
    constructor() {
        super('CaptureTheFlagGame');
    }

    init(data) {
        const fromStorage = loadLocalGameSettings();
        const merged = normalizeLocalGameSettings({ ...fromStorage, ...(data ?? {}), gameMode: 'captureTheFlag' });
        this.matchSettings = merged;
        saveLocalGameSettings(merged);
    }

    create() {
        this.boardRenderer = new SnakeBoardRenderer(this, {
            mapId: this.matchSettings?.mapId,
            gridCols: this.matchSettings?.boardCols,
            gridRows: this.matchSettings?.boardRows,
        });
        this.baseGraphics = this.add.graphics().setDepth(3);
        this.flagGraphics = this.add.graphics().setDepth(14);

        this.cacheHudElements();
        this.createClockDom();
        this.toggleHud(true);

        const difficulty = this.matchSettings?.difficulty ?? 'normal';
        const p1Cfg = this.matchSettings?.players?.p1 ?? {};
        const p2Cfg = this.matchSettings?.players?.p2 ?? {};

        this.engine = new SnakeEngine({
            difficulty,
            gridCols: this.matchSettings?.boardCols,
            gridRows: this.matchSettings?.boardRows,
            foodCount: 0,
            maxLives: RESPAWN_LIVES,
            obstaclesPerQuadrant: 0,
        });

        const cfg = this.engine.getConfig();
        this.configureBases(cfg);

        this.engine.addPlayer(P1_ID, {
            color: p1Cfg.color,
            skinId: p1Cfg.skinId,
            startCol: this.spawns[P1_ID].col,
            startRow: this.spawns[P1_ID].row,
        });
        this.engine.addPlayer(P2_ID, {
            color: p2Cfg.color,
            skinId: p2Cfg.skinId,
            startCol: this.spawns[P2_ID].col,
            startRow: this.spawns[P2_ID].row,
        });
        this.placePlayerAtSpawn(P1_ID);
        this.placePlayerAtSpawn(P2_ID);

        this.captureScores = { [P1_ID]: 0, [P2_ID]: 0 };
        this.flags = this.createInitialFlags();
        this.inputBuffers = { [P1_ID]: [], [P2_ID]: [] };
        this.lastStatusMessage = '';
        this.statusUntil = 0;
        this.timeLeft = CTF_MATCH_SECONDS;
        this.isPaused = false;
        this.matchFinished = false;

        this.bindInputs();

        const runtimeConfig = this.engine.getConfig?.() ?? {};
        this.gameTimer = this.time.addEvent({
            delay: runtimeConfig.tickMs ?? TICK_MS,
            loop: true,
            callback: this.gameTick,
            callbackScope: this,
        });
        this.clockTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: this.updateClock,
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
            if (this.gameTimer) this.gameTimer.remove();
            if (this.clockTimer) this.clockTimer.remove();
            if (this.timerDiv) this.timerDiv.remove();
            if (this.baseGraphics) this.baseGraphics.destroy();
            if (this.flagGraphics) this.flagGraphics.destroy();
            this.scale.off('resize', this.resizeHandler);
            this.toggleHud(false);
            this.restoreLivesHud();
            if (this.hudHelpWrap) this.hudHelpWrap.style.top = '';
        });

        this.events.on('pause', () => {
            if (this.music) this.music.pause();
        });
        this.events.on('resume', () => {
            this.isPaused = false;
            if (this.music?.isPaused) this.music.resume();
            else if (this.music && !this.music.isPlaying && this.userMusicVol > 0) this.music.play();
        });

        this.applyHudIdentity();
        this.updateClockHud();
        this.updateLayout(this.scale.width, this.scale.height);
        this.renderState(this.engine.getState());

        this.time.delayedCall(0, () => {
            this.scene.pause();
            this.scene.launch('InitCounter', {
                caller: this.scene.key
            });
        });
    }

    configureBases(cfg) {
        const centerRow = Math.floor(cfg.gridRows / 2);
        const halfHeight = 3;
        this.spawns = {
            [P1_ID]: { col: 4, row: centerRow, direction: 'right' },
            [P2_ID]: { col: cfg.gridCols - 5, row: centerRow, direction: 'left' },
        };
        this.bases = {
            [P1_ID]: {
                col0: 1,
                col1: 6,
                row0: Math.max(1, centerRow - halfHeight),
                row1: Math.min(cfg.gridRows - 2, centerRow + halfHeight),
            },
            [P2_ID]: {
                col0: cfg.gridCols - 7,
                col1: cfg.gridCols - 2,
                row0: Math.max(1, centerRow - halfHeight),
                row1: Math.min(cfg.gridRows - 2, centerRow + halfHeight),
            },
        };
        this.flagHomes = {
            [P1_ID]: { col: 2, row: centerRow },
            [P2_ID]: { col: cfg.gridCols - 3, row: centerRow },
        };
    }

    createInitialFlags() {
        return {
            [P1_ID]: {
                ownerId: P1_ID,
                home: { ...this.flagHomes[P1_ID] },
                position: { ...this.flagHomes[P1_ID] },
                carrierId: null,
                color: 0xe74c3c,
            },
            [P2_ID]: {
                ownerId: P2_ID,
                home: { ...this.flagHomes[P2_ID] },
                position: { ...this.flagHomes[P2_ID] },
                carrierId: null,
                color: 0x3498db,
            },
        };
    }

    bindInputs() {
        this.input.keyboard.on('keydown-W', () => this.pushDirection(P1_ID, 'up'));
        this.input.keyboard.on('keydown-A', () => this.pushDirection(P1_ID, 'left'));
        this.input.keyboard.on('keydown-S', () => this.pushDirection(P1_ID, 'down'));
        this.input.keyboard.on('keydown-D', () => this.pushDirection(P1_ID, 'right'));

        this.input.keyboard.on('keydown-UP', () => this.pushDirection(P2_ID, 'up'));
        this.input.keyboard.on('keydown-LEFT', () => this.pushDirection(P2_ID, 'left'));
        this.input.keyboard.on('keydown-DOWN', () => this.pushDirection(P2_ID, 'down'));
        this.input.keyboard.on('keydown-RIGHT', () => this.pushDirection(P2_ID, 'right'));

        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    }

    pauseGame() {
        if (this.isPaused) return;
        this.isPaused = true;

        this.scene.pause();
        this.scene.launch('Pause', {
            caller: 'CaptureTheFlagGame',
            p1Score: this.captureScores[P1_ID],
            p2Score: this.captureScores[P2_ID],
            p1Lives: '∞',
            p2Lives: '∞',
            players: buildPlayerIdentityMap(this.matchSettings),
            scoreLabel: 'Capturas',
        });
    }

    createClockDom() {
        this.timerDiv = document.createElement('div');
        this.timerDiv.id = 'ctf-clock';
        this.timerDiv.className = 'position-absolute start-50 translate-middle-x text-white fw-bold px-4 py-2 rounded-pill shadow-lg text-center';
        this.timerDiv.style = 'background: linear-gradient(180deg, #123b5d, #0B081A); border: 4px solid #F67D31; font-size: 2.6rem; z-index: 1000; top: 15px; box-shadow: 0 0 30px rgba(34, 211, 238, 0.45); line-height: 1;';
        document.getElementById('game-container')?.appendChild(this.timerDiv);

        if (this.hudHelpWrap) {
            this.hudHelpWrap.style.top = '112px';
        }
    }

    pushDirection(playerId, direction) {
        if (this.inputBuffers[playerId].length < 3) {
            this.inputBuffers[playerId].push(direction);
        }
    }

    handleInput() {
        CTF_PLAYER_IDS.forEach((id) => {
            if (this.inputBuffers[id].length > 0) {
                this.engine.setNextDirection(id, this.inputBuffers[id].shift());
            }
        });
    }

    gameTick() {
        if (this.matchFinished) return;
        this.handleInput();

        const before = this.capturePlayerSnapshots(this.engine.getState());
        this.applyWallDeaths(before);
        const state = this.engine.tick();

        this.handleFlagDrops(state, before);
        this.relocateRespawnsToBases(state, before);
        this.handleFlagInteractions(state);
        if (this.matchFinished) return;
        this.syncEngineScores(state);
        this.renderState(state);
    }

    capturePlayerSnapshots(state) {
        const cfg = this.engine.getConfig();
        const snapshots = {};
        CTF_PLAYER_IDS.forEach((id) => {
            const player = state.players.get(id);
            const head = player?.segments?.[0];
            const direction = player?.nextDirection ?? player?.direction ?? this.spawns?.[id]?.direction ?? 'right';
            const headCell = head ? this.segmentToCell(head, cfg.gridSize) : null;
            snapshots[id] = {
                alive: Boolean(player?.alive),
                lives: Number(player?.lives) || 0,
                direction,
                headCell,
                dropCell: this.getDropCell(headCell, direction, cfg),
            };
        });
        return snapshots;
    }

    applyWallDeaths(snapshots) {
        const cfg = this.engine.getConfig();
        const state = this.engine.getState();

        CTF_PLAYER_IDS.forEach((id) => {
            const player = state.players.get(id);
            const snapshot = snapshots[id];
            if (!player?.alive || !player.segments?.length || !snapshot) return;
            if (shouldDieAtWall(player.segments[0], snapshot.direction, cfg)) {
                this.engine.killPlayer(player);
            }
        });
    }

    handleFlagDrops(state, before) {
        CTF_PLAYER_IDS.forEach((id) => {
            const player = state.players.get(id);
            const wasAlive = before[id]?.alive;
            const lostLife = player && player.lives < before[id]?.lives;
            if (!wasAlive || !lostLife) return;

            this.sound.play('sonido_choque', { volume: this.userSfxVol });
            this.dropFlagCarriedBy(id, before[id]?.dropCell ?? before[id]?.headCell);
        });
    }

    relocateRespawnsToBases(state, before) {
        CTF_PLAYER_IDS.forEach((id) => {
            const player = state.players.get(id);
            if (!player?.alive || before[id]?.alive) return;
            this.placePlayerAtSpawn(id);
        });
    }

    handleFlagInteractions(state) {
        CTF_PLAYER_IDS.forEach((id) => {
            if (this.matchFinished) return;
            const player = state.players.get(id);
            if (!player?.alive || !player.segments?.length) return;

            const cell = this.segmentToCell(player.segments[0]);
            this.tryReturnOwnFlag(id, cell);
            this.tryPickEnemyFlag(id, cell);
            this.tryCaptureEnemyFlag(id, cell);
        });
    }

    tryReturnOwnFlag(playerId, cell) {
        const ownFlag = this.flags[playerId];
        if (ownFlag.carrierId || isFlagAtHome(ownFlag) || !cellsEqual(cell, ownFlag.position)) return;

        ownFlag.position = { ...ownFlag.home };
        this.announce(`${this.getPlayerShortName(playerId)} devuelve su bandera`);
        this.sound.play('eat_apple', { volume: this.userSfxVol * 0.5 });
    }

    tryPickEnemyFlag(playerId, cell) {
        const enemyFlag = this.flags[getCtfOpponentId(playerId)];
        if (enemyFlag.carrierId || !cellsEqual(cell, enemyFlag.position)) return;

        enemyFlag.carrierId = playerId;
        enemyFlag.position = null;
        this.announce(`${this.getPlayerShortName(playerId)} lleva la bandera rival`);
        this.sound.play('eat_apple', { volume: this.userSfxVol * 0.7 });
    }

    tryCaptureEnemyFlag(playerId, cell) {
        const enemyFlag = this.flags[getCtfOpponentId(playerId)];
        const ownFlag = this.flags[playerId];
        if (enemyFlag.carrierId !== playerId || !isCellInsideBounds(cell, this.bases[playerId])) return;

        if (!isFlagAtHome(ownFlag)) {
            this.announce('Tu bandera debe estar en base para puntuar');
            return;
        }

        this.captureScores[playerId] += 1;
        enemyFlag.carrierId = null;
        enemyFlag.position = { ...enemyFlag.home };
        this.announce(`${this.getPlayerShortName(playerId)} captura (${this.captureScores[playerId]}/${CTF_CAPTURE_LIMIT})`);
        this.sound.play('eat_apple', { volume: this.userSfxVol });

        const winner = getCtfWinnerByCaptureLimit(this.captureScores, CTF_CAPTURE_LIMIT);
        if (winner) {
            this.finishMatch(winner, 'ctfCaptures');
            return;
        }
    }

    dropFlagCarriedBy(playerId, fallbackCell) {
        Object.values(this.flags).forEach((flag) => {
            if (flag.carrierId !== playerId) return;
            flag.carrierId = null;
            flag.position = this.clampCellToBoard(fallbackCell ?? flag.home);
            this.announce('Bandera caída');
        });
    }

    getDropCell(headCell, direction, cfg) {
        if (!headCell) return null;
        const offset = DIRECTION_OFFSETS[direction] ?? DIRECTION_OFFSETS.right;
        const next = { col: headCell.col + offset.col, row: headCell.row + offset.row };
        if (next.col < 0 || next.row < 0 || next.col >= cfg.gridCols || next.row >= cfg.gridRows) {
            return { ...headCell };
        }
        return next;
    }

    clampCellToBoard(cell) {
        const cfg = this.engine.getConfig();
        return {
            col: Math.min(cfg.gridCols - 1, Math.max(0, Number(cell?.col) || 0)),
            row: Math.min(cfg.gridRows - 1, Math.max(0, Number(cell?.row) || 0)),
        };
    }

    syncEngineScores(state = this.engine.getState()) {
        CTF_PLAYER_IDS.forEach((id) => {
            const player = state.players.get(id);
            if (player) player.score = this.captureScores[id];
        });
    }

    updateClock() {
        if (this.isPaused || this.matchFinished) return;
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        this.updateClockHud();

        if (this.timeLeft <= 0) {
            const winner = getScoreWinner(this.captureScores[P1_ID], this.captureScores[P2_ID]);
            this.finishMatch(winner, 'ctfTime');
        }
    }

    announce(message) {
        this.lastStatusMessage = message;
        this.statusUntil = this.time.now + 1600;
        this.updateClockHud();
    }

    updateClockHud() {
        const min = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
        const sec = String(this.timeLeft % 60).padStart(2, '0');
        const status = this.time.now <= this.statusUntil ? this.lastStatusMessage : `Meta ${CTF_CAPTURE_LIMIT} capturas`;
        if (this.timerDiv) {
            this.timerDiv.innerHTML = `
                <span>${min}:${sec}</span>
                <span style="display:block; font-size: 0.95rem; margin-top: 4px; color: rgba(255,255,255,0.82);">${status}</span>
            `;
        }
    }

    segmentToCell(segment, gridSize = this.engine.getConfig().gridSize) {
        return {
            col: Math.round(segment.x / gridSize),
            row: Math.round(segment.y / gridSize),
        };
    }

    placePlayerAtSpawn(playerId) {
        const state = this.engine.getState();
        const player = state.players.get(playerId);
        const spawn = this.spawns[playerId];
        if (!player || !spawn) return;

        const offset = DIRECTION_OFFSETS[OPPOSITE_DIRECTION[spawn.direction]];
        player.segments = [];
        for (let i = 0; i < this.engine.getConfig().initialSnakeLength; i++) {
            player.segments.push({
                x: (spawn.col + offset.col * i) * GRID_SIZE,
                y: (spawn.row + offset.row * i) * GRID_SIZE,
            });
        }
        player.direction = spawn.direction;
        player.nextDirection = spawn.direction;
        player.speed = 1;
        player.moveCounter = 0;
        player.speedEffectRemaining = 0;
    }

    renderState(state) {
        this.boardRenderer.renderState(state);
        this.renderBases();
        this.renderFlags(state);
        this.updateHudScores();
        this.updateClockHud();
    }

    renderBases() {
        if (!this.baseGraphics || !this.bases) return;

        const br = this.boardRenderer;
        const cs = br.cellSize;
        const bx = br.boardOffsetX;
        const by = br.boardOffsetY;

        this.baseGraphics.clear();
        this.drawBase(P1_ID, bx, by, cs, 0xe74c3c);
        this.drawBase(P2_ID, bx, by, cs, 0x3498db);
    }

    drawBase(playerId, bx, by, cs, color) {
        const base = this.bases[playerId];
        const x = bx + base.col0 * cs;
        const y = by + base.row0 * cs;
        const w = (base.col1 - base.col0 + 1) * cs;
        const h = (base.row1 - base.row0 + 1) * cs;

        this.baseGraphics.fillStyle(color, 0.14);
        this.baseGraphics.fillRoundedRect(x, y, w, h, Math.max(4, Math.floor(cs * 0.18)));
        this.baseGraphics.lineStyle(Math.max(2, Math.floor(cs * 0.08)), color, 0.7);
        this.baseGraphics.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, Math.max(4, Math.floor(cs * 0.18)));
    }

    renderFlags(state) {
        if (!this.flagGraphics || !this.flags) return;

        this.flagGraphics.clear();
        Object.values(this.flags).forEach((flag) => {
            if (flag.carrierId) {
                const carrier = state.players.get(flag.carrierId);
                if (carrier?.alive && carrier.segments?.length) {
                    const cell = this.segmentToCell(carrier.segments[0]);
                    this.drawFlag(cell, flag.color, true);
                }
                return;
            }

            if (flag.position) {
                this.drawFlag(flag.position, flag.color, false);
            }
        });
    }

    drawFlag(cell, color, carried) {
        const br = this.boardRenderer;
        const cs = br.cellSize;
        const x = br.boardOffsetX + cell.col * cs + cs * 0.5;
        const y = br.boardOffsetY + cell.row * cs + cs * (carried ? 0.16 : 0.28);
        const poleTop = y - cs * 0.35;
        const poleBottom = y + cs * 0.42;

        this.flagGraphics.lineStyle(Math.max(2, Math.floor(cs * 0.08)), 0xf8fafc, 0.95);
        this.flagGraphics.lineBetween(x - cs * 0.22, poleTop, x - cs * 0.22, poleBottom);
        this.flagGraphics.fillStyle(color, 1);
        this.flagGraphics.fillTriangle(
            x - cs * 0.18,
            poleTop,
            x + cs * 0.28,
            poleTop + cs * 0.16,
            x - cs * 0.18,
            poleTop + cs * 0.34,
        );
        this.flagGraphics.fillStyle(0xffffff, carried ? 0.92 : 0.75);
        this.flagGraphics.fillCircle(x - cs * 0.22, poleTop, Math.max(2, cs * 0.08));
    }

    updateHudScores() {
        const p1HasFlag = this.flags[P2_ID]?.carrierId === P1_ID ? ' +F' : '';
        const p2HasFlag = this.flags[P1_ID]?.carrierId === P2_ID ? ' +F' : '';
        if (this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${this.captureScores[P1_ID]}${p1HasFlag}`;
        if (this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = `${this.captureScores[P2_ID]}${p2HasFlag}`;
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

        [this.hudJ1Lives, this.hudJ2Lives].forEach((el) => {
            if (el) el.style.display = 'none';
        });
    }

    restoreLivesHud() {
        [this.hudJ1Lives, this.hudJ2Lives].forEach((el) => {
            if (el) el.style.display = '';
        });
    }

    applyHudIdentity() {
        const p1Name = this.matchSettings?.players?.p1?.name ?? 'J1';
        const p2Name = this.matchSettings?.players?.p2?.name ?? 'J2';
        const p1Color = this.matchSettings?.players?.p1?.color;
        const p2Color = this.matchSettings?.players?.p2?.color;

        if (this.hudJ1Score) this.hudJ1Score.textContent = p1Name;
        if (this.hudJ2Score) this.hudJ2Score.textContent = p2Name;

        if (p1Color !== undefined) {
            applyPlayerThemeToHud({
                panelEl: this.hudLeftPlayer,
                titleEl: this.hudJ1Score,
                scoreEl: this.hudJ1ScoreBig,
                colorNumber: p1Color,
            });
        }
        if (p2Color !== undefined) {
            applyPlayerThemeToHud({
                panelEl: this.hudRightPlayer,
                titleEl: this.hudJ2Score,
                scoreEl: this.hudJ2ScoreBig,
                colorNumber: p2Color,
            });
        }

        if (this.hudHelp) {
            this.hudHelp.textContent = `Capture the Flag | ${p1Name} (WASD) vs ${p2Name} (Flechas) - ESC: Menu`;
        }
    }

    getPlayerShortName(playerId) {
        if (playerId === P1_ID) return this.matchSettings?.players?.p1?.name ?? 'J1';
        return this.matchSettings?.players?.p2?.name ?? 'J2';
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
        this.renderBases();
        this.renderFlags(this.engine.getState());
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
            this.hudHelpWrap.style.top = `${Math.max(92, this.boardOffsetY - helpHeight - 10)}px`;
            this.hudHelpWrap.style.left = '50%';
            this.hudHelpWrap.style.transform = 'translateX(-50%)';
        }
    }

    finishMatch(winner, reason) {
        if (this.matchFinished) return;
        this.matchFinished = true;
        if (this.gameTimer) this.gameTimer.remove();
        if (this.clockTimer) this.clockTimer.remove();

        const p1Name = this.matchSettings?.players?.p1?.name ?? 'Jugador 1';
        const p2Name = this.matchSettings?.players?.p2?.name ?? 'Jugador 2';
        recordLocalMatchResult(localStorage, { winner, p1Name, p2Name });

        this.scene.start('GameOver', {
            winner,
            p1Name,
            p2Name,
            p1Score: this.captureScores[P1_ID],
            p2Score: this.captureScores[P2_ID],
            p1Lives: '∞',
            p2Lives: '∞',
            reason,
            mode: 'captureTheFlag',
            rematchScene: 'CaptureTheFlagGame',
            players: buildPlayerIdentityMap(this.matchSettings),
            scoreLabel: 'Capturas',
            showLives: false,
        });
    }
}
