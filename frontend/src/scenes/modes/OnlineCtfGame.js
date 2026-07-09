import Phaser from 'phaser';
import { createLobbyClient } from '../../net/lobbyClient.js';
import { getCurrentUser } from '../../services/firebaseAuthService.js';
import { SnakeBoardRenderer } from '../../renderers/SnakeBoardRenderer.js';
import { DEFAULT_MUSIC_KEY, getAudioSettings } from '../../utils/audioSettings.js';
import { loadOnlinePrefs } from '../../utils/onlineStorage.js';
import { getControlsConfig } from '../../utils/controlsConfig.js';
import { showOnlineExitConfirm } from '../../ui/onlineExitConfirm.js';

/**
 * Online 2v2 Capture The Flag game scene.
 *
 * This scene mirrors the structure of OnlineGame but:
 *  - Connects to the 'ctf_room' room type (CtfOnlineRoom on the server).
 *  - Renders bases and flags from the state received via snakeStateJson.
 *  - Shows a persistent CTF clock and capture HUD.
 */
export class OnlineCtfGame extends Phaser.Scene {
  constructor() {
    super('OnlineCtfGame');
  }

  // ─── init ──────────────────────────────────────────────────────────

  init(data) {
    this.matchRoomId     = data?.matchRoomId ?? '';
    this.lobbyRoomId     = data?.lobbyRoomId ?? '';
    this.playerSkinId    = data?.skinId      ?? '';
    this.mapId           = data?.mapId       ?? 'arena01';
    this.playerName      = data?.playerName  ?? '';
    this.initCounterStarted = false;
  }

  // ─── create ─────────────────────────────────────────────────────────

  async create() {
    this.boardRenderer = new SnakeBoardRenderer(this, { mapId: this.mapId });
    this.baseGraphics  = this.add.graphics().setDepth(3);
    this.flagGraphics  = this.add.graphics().setDepth(14);

    this.cacheHudElements();
    this.toggleHud(true);
    this.createCtfClockDom();

    this.latestState   = null;
    this.latestPayload = null;

    const controls   = getControlsConfig(localStorage);
    this.controls    = controls;
    this.isLeavingRoom  = false;
    this.exitConfirmOpen = false;

    this.directionHandlers = {
      up:    () => this.sendDirection('up'),
      down:  () => this.sendDirection('down'),
      left:  () => this.sendDirection('left'),
      right: () => this.sendDirection('right'),
    };

    this.input.keyboard.on(`keydown-${controls.player1.up}`,    this.directionHandlers.up);
    this.input.keyboard.on(`keydown-${controls.player1.down}`,  this.directionHandlers.down);
    this.input.keyboard.on(`keydown-${controls.player1.left}`,  this.directionHandlers.left);
    this.input.keyboard.on(`keydown-${controls.player1.right}`, this.directionHandlers.right);
    this.input.keyboard.on(`keydown-${controls.player2.up}`,    this.directionHandlers.up);
    this.input.keyboard.on(`keydown-${controls.player2.down}`,  this.directionHandlers.down);
    this.input.keyboard.on(`keydown-${controls.player2.left}`,  this.directionHandlers.left);
    this.input.keyboard.on(`keydown-${controls.player2.right}`, this.directionHandlers.right);
    this.input.keyboard.on('keydown-ESC', () => this.requestLeaveRoom());

    this.resizeHandler = (gameSize) => this.updateLayout(gameSize.width, gameSize.height);
    this.scale.on('resize', this.resizeHandler);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.resizeHandler);
      this.toggleHud(false);
      this.removeInputListeners();
      this.cleanupRoom();
      this.baseGraphics?.destroy();
      this.flagGraphics?.destroy();
      this.destroyCtfClockDom();
      this.restoreLivesHud();
      this.scene.stop('InitCounter');
    });

    this.updateLayout(this.scale.width, this.scale.height);
    this.boardRenderer.renderState({ players: new Map(), food: [], obstacles: [] });

    const audioSettings = getAudioSettings(localStorage);
    this.userMusicVol = audioSettings.musicVolume;
    this.userSfxVol   = audioSettings.sfxVolume;
    const musicKey    = this.cache.audio.exists(audioSettings.selectedMusic)
      ? audioSettings.selectedMusic : DEFAULT_MUSIC_KEY;
    this.music = this.sound.add(musicKey, { loop: true, volume: this.userMusicVol });
    if (this.userMusicVol > 0) this.music.play();

    this.events.on('shutdown', () => { if (this.music) this.music.stop(); });
    this.events.on('pause',    () => { if (this.music) this.music.pause(); });
    this.events.on('resume',   () => {
      this.isPaused = false;
      if (this.music?.isPaused) this.music.resume();
      else if (this.music && !this.music.isPlaying && this.userMusicVol > 0) this.music.play();
    });

    await this.connectToServer();
  }

  // ─── Network ──────────────────────────────────────────────────────────

  async connectToServer() {
    try {
      const client = createLobbyClient();
      const currentUser = await getCurrentUser();
      const onlinePrefs = loadOnlinePrefs();
      const options = {
        skinId:     this.playerSkinId,
        playerName: this.playerName || onlinePrefs.playerName || 'Jugador',
        mapId:      this.mapId,
      };
      if (currentUser) options.firebaseUid = currentUser.uid;

      // Join or create a 'ctf_room' room.
      this.room = this.matchRoomId
        ? await client.joinById(this.matchRoomId, options)
        : await client.joinOrCreate('ctf_room', options);

      this.room.onStateChange((state) => {
        this.latestState = state;
        this.renderFromState(state);
      });

      this.room.onLeave(() => {
        if (this.isLeavingRoom) return;
        this.cleanupRoom();
        this.scene.start('MainMenu');
      });

      this.room.onError((code, message) => {
        console.error('OnlineCtfGame room error:', code, message);
        if (!this.isLeavingRoom) {
          this.cleanupRoom();
          this.scene.start('MainMenu');
        }
      });

      this.renderFromState(this.room.state);
    } catch (err) {
      console.error('OnlineCtfGame connection error:', err);
      this.cleanupRoom();
      this.scene.start('MainMenu');
    }
  }

  sendDirection(direction) {
    if (!this.room || this.exitConfirmOpen || !this.latestState?.started) return;
    this.room.send('changeDirection', direction);
  }

  async requestLeaveRoom() {
    if (this.isLeavingRoom || this.exitConfirmOpen) return;
    this.exitConfirmOpen = true;
    const confirmed = await showOnlineExitConfirm();
    this.exitConfirmOpen = false;
    if (confirmed) this.leaveRoom();
  }

  leaveRoom() {
    if (this.isLeavingRoom) return;
    this.isLeavingRoom = true;
    this.cleanupRoom();
    this.scene.start('MainMenu');
  }

  cleanupRoom() {
    if (this.room) { this.room.leave(); this.room = null; }
  }

  removeInputListeners() {
    if (!this.input?.keyboard || !this.directionHandlers || !this.controls) return;
    const c = this.controls;
    const h = this.directionHandlers;
    ['player1', 'player2'].forEach((p) => {
      this.input.keyboard.off(`keydown-${c[p].up}`,    h.up);
      this.input.keyboard.off(`keydown-${c[p].down}`,  h.down);
      this.input.keyboard.off(`keydown-${c[p].left}`,  h.left);
      this.input.keyboard.off(`keydown-${c[p].right}`, h.right);
    });
  }

  // ─── Init counter ──────────────────────────────────────────────────────

  syncInitCounter(state) {
    if (!state?.initCounterActive || state?.started || this.initCounterStarted || this.isLeavingRoom) return;
    this.initCounterStarted = true;
    this.isPaused = true;
    this.scene.pause();
    this.scene.launch('InitCounter', { caller: 'OnlineCtfGame' });
  }

  // ─── Render ──────────────────────────────────────────────────────────

  renderFromState(state) {
    if (!state) return;
    this.latestState = state;
    this.syncInitCounter(state);

    // Parse snake + CTF payload from JSON string embedded in state.
    let payload = null;
    try {
      if (state.snakeStateJson) payload = JSON.parse(state.snakeStateJson);
    } catch (_) { /* ignore */ }
    this.latestPayload = payload;

    // Build a Map-based state for the renderer.
    const playerMap = new Map();
    (payload?.players ?? []).forEach((p) => {
      playerMap.set(p.id ?? p.sessionId, p);
    });
    const rendererState = {
      players: playerMap,
      food: payload?.food ?? [],
      obstacles: payload?.obstacles ?? [],
    };

    this.boardRenderer.renderState(rendererState);
    this.renderBases(payload);
    this.renderFlags(payload);
    this.updateHudScores(state, payload);
    this.updateCtfClock(state);

    if (state.matchEnded) {
      this.finishMatch(state);
    }
  }

  // ─── CTF overlays ───────────────────────────────────────────────────────

  renderBases(payload) {
    if (!this.baseGraphics || !payload?.teamA) return;
    this.baseGraphics.clear();
    // We re-use the same layout as CtfEngine (built from same constants).
    // Layout is mirrored here via flag home positions for simplicity.
    const br = this.boardRenderer;
    const cs = br.cellSize;
    const bx = br.boardOffsetX;
    const by = br.boardOffsetY;

    // Base dimensions: same as CaptureTheFlagGame local.
    const cfg = { gridCols: 32, gridRows: 24 }; // defaults
    const centerRow = Math.floor(cfg.gridRows / 2);
    const half = 3;
    const margin = 3;

    const baseA = { col0: 1, col1: margin + 3, row0: Math.max(1, centerRow - half), row1: Math.min(cfg.gridRows - 2, centerRow + half) };
    const baseB = { col0: cfg.gridCols - margin - 4, col1: cfg.gridCols - 2, row0: Math.max(1, centerRow - half), row1: Math.min(cfg.gridRows - 2, centerRow + half) };

    this._drawBase(bx, by, cs, baseA, 0x3399ff);
    this._drawBase(bx, by, cs, baseB, 0xff4444);
  }

  _drawBase(bx, by, cs, base, color) {
    const x = bx + base.col0 * cs;
    const y = by + base.row0 * cs;
    const w = (base.col1 - base.col0 + 1) * cs;
    const h = (base.row1 - base.row0 + 1) * cs;
    this.baseGraphics.fillStyle(color, 0.14);
    this.baseGraphics.fillRoundedRect(x, y, w, h, Math.max(4, Math.floor(cs * 0.18)));
    this.baseGraphics.lineStyle(Math.max(2, Math.floor(cs * 0.08)), color, 0.7);
    this.baseGraphics.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, Math.max(4, Math.floor(cs * 0.18)));
  }

  renderFlags(payload) {
    if (!this.flagGraphics) return;
    this.flagGraphics.clear();
    const flags = [payload?.flagA, payload?.flagB].filter(Boolean);
    const colors = { A: 0x3399ff, B: 0xff4444 };

    flags.forEach((flag) => {
      const color = colors[flag.teamId] ?? 0xffffff;
      if (flag.carrierId) {
        const carrier = (payload?.players ?? []).find((p) => (p.sessionId ?? p.id) === flag.carrierId);
        if (carrier?.alive && carrier.segments?.length) {
          const seg = carrier.segments[0];
          const cs  = this.boardRenderer.cellSize;
          const cell = { col: Math.round(seg.x / cs), row: Math.round(seg.y / cs) };
          this._drawFlag(cell, color, true);
        }
        return;
      }
      if (flag.position) this._drawFlag(flag.position, color, false);
    });
  }

  _drawFlag(cell, color, carried) {
    const br = this.boardRenderer;
    const cs = br.cellSize;
    const x  = br.boardOffsetX + cell.col * cs + cs * 0.5;
    const y  = br.boardOffsetY + cell.row * cs + cs * (carried ? 0.16 : 0.28);
    const poleTop    = y - cs * 0.35;
    const poleBottom = y + cs * 0.42;

    this.flagGraphics.lineStyle(Math.max(2, Math.floor(cs * 0.08)), 0xf8fafc, 0.95);
    this.flagGraphics.lineBetween(x - cs * 0.22, poleTop, x - cs * 0.22, poleBottom);
    this.flagGraphics.fillStyle(color, 1);
    this.flagGraphics.fillTriangle(
      x - cs * 0.18, poleTop,
      x + cs * 0.28, poleTop + cs * 0.16,
      x - cs * 0.18, poleTop + cs * 0.34,
    );
    this.flagGraphics.fillStyle(0xffffff, carried ? 0.92 : 0.75);
    this.flagGraphics.fillCircle(x - cs * 0.22, poleTop, Math.max(2, cs * 0.08));
  }

  // ─── HUD ──────────────────────────────────────────────────────────────

  cacheHudElements() {
    this.hudRoot       = document.getElementById('localgame-hud');
    this.hudJ1Score    = document.getElementById('hud-j1-score');
    this.hudJ1ScoreBig = document.getElementById('hud-j1-score-big');
    this.hudJ1Lives    = document.getElementById('hud-j1-lives');
    this.hudJ2Score    = document.getElementById('hud-j2-score');
    this.hudJ2ScoreBig = document.getElementById('hud-j2-score-big');
    this.hudJ2Lives    = document.getElementById('hud-j2-lives');
    this.hudHelp       = document.getElementById('hud-help');
    this.hudHelpWrap   = document.getElementById('hud-help-wrap');
    this.hudLeftPlayer  = document.getElementById('hud-left-player');
    this.hudRightPlayer = document.getElementById('hud-right-player');

    [this.hudJ1Lives, this.hudJ2Lives].forEach((el) => { if (el) el.style.display = 'none'; });

    if (this.hudHelp) {
      this.hudHelp.textContent = 'Capture The Flag Online | Equipo A (WASD) vs Equipo B (Flechas) | ESC: Salir';
    }
    if (this.hudJ1Score) this.hudJ1Score.textContent = 'Equipo A';
    if (this.hudJ2Score) this.hudJ2Score.textContent = 'Equipo B';
  }

  toggleHud(visible) {
    if (this.hudRoot) this.hudRoot.classList.toggle('d-none', !visible);
  }

  restoreLivesHud() {
    [this.hudJ1Lives, this.hudJ2Lives].forEach((el) => { if (el) el.style.display = ''; });
  }

  updateHudScores(state, payload) {
    const capturesA = state?.teamA?.captures ?? 0;
    const capturesB = state?.teamB?.captures ?? 0;
    const aHasFlag  = payload?.flagB?.carrierId ? ' +F' : '';
    const bHasFlag  = payload?.flagA?.carrierId ? ' +F' : '';
    if (this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${capturesA}${aHasFlag}`;
    if (this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = `${capturesB}${bHasFlag}`;
  }

  createCtfClockDom() {
    if (this.ctfClockDiv) return;
    this.ctfClockDiv = document.createElement('div');
    this.ctfClockDiv.id = 'ctf-online-clock';
    this.ctfClockDiv.className = 'position-absolute start-50 translate-middle-x text-white fw-bold px-4 py-2 rounded-pill shadow-lg text-center';
    this.ctfClockDiv.style = 'background: linear-gradient(180deg,#123b5d,#0B081A); border:4px solid #F67D31; font-size:2.6rem; z-index:1000; top:15px; box-shadow:0 0 30px rgba(34,211,238,.45); line-height:1;';
    document.getElementById('game-container')?.appendChild(this.ctfClockDiv);
    if (this.hudHelpWrap) this.hudHelpWrap.style.top = '112px';
  }

  destroyCtfClockDom() {
    if (this.ctfClockDiv) { this.ctfClockDiv.remove(); this.ctfClockDiv = null; }
    if (this.hudHelpWrap) this.hudHelpWrap.style.top = '';
  }

  updateCtfClock(state) {
    if (!this.ctfClockDiv) return;
    const status = state?.statusMessage ?? '';
    const capturesA = state?.teamA?.captures ?? 0;
    const capturesB = state?.teamB?.captures ?? 0;
    const sub = status || `A: ${capturesA} | B: ${capturesB} | Meta ${3} capturas`;
    this.ctfClockDiv.innerHTML = `
      <span>CTF</span>
      <span style="display:block;font-size:0.95rem;margin-top:4px;color:rgba(255,255,255,.82);">${sub}</span>
    `;
  }

  // ─── Layout ──────────────────────────────────────────────────────────

  updateLayout(viewportWidth, viewportHeight) {
    const safePadding = 18;
    const helpHeight  = this.hudHelpWrap ? this.hudHelpWrap.offsetHeight : 42;
    const topGap = 170;
    const sidePanelWidthLeft  = this.hudLeftPlayer  ? this.hudLeftPlayer.offsetWidth  : 0;
    const sidePanelWidthRight = this.hudRightPlayer ? this.hudRightPlayer.offsetWidth : 0;
    const sideGap = 22;
    const metrics = this.boardRenderer.updateLayout({
      viewportWidth, viewportHeight,
      safePadding, sideGap, topGap,
      sidePanelWidthLeft, sidePanelWidthRight,
    });
    this.boardOffsetX = metrics.boardOffsetX;
    this.boardOffsetY = metrics.boardOffsetY;
    this.boardWidth   = metrics.boardWidth;
    this.boardHeight  = metrics.boardHeight;

    this._positionHudPanels(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight);
    if (this.latestPayload) this.renderBases(this.latestPayload);
    if (this.latestPayload) this.renderFlags(this.latestPayload);
  }

  _positionHudPanels(viewportWidth, _viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, _helpHeight) {
    if (this.hudLeftPlayer) {
      const leftX = Math.floor(safePadding + (this.boardOffsetX - sideGap - safePadding - sidePanelWidthLeft) * 0.5);
      const leftY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudLeftPlayer.offsetHeight) * 0.5);
      this.hudLeftPlayer.style.left = `${leftX}px`;
      this.hudLeftPlayer.style.top  = `${Math.max(8, leftY)}px`;
    }
    if (this.hudRightPlayer) {
      const rightX = Math.floor(
        (this.boardOffsetX + this.boardWidth + sideGap) +
        (viewportWidth - safePadding - (this.boardOffsetX + this.boardWidth + sideGap) - sidePanelWidthRight) * 0.5,
      );
      const rightY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudRightPlayer.offsetHeight) * 0.5);
      this.hudRightPlayer.style.left = `${rightX}px`;
      this.hudRightPlayer.style.top  = `${Math.max(8, rightY)}px`;
    }
    if (this.hudHelpWrap) {
      this.hudHelpWrap.style.top  = '112px';
      this.hudHelpWrap.style.left = '50%';
      this.hudHelpWrap.style.transform = 'translateX(-50%)';
    }
  }

  // ─── Finish ─────────────────────────────────────────────────────────

  finishMatch(state) {
    if (this.isLeavingRoom) return;
    this.isLeavingRoom = true;
    this.cleanupRoom();

    const teamACaptures = state?.teamA?.captures ?? 0;
    const teamBCaptures = state?.teamB?.captures ?? 0;
    const winnerTeam    = String(state?.winnerTeam ?? '');
    const winner        = winnerTeam === 'A' ? 'Equipo A' : (winnerTeam === 'B' ? 'Equipo B' : 'Empate');

    this.scene.start('GameOver', {
      winner,
      p1Name:  'Equipo A',
      p2Name:  'Equipo B',
      p1Score: teamACaptures,
      p2Score: teamBCaptures,
      p1Lives: '∞',
      p2Lives: '∞',
      reason:  state?.matchEndReason ?? 'ctfCaptures',
      mode:    'captureTheFlag',
      rematchScene: 'OnlineMenu',
      rematchData: {
        resumeLobby: true,
        lobbyRoomId: this.lobbyRoomId,
        completedMatchRoomId: this.matchRoomId,
      },
      leaveActiveLobby: true,
      scoreLabel: 'Capturas',
      showLives: false,
    });
  }
}
