import Phaser from 'phaser';
import { SnakeEngine } from '@shared/SnakeEngine.ts';
import { GRID_SIZE, TICK_MS } from '@shared/GameConfig';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';
import { loadLocalGameSettings, normalizeLocalGameSettings, saveLocalGameSettings } from '../../utils/localGameSettings.js';
import { DEFAULT_MUSIC_KEY, getAudioSettings } from '../../utils/audioSettings.js';
import { recordLocalMatchResult } from '../../utils/localProfiles.js';
import { getScoreWinner } from '../gameOverRouting.js';
import { shouldDieAtWall } from '../localModeHelpers.js';
import {
    CTF_2V2_PLAYER_IDS,
    CTF_2V2_TEAMS,
    cellsEqual,
    getCtf2v2TeamOf,
    getCtf2v2EnemyTeam,
    getCtf2v2WinnerByCaptureLimit,
    isCellInsideBounds,
    isFlagAtHome,
} from '../captureTheFlagRules.js';

const CTF_CAPTURE_LIMIT = 3;
const CTF_MATCH_SECONDS = 180;
const RESPAWN_LIVES = 9999;

const DIRECTION_OFFSETS = {
    right: { col: 1, row: 0 },
    left:  { col: -1, row: 0 },
    down:  { col: 0, row: 1 },
    up:    { col: 0, row: -1 },
};
const OPPOSITE_DIRECTION = { right: 'left', left: 'right', down: 'up', up: 'down' };

// Controls: p1=WASD  p2=TFGH  p3=IJKL  p4=Arrows
const KEY_MAP = {
    W: { id: 'p1', dir: 'up' },    A: { id: 'p1', dir: 'left' },
    S: { id: 'p1', dir: 'down' },  D: { id: 'p1', dir: 'right' },
    T: { id: 'p2', dir: 'up' },    F: { id: 'p2', dir: 'left' },
    G: { id: 'p2', dir: 'down' },  H: { id: 'p2', dir: 'right' },
    I: { id: 'p3', dir: 'up' },    J: { id: 'p3', dir: 'left' },
    K: { id: 'p3', dir: 'down' },  L: { id: 'p3', dir: 'right' },
    UP:    { id: 'p4', dir: 'up' },    LEFT:  { id: 'p4', dir: 'left' },
    DOWN:  { id: 'p4', dir: 'down' },  RIGHT: { id: 'p4', dir: 'right' },
};

const TEAM_COLORS = { teamA: 0xe74c3c, teamB: 0x3498db };

// Spawn positions — left side = teamA, right side = teamB
function buildSpawns(cfg) {
    const midRow = Math.floor(cfg.gridRows / 2);
    return {
        p1: { col: 3,                   row: midRow - 2, direction: 'right' },
        p2: { col: 3,                   row: midRow + 2, direction: 'right' },
        p3: { col: cfg.gridCols - 4,    row: midRow - 2, direction: 'left'  },
        p4: { col: cfg.gridCols - 4,    row: midRow + 2, direction: 'left'  },
    };
}

function buildBases(cfg) {
    const midRow = Math.floor(cfg.gridRows / 2);
    const half  = 4;
    return {
        teamA: { col0: 1, col1: 7,                   row0: Math.max(1, midRow - half), row1: Math.min(cfg.gridRows - 2, midRow + half) },
        teamB: { col0: cfg.gridCols - 8, col1: cfg.gridCols - 2, row0: Math.max(1, midRow - half), row1: Math.min(cfg.gridRows - 2, midRow + half) },
    };
}

function buildFlagHomes(cfg) {
    const midRow = Math.floor(cfg.gridRows / 2);
    return {
        teamA: { col: 2,                row: midRow },
        teamB: { col: cfg.gridCols - 3, row: midRow },
    };
}

export class CaptureTheFlagGame2v2 extends Phaser.Scene {
    constructor() { super('CaptureTheFlagGame2v2'); }

    init(data) {
        const fromStorage = loadLocalGameSettings();
        const merged = normalizeLocalGameSettings({ ...fromStorage, ...(data ?? {}), gameMode: 'ctf2v2' });
        this.matchSettings = merged;
        saveLocalGameSettings(merged);
    }

    create() {
        this.boardRenderer = new SnakeBoardRenderer(this, { mapId: this.matchSettings?.mapId });
        this.baseGraphics = this.add.graphics().setDepth(3);
        this.flagGraphics = this.add.graphics().setDepth(14);

        this.cacheHudElements();
        this.createClockDom();
        this.toggleHud(true);

        const difficulty = this.matchSettings?.difficulty ?? 'normal';

        this.engine = new SnakeEngine({
            difficulty,
            foodCount: 0,
            maxLives: RESPAWN_LIVES,
            obstaclesPerQuadrant: 0,
        });

        const cfg = this.engine.getConfig();
        this.spawns    = buildSpawns(cfg);
        this.bases     = buildBases(cfg);
        this.flagHomes = buildFlagHomes(cfg);

        const playerCfgs = this.matchSettings?.players ?? {};
        CTF_2V2_PLAYER_IDS.forEach((id) => {
            const pcfg = playerCfgs[id] ?? {};
            this.engine.addPlayer(id, {
                color:    pcfg.color,
                skinId:   pcfg.skinId,
                startCol: this.spawns[id].col,
                startRow: this.spawns[id].row,
            });
            this.placePlayerAtSpawn(id);
        });

        this.captureScores = { teamA: 0, teamB: 0 };
        this.flags = {
            teamA: { teamId: 'teamA', home: { ...this.flagHomes.teamA }, position: { ...this.flagHomes.teamA }, carrierId: null, color: TEAM_COLORS.teamA },
            teamB: { teamId: 'teamB', home: { ...this.flagHomes.teamB }, position: { ...this.flagHomes.teamB }, carrierId: null, color: TEAM_COLORS.teamB },
        };
        this.inputBuffers   = Object.fromEntries(CTF_2V2_PLAYER_IDS.map((id) => [id, []]));
        this.lastStatus     = '';
        this.statusUntil    = 0;
        this.timeLeft       = CTF_MATCH_SECONDS;
        this.isPaused       = false;
        this.matchFinished  = false;

        this.bindInputs();

        const rCfg = this.engine.getConfig?.() ?? {};
        this.gameTimer = this.time.addEvent({ delay: rCfg.tickMs ?? TICK_MS, loop: true, callback: this.gameTick, callbackScope: this });
        this.clockTimer = this.time.addEvent({ delay: 1000, loop: true, callback: this.updateClock, callbackScope: this });

        this.resizeHandler = (gs) => this.updateLayout(gs.width, gs.height);
        this.scale.on('resize', this.resizeHandler);

        const audio = getAudioSettings(localStorage);
        this.userMusicVol = audio.musicVolume;
        this.userSfxVol   = audio.sfxVolume;
        const musicKey = this.cache.audio.exists(audio.selectedMusic) ? audio.selectedMusic : DEFAULT_MUSIC_KEY;
        this.music = this.sound.add(musicKey, { loop: true, volume: this.userMusicVol });
        if (this.userMusicVol > 0) this.music.play();

        this.events.on('shutdown', () => {
            if (this.music)       this.music.stop();
            if (this.gameTimer)   this.gameTimer.remove();
            if (this.clockTimer)  this.clockTimer.remove();
            if (this.timerDiv)    this.timerDiv.remove();
            if (this.baseGraphics)  this.baseGraphics.destroy();
            if (this.flagGraphics)  this.flagGraphics.destroy();
            this.scale.off('resize', this.resizeHandler);
            this.toggleHud(false);
            this.restoreLivesHud();
            if (this.hudHelpWrap) this.hudHelpWrap.style.top = '';
        });
        this.events.on('pause',  () => { if (this.music) this.music.pause(); });
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
            this.scene.launch('InitCounter', { caller: this.scene.key });
        });
    }

    // ── input ────────────────────────────────────────────────────────────────
    bindInputs() {
        Object.entries(KEY_MAP).forEach(([key, { id, dir }]) => {
            this.input.keyboard.on(`keydown-${key}`, () => this.pushDirection(id, dir));
        });
        this.input.keyboard.on('keydown-ESC', () => this.pauseGame());
    }

    pushDirection(playerId, direction) {
        if (this.inputBuffers[playerId].length < 3) this.inputBuffers[playerId].push(direction);
    }

    handleInput() {
        CTF_2V2_PLAYER_IDS.forEach((id) => {
            if (this.inputBuffers[id].length > 0) this.engine.setNextDirection(id, this.inputBuffers[id].shift());
        });
    }

    // ── game loop ─────────────────────────────────────────────────────────────
    gameTick() {
        if (this.matchFinished) return;
        this.handleInput();
        const before = this.captureSnapshots();
        this.applyWallDeaths(before);
        const state = this.engine.tick();
        this.handleFlagDrops(state, before);
        this.relocateRespawns(state, before);
        this.handleFlagInteractions(state);
        if (this.matchFinished) return;
        this.renderState(state);
    }

    captureSnapshots() {
        const cfg = this.engine.getConfig();
        const snap = {};
        CTF_2V2_PLAYER_IDS.forEach((id) => {
            const pl = this.engine.getState().players.get(id);
            const head = pl?.segments?.[0];
            const dir  = pl?.nextDirection ?? pl?.direction ?? this.spawns[id]?.direction ?? 'right';
            const headCell = head ? this.segmentToCell(head, cfg.gridSize) : null;
            snap[id] = { alive: Boolean(pl?.alive), lives: Number(pl?.lives) || 0, direction: dir, headCell, dropCell: this.getDropCell(headCell, dir, cfg) };
        });
        return snap;
    }

    applyWallDeaths(snapshots) {
        const cfg   = this.engine.getConfig();
        const state = this.engine.getState();
        CTF_2V2_PLAYER_IDS.forEach((id) => {
            const pl = state.players.get(id);
            const sn = snapshots[id];
            if (!pl?.alive || !pl.segments?.length || !sn) return;
            if (shouldDieAtWall(pl.segments[0], sn.direction, cfg)) this.engine.killPlayer(pl);
        });
    }

    handleFlagDrops(state, before) {
        CTF_2V2_PLAYER_IDS.forEach((id) => {
            const pl = state.players.get(id);
            if (!before[id]?.alive || !(pl && pl.lives < before[id]?.lives)) return;
            this.sound.play('sonido_choque', { volume: this.userSfxVol });
            this.dropFlagCarriedBy(id, before[id]?.dropCell ?? before[id]?.headCell);
        });
    }

    relocateRespawns(state, before) {
        CTF_2V2_PLAYER_IDS.forEach((id) => {
            const pl = state.players.get(id);
            if (!pl?.alive || before[id]?.alive) return;
            this.placePlayerAtSpawn(id);
        });
    }

    handleFlagInteractions(state) {
        CTF_2V2_PLAYER_IDS.forEach((id) => {
            if (this.matchFinished) return;
            const pl = state.players.get(id);
            if (!pl?.alive || !pl.segments?.length) return;
            const cell  = this.segmentToCell(pl.segments[0]);
            const myTeam = getCtf2v2TeamOf(id);
            const enemy  = getCtf2v2EnemyTeam(myTeam);
            this.tryReturnOwnFlag(id, myTeam, cell);
            this.tryPickEnemyFlag(id, enemy, cell);
            this.tryCaptureEnemyFlag(id, myTeam, enemy, cell);
        });
    }

    tryReturnOwnFlag(playerId, myTeam, cell) {
        const flag = this.flags[myTeam];
        if (flag.carrierId || isFlagAtHome(flag) || !cellsEqual(cell, flag.position)) return;
        flag.position = { ...flag.home };
        this.announce(`${this.playerName(playerId)} devuelve su bandera`);
        this.sound.play('eat_apple', { volume: this.userSfxVol * 0.5 });
    }

    tryPickEnemyFlag(playerId, enemyTeam, cell) {
        const flag = this.flags[enemyTeam];
        if (flag.carrierId || !cellsEqual(cell, flag.position)) return;
        flag.carrierId = playerId;
        flag.position  = null;
        this.announce(`${this.playerName(playerId)} lleva la bandera rival`);
        this.sound.play('eat_apple', { volume: this.userSfxVol * 0.7 });
    }

    tryCaptureEnemyFlag(playerId, myTeam, enemyTeam, cell) {
        const enemyFlag = this.flags[enemyTeam];
        const ownFlag   = this.flags[myTeam];
        if (enemyFlag.carrierId !== playerId) return;
        if (!isCellInsideBounds(cell, this.bases[myTeam])) return;
        if (!isFlagAtHome(ownFlag)) {
            this.announce('Tu bandera debe estar en casa para puntuar');
            return;
        }
        this.captureScores[myTeam] += 1;
        enemyFlag.carrierId = null;
        enemyFlag.position  = { ...enemyFlag.home };
        this.announce(`Equipo ${myTeam === 'teamA' ? 'Rojo' : 'Azul'} captura (${this.captureScores[myTeam]}/${CTF_CAPTURE_LIMIT})`);
        this.sound.play('eat_apple', { volume: this.userSfxVol });
        const winner = getCtf2v2WinnerByCaptureLimit(this.captureScores, CTF_CAPTURE_LIMIT);
        if (winner) this.finishMatch(winner, 'ctfCaptures');
    }

    dropFlagCarriedBy(playerId, fallbackCell) {
        Object.values(this.flags).forEach((flag) => {
            if (flag.carrierId !== playerId) return;
            flag.carrierId = null;
            flag.position  = this.clampCell(fallbackCell ?? flag.home);
            this.announce('Bandera caída');
        });
    }

    // ── clock ─────────────────────────────────────────────────────────────────
    updateClock() {
        if (this.isPaused || this.matchFinished) return;
        this.timeLeft = Math.max(0, this.timeLeft - 1);
        this.updateClockHud();
        if (this.timeLeft <= 0) {
            const winner = this.captureScores.teamA > this.captureScores.teamB ? 'teamA'
                         : this.captureScores.teamB > this.captureScores.teamA ? 'teamB'
                         : 'draw';
            this.finishMatch(winner, 'ctfTime');
        }
    }

    announce(msg) {
        this.lastStatus  = msg;
        this.statusUntil = this.time.now + 1800;
        this.updateClockHud();
    }

    updateClockHud() {
        const min    = String(Math.floor(this.timeLeft / 60)).padStart(2, '0');
        const sec    = String(this.timeLeft % 60).padStart(2, '0');
        const status = this.time.now <= this.statusUntil ? this.lastStatus : `Meta ${CTF_CAPTURE_LIMIT} capturas`;
        if (this.timerDiv) {
            this.timerDiv.innerHTML = `
                <span>${min}:${sec}</span>
                <span style="display:block;font-size:0.9rem;margin-top:4px;color:rgba(255,255,255,0.82);">${status}</span>
                <span style="display:block;font-size:0.82rem;margin-top:2px;">
                    <span style="color:#e74c3c;">🔴 ${this.captureScores.teamA}</span>
                    &nbsp;—&nbsp;
                    <span style="color:#3498db;">🔵 ${this.captureScores.teamB}</span>
                </span>
            `;
        }
    }

    // ── render ────────────────────────────────────────────────────────────────
    renderState(state) {
        this.boardRenderer.renderState(state);
        this.renderBases();
        this.renderFlags(state);
        this.updateHudScores();
        this.updateClockHud();
    }

    renderBases() {
        if (!this.baseGraphics || !this.bases) return;
        const { cellSize: cs, boardOffsetX: bx, boardOffsetY: by } = this.boardRenderer;
        this.baseGraphics.clear();
        this.drawBase('teamA', bx, by, cs, TEAM_COLORS.teamA);
        this.drawBase('teamB', bx, by, cs, TEAM_COLORS.teamB);
    }

    drawBase(teamId, bx, by, cs, color) {
        const b = this.bases[teamId];
        const x = bx + b.col0 * cs,  y  = by + b.row0 * cs;
        const w = (b.col1 - b.col0 + 1) * cs,  h = (b.row1 - b.row0 + 1) * cs;
        const r = Math.max(4, Math.floor(cs * 0.18));
        this.baseGraphics.fillStyle(color, 0.14);
        this.baseGraphics.fillRoundedRect(x, y, w, h, r);
        this.baseGraphics.lineStyle(Math.max(2, Math.floor(cs * 0.08)), color, 0.7);
        this.baseGraphics.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, r);
    }

    renderFlags(state) {
        if (!this.flagGraphics || !this.flags) return;
        this.flagGraphics.clear();
        Object.values(this.flags).forEach((flag) => {
            if (flag.carrierId) {
                const carrier = state.players.get(flag.carrierId);
                if (carrier?.alive && carrier.segments?.length) this.drawFlag(this.segmentToCell(carrier.segments[0]), flag.color, true);
                return;
            }
            if (flag.position) this.drawFlag(flag.position, flag.color, false);
        });
    }

    drawFlag(cell, color, carried) {
        const { cellSize: cs, boardOffsetX: bx, boardOffsetY: by } = this.boardRenderer;
        const x  = bx + cell.col * cs + cs * 0.5;
        const y  = by + cell.row * cs + cs * (carried ? 0.16 : 0.28);
        const pt = y - cs * 0.35,  pb = y + cs * 0.42;
        this.flagGraphics.lineStyle(Math.max(2, Math.floor(cs * 0.08)), 0xf8fafc, 0.95);
        this.flagGraphics.lineBetween(x - cs * 0.22, pt, x - cs * 0.22, pb);
        this.flagGraphics.fillStyle(color, 1);
        this.flagGraphics.fillTriangle(x - cs * 0.18, pt, x + cs * 0.28, pt + cs * 0.16, x - cs * 0.18, pt + cs * 0.34);
        this.flagGraphics.fillStyle(0xffffff, carried ? 0.92 : 0.75);
        this.flagGraphics.fillCircle(x - cs * 0.22, pt, Math.max(2, cs * 0.08));
    }

    updateHudScores() {
        const aHasFlag = this.flags.teamB?.carrierId && CTF_2V2_TEAMS.teamA.includes(this.flags.teamB.carrierId) ? ' +F' : '';
        const bHasFlag = this.flags.teamA?.carrierId && CTF_2V2_TEAMS.teamB.includes(this.flags.teamA.carrierId) ? ' +F' : '';
        if (this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${this.captureScores.teamA}${aHasFlag}`;
        if (this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = `${this.captureScores.teamB}${bHasFlag}`;
    }

    // ── HUD ───────────────────────────────────────────────────────────────────
    cacheHudElements() {
        this.hudRoot        = document.getElementById('localgame-hud');
        this.hudJ1Score     = document.getElementById('hud-j1-score');
        this.hudJ1ScoreBig  = document.getElementById('hud-j1-score-big');
        this.hudJ1Lives     = document.getElementById('hud-j1-lives');
        this.hudJ2Score     = document.getElementById('hud-j2-score');
        this.hudJ2ScoreBig  = document.getElementById('hud-j2-score-big');
        this.hudJ2Lives     = document.getElementById('hud-j2-lives');
        this.hudHelp        = document.getElementById('hud-help');
        this.hudHelpWrap    = document.getElementById('hud-help-wrap');
        this.hudLeftPlayer  = document.getElementById('hud-left-player');
        this.hudRightPlayer = document.getElementById('hud-right-player');
        [this.hudJ1Lives, this.hudJ2Lives].forEach((el) => { if (el) el.style.display = 'none'; });
    }

    restoreLivesHud() {
        [this.hudJ1Lives, this.hudJ2Lives].forEach((el) => { if (el) el.style.display = ''; });
    }

    applyHudIdentity() {
        const players = this.matchSettings?.players ?? {};
        const p1n = players.p1?.name ?? 'J1';  const p2n = players.p2?.name ?? 'J2';
        const p3n = players.p3?.name ?? 'J3';  const p4n = players.p4?.name ?? 'J4';
        if (this.hudJ1Score) this.hudJ1Score.textContent = `🔴 ${p1n} & ${p2n}`;
        if (this.hudJ2Score) this.hudJ2Score.textContent = `🔵 ${p3n} & ${p4n}`;
        if (this.hudHelp)    this.hudHelp.textContent = `CTF 2v2 | 🔴 ${p1n}(WASD) ${p2n}(TFGH)  🔵 ${p3n}(IJKL) ${p4n}(Flechas) — ESC: Pausa`;
    }

    toggleHud(visible) {
        if (this.hudRoot) this.hudRoot.classList.toggle('d-none', !visible);
    }

    createClockDom() {
        this.timerDiv = document.createElement('div');
        this.timerDiv.id = 'ctf-clock';
        this.timerDiv.className = 'position-absolute start-50 translate-middle-x text-white fw-bold px-4 py-2 rounded-pill shadow-lg text-center';
        this.timerDiv.style.cssText = 'background:linear-gradient(180deg,#123b5d,#0B081A);border:4px solid #F67D31;font-size:2.2rem;z-index:1000;top:15px;box-shadow:0 0 30px rgba(34,211,238,0.45);line-height:1;';
        document.getElementById('game-container')?.appendChild(this.timerDiv);
        if (this.hudHelpWrap) this.hudHelpWrap.style.top = '132px';
    }

    pauseGame() {
        if (this.isPaused) return;
        this.isPaused = true;
        const players = this.matchSettings?.players ?? {};
        this.scene.pause();
        this.scene.launch('Pause', {
            caller:    'CaptureTheFlagGame2v2',
            p1Score:   this.captureScores.teamA,
            p2Score:   this.captureScores.teamB,
            p1Lives:   '∞',
            p2Lives:   '∞',
            players,
            scoreLabel: 'Capturas',
        });
    }

    // ── utils ─────────────────────────────────────────────────────────────────
    segmentToCell(seg, gridSize = this.engine.getConfig().gridSize) {
        return { col: Math.round(seg.x / gridSize), row: Math.round(seg.y / gridSize) };
    }

    getDropCell(headCell, direction, cfg) {
        if (!headCell) return null;
        const off  = DIRECTION_OFFSETS[direction] ?? DIRECTION_OFFSETS.right;
        const next = { col: headCell.col + off.col, row: headCell.row + off.row };
        if (next.col < 0 || next.row < 0 || next.col >= cfg.gridCols || next.row >= cfg.gridRows) return { ...headCell };
        return next;
    }

    clampCell(cell) {
        const cfg = this.engine.getConfig();
        return {
            col: Math.min(cfg.gridCols - 1, Math.max(0, Number(cell?.col) || 0)),
            row: Math.min(cfg.gridRows - 1, Math.max(0, Number(cell?.row) || 0)),
        };
    }

    placePlayerAtSpawn(playerId) {
        const state  = this.engine.getState();
        const player = state.players.get(playerId);
        const spawn  = this.spawns[playerId];
        if (!player || !spawn) return;
        const off = DIRECTION_OFFSETS[OPPOSITE_DIRECTION[spawn.direction]];
        player.segments = [];
        for (let i = 0; i < this.engine.getConfig().initialSnakeLength; i++) {
            player.segments.push({ x: (spawn.col + off.col * i) * GRID_SIZE, y: (spawn.row + off.row * i) * GRID_SIZE });
        }
        player.direction     = spawn.direction;
        player.nextDirection = spawn.direction;
        player.speed         = 1;
        player.moveCounter   = 0;
        player.speedEffectRemaining = 0;
    }

    playerName(id) {
        const p = this.matchSettings?.players?.[id];
        return p?.name ?? id.toUpperCase();
    }

    // ── layout ────────────────────────────────────────────────────────────────
    updateLayout(viewportWidth, viewportHeight) {
        const safePadding         = 18;
        const helpHeight          = this.hudHelpWrap ? this.hudHelpWrap.offsetHeight : 42;
        const topGap              = 180;
        const sidePanelWidthLeft  = this.hudLeftPlayer  ? this.hudLeftPlayer.offsetWidth  : 0;
        const sidePanelWidthRight = this.hudRightPlayer ? this.hudRightPlayer.offsetWidth : 0;
        const sideGap = 22;
        const metrics = this.boardRenderer.updateLayout({ viewportWidth, viewportHeight, safePadding, sideGap, topGap, sidePanelWidthLeft, sidePanelWidthRight });
        this.boardOffsetX = metrics.boardOffsetX;
        this.boardOffsetY = metrics.boardOffsetY;
        this.boardWidth   = metrics.boardWidth;
        this.boardHeight  = metrics.boardHeight;
        this.positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight);
        this.renderBases();
        this.renderFlags(this.engine.getState());
    }

    positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight) {
        if (this.hudLeftPlayer) {
            const lx = Math.floor(safePadding + (this.boardOffsetX - sideGap - safePadding - sidePanelWidthLeft) * 0.5);
            const ly = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudLeftPlayer.offsetHeight) * 0.5);
            this.hudLeftPlayer.style.left = `${lx}px`;
            this.hudLeftPlayer.style.top  = `${Math.max(8, ly)}px`;
        }
        if (this.hudRightPlayer) {
            const rx = Math.floor((this.boardOffsetX + this.boardWidth + sideGap) + (viewportWidth - safePadding - (this.boardOffsetX + this.boardWidth + sideGap) - sidePanelWidthRight) * 0.5);
            const ry = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudRightPlayer.offsetHeight) * 0.5);
            this.hudRightPlayer.style.left = `${rx}px`;
            this.hudRightPlayer.style.top  = `${Math.max(8, ry)}px`;
        }
        if (this.hudHelpWrap) {
            this.hudHelpWrap.style.top       = `${Math.max(110, this.boardOffsetY - helpHeight - 10)}px`;
            this.hudHelpWrap.style.left      = '50%';
            this.hudHelpWrap.style.transform = 'translateX(-50%)';
        }
    }

    // ── finish ────────────────────────────────────────────────────────────────
    finishMatch(winner, reason) {
        if (this.matchFinished) return;
        this.matchFinished = true;
        if (this.gameTimer)  this.gameTimer.remove();
        if (this.clockTimer) this.clockTimer.remove();

        const players = this.matchSettings?.players ?? {};
        const p1Name  = players.p1?.name ?? 'J1';
        const p2Name  = players.p2?.name ?? 'J2';
        const p3Name  = players.p3?.name ?? 'J3';
        const p4Name  = players.p4?.name ?? 'J4';

        const winnerLabel =
            winner === 'teamA' ? `🔴 ${p1Name} & ${p2Name}` :
            winner === 'teamB' ? `🔵 ${p3Name} & ${p4Name}` : 'Empate';

        recordLocalMatchResult(localStorage, { winner: winnerLabel, p1Name, p2Name });

        this.scene.start('GameOver', {
            winner:        winnerLabel,
            p1Name:        `🔴 ${p1Name} & ${p2Name}`,
            p2Name:        `🔵 ${p3Name} & ${p4Name}`,
            p1Score:       this.captureScores.teamA,
            p2Score:       this.captureScores.teamB,
            p1Lives:       '∞',
            p2Lives:       '∞',
            reason,
            mode:          'ctf2v2',
            rematchScene:  'CaptureTheFlagGame2v2',
            players,
            scoreLabel:    'Capturas',
            showLives:     false,
        });
    }
}
