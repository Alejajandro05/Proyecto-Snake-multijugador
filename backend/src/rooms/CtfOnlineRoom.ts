import { Room, Client } from 'colyseus';
import { Schema, MapSchema, type } from '@colyseus/schema';
import { SnakeEngine } from '../../../shared/src/SnakeEngine.js';
import { CtfEngine, buildCtfLayout, segmentToCell } from '../../../shared/src/domain/CtfEngine.js';
import type { TeamId } from '../../../shared/src/domain/types.js';
import {
  GRID_SIZE, TICK_MS, CTF_CAPTURES_TO_WIN,
  CTF_TEAM_A_COLOR, CTF_TEAM_B_COLOR,
} from '../../../shared/src/domain/GameConfig.js';

// ─── Schema classes ─────────────────────────────────────────────────────────

class CtfCellSchema extends Schema {
  @type('int16') col = 0;
  @type('int16') row = 0;
}

class CtfFlagSchema extends Schema {
  @type('string')  teamId: string = '';
  @type('int16')   homeCol = 0;
  @type('int16')   homeRow = 0;
  /** -1 means flag is being carried (position irrelevant). */
  @type('int16')   col = 0;
  @type('int16')   row = 0;
  @type('boolean') isAtBase = true;
  @type('string')  carrierId: string = '';
}

class CtfTeamSchema extends Schema {
  @type('string')  teamId: string = '';
  @type('int8')    captures = 0;
}

export class CtfRoomState extends Schema {
  @type('string')     phase: string = 'waiting';
  @type('string')     winnerTeam: string = '';
  @type('string')     statusMessage: string = '';
  @type(CtfFlagSchema) flagA = new CtfFlagSchema();
  @type(CtfFlagSchema) flagB = new CtfFlagSchema();
  @type(CtfTeamSchema) teamA = new CtfTeamSchema();
  @type(CtfTeamSchema) teamB = new CtfTeamSchema();
  @type('boolean')    started = false;
  @type('boolean')    initCounterActive = false;
  @type('boolean')    matchEnded = false;
  @type('string')     matchEndReason: string = '';
  @type('string')     mapId: string = 'arena01';
  @type('string')     gameMode: string = 'captureTheFlag';
  // Serialised snake state (players + food) is embedded as a JSON string
  // so the existing SnakeBoardRenderer can deserialise it on the client.
  @type('string')     snakeStateJson: string = '{"players":[],"food":[],"obstacles":[]}';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_PLAYERS = 4;
const RESPAWN_LIVES = 9999;
const COUNTDOWN_SEC = 3;
const CTF_MATCH_SECONDS = 180;

const TEAM_COLORS: Record<TeamId, number> = {
  A: CTF_TEAM_A_COLOR,
  B: CTF_TEAM_B_COLOR,
};

// ─── CtfOnlineRoom ───────────────────────────────────────────────────────────

export class CtfOnlineRoom extends Room<CtfRoomState> {
  // SnakeEngine drives movement, food and obstacle placement.
  private snakeEngine!: ReturnType<typeof new SnakeEngine>;
  // CtfEngine drives flag / team / capture logic.
  private ctfEngine!: CtfEngine;

  private tickInterval?: NodeJS.Timer;
  private clockInterval?: NodeJS.Timer;
  private timeLeft = CTF_MATCH_SECONDS;
  private matchFinished = false;

  // Maps sessionId → teamId for fast lookup.
  private sessionTeam = new Map<string, TeamId>();
  // Maps sessionId → player sub-id used by SnakeEngine ('player1' … 'player4').
  private sessionSnakeId = new Map<string, string>();
  private nextSlot = 0;

  onCreate(options: Record<string, unknown>) {
    this.setState(new CtfRoomState());
    this.maxClients = MAX_PLAYERS;

    this.state.mapId = String(options.mapId ?? 'arena01');

    this.snakeEngine = new SnakeEngine({
      foodCount: 0,
      maxLives: RESPAWN_LIVES,
      obstaclesPerQuadrant: 0,
    });

    this.ctfEngine = new CtfEngine({ capturesToWin: CTF_CAPTURES_TO_WIN });

    const layout = this.ctfEngine.getLayout();

    // Register flag home positions into schema.
    this.state.flagA.teamId = 'A';
    this.state.flagA.homeCol = layout.flagHomeA.col;
    this.state.flagA.homeRow = layout.flagHomeA.row;
    this.state.flagA.col    = layout.flagHomeA.col;
    this.state.flagA.row    = layout.flagHomeA.row;

    this.state.flagB.teamId = 'B';
    this.state.flagB.homeCol = layout.flagHomeB.col;
    this.state.flagB.homeRow = layout.flagHomeB.row;
    this.state.flagB.col    = layout.flagHomeB.col;
    this.state.flagB.row    = layout.flagHomeB.row;

    this.state.teamA.teamId = 'A';
    this.state.teamB.teamId = 'B';

    this.onMessage('changeDirection', (client, direction: string) => {
      if (!this.state.started) return;
      const snakeId = this.sessionSnakeId.get(client.sessionId);
      if (snakeId) this.snakeEngine.setNextDirection(snakeId, direction);
    });
  }

  onJoin(client: Client, options: Record<string, unknown>) {
    if (this.nextSlot >= MAX_PLAYERS) {
      client.leave();
      return;
    }

    const slot = this.nextSlot++;
    // Slots 0,1 → Team A; slots 2,3 → Team B.
    const teamId: TeamId = slot < 2 ? 'A' : 'B';
    const snakeId = `player${slot + 1}`;

    this.sessionTeam.set(client.sessionId, teamId);
    this.sessionSnakeId.set(client.sessionId, snakeId);
    this.ctfEngine.addMember(client.sessionId, teamId);

    const layout = this.ctfEngine.getLayout();
    const spawn = teamId === 'A' ? layout.spawnA : layout.spawnB;
    const color = TEAM_COLORS[teamId];
    const skinId = String(options.skinId ?? '');

    this.snakeEngine.addPlayer(snakeId, {
      color,
      skinId,
      startCol: spawn.col,
      startRow: spawn.row,
    });

    // Start countdown once the room is full.
    if (this.clients.length >= MAX_PLAYERS) {
      this.startCountdown();
    }
  }

  onLeave(client: Client, _consented: boolean) {
    const snakeId = this.sessionSnakeId.get(client.sessionId);
    if (snakeId) {
      // Drop any flag the leaving player carries.
      this.ctfEngine.dropFlag(client.sessionId);
      this.snakeEngine.removePlayer?.(snakeId);
      this.syncFlagSchema();
    }
    this.ctfEngine.removeMember(client.sessionId);
    this.sessionTeam.delete(client.sessionId);
    this.sessionSnakeId.delete(client.sessionId);
  }

  onDispose() {
    if (this.tickInterval)  clearInterval(this.tickInterval as unknown as number);
    if (this.clockInterval) clearInterval(this.clockInterval as unknown as number);
  }

  // ─── Game lifecycle ──────────────────────────────────────────────────────

  private startCountdown() {
    this.state.initCounterActive = true;
    let count = COUNTDOWN_SEC;
    const iv = setInterval(() => {
      count--;
      if (count <= 0) {
        clearInterval(iv);
        this.state.initCounterActive = false;
        this.startGame();
      }
    }, 1000);
  }

  private startGame() {
    this.state.started = true;
    this.state.phase = 'playing';
    this.ctfEngine.setPhase('playing');

    this.tickInterval = setInterval(() => this.gameTick(), TICK_MS);
    this.clockInterval = setInterval(() => this.clockTick(), 1000);
  }

  private clockTick() {
    if (this.matchFinished) return;
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    if (this.timeLeft <= 0) {
      // Time out: team with most captures wins (or draw).
      const tA = this.ctfEngine.getState().teamA.captures;
      const tB = this.ctfEngine.getState().teamB.captures;
      const winner: TeamId = tA >= tB ? 'A' : 'B';
      this.finishMatch(winner, 'ctfTime');
    }
  }

  private gameTick() {
    if (this.matchFinished) return;

    // 1. Advance snake physics.
    const snakeState = this.snakeEngine.tick();

    // 2. For each alive player check flag interactions.
    snakeState.players.forEach((player, snakeId) => {
      if (!player.alive || !player.segments?.length) return;
      const sessionId = this.snakeIdToSession(snakeId);
      if (!sessionId) return;
      const headCell = segmentToCell(player.segments[0], GRID_SIZE);

      const pickedUp  = this.ctfEngine.tryPickupFlag(sessionId, headCell);
      const returned  = !pickedUp && this.ctfEngine.tryReturnOwnFlag(sessionId, headCell);
      const captured  = !pickedUp && !returned && this.ctfEngine.tryCapture(sessionId, headCell);

      if (pickedUp)  this.state.statusMessage = `${snakeId} lleva la bandera rival`;
      if (returned)  this.state.statusMessage = `${snakeId} devuelve su bandera`;
      if (captured) {
        const ctfState = this.ctfEngine.getState();
        const team = this.sessionTeam.get(sessionId) ?? 'A';
        const caps = team === 'A' ? ctfState.teamA.captures : ctfState.teamB.captures;
        this.state.statusMessage = `Equipo ${team} captura! (${caps}/${CTF_CAPTURES_TO_WIN})`;

        const winner = this.ctfEngine.checkWin();
        if (winner) {
          this.finishMatch(winner, 'ctfCaptures');
          return;
        }
      }
    });

    // 3. Handle player deaths → drop flag + respawn.
    snakeState.players.forEach((player, snakeId) => {
      if (player.alive) return;
      const sessionId = this.snakeIdToSession(snakeId);
      if (!sessionId) return;
      this.ctfEngine.dropFlag(sessionId);
    });

    // 4. Sync schema.
    this.syncFlagSchema();
    this.syncTeamSchema();

    // 5. Serialise snake state for frontend renderer.
    const playersArr: object[] = [];
    snakeState.players.forEach((player, snakeId) => {
      playersArr.push({
        id: snakeId,
        sessionId: this.snakeIdToSession(snakeId) ?? '',
        teamId: this.getTeamOfSnakeId(snakeId),
        alive: player.alive,
        segments: player.segments,
        score: player.score,
        lives: player.lives,
        color: player.color,
        skinId: player.skinId,
        direction: player.direction,
      });
    });
    this.state.snakeStateJson = JSON.stringify({
      players: playersArr,
      food: snakeState.food,
      obstacles: snakeState.obstacles,
      flagA: this.ctfEngine.getState().flagA,
      flagB: this.ctfEngine.getState().flagB,
      teamA: this.ctfEngine.getState().teamA,
      teamB: this.ctfEngine.getState().teamB,
    });
  }

  private syncFlagSchema() {
    const cs = this.ctfEngine.getState();

    this.state.flagA.isAtBase  = cs.flagA.isAtBase;
    this.state.flagA.carrierId = cs.flagA.carrierId;
    this.state.flagA.col       = cs.flagA.position?.col ?? this.state.flagA.homeCol;
    this.state.flagA.row       = cs.flagA.position?.row ?? this.state.flagA.homeRow;

    this.state.flagB.isAtBase  = cs.flagB.isAtBase;
    this.state.flagB.carrierId = cs.flagB.carrierId;
    this.state.flagB.col       = cs.flagB.position?.col ?? this.state.flagB.homeCol;
    this.state.flagB.row       = cs.flagB.position?.row ?? this.state.flagB.homeRow;
  }

  private syncTeamSchema() {
    const cs = this.ctfEngine.getState();
    this.state.teamA.captures = cs.teamA.captures;
    this.state.teamB.captures = cs.teamB.captures;
  }

  private finishMatch(winnerTeam: TeamId, reason: string) {
    if (this.matchFinished) return;
    this.matchFinished = true;
    if (this.tickInterval)  clearInterval(this.tickInterval as unknown as number);
    if (this.clockInterval) clearInterval(this.clockInterval as unknown as number);

    this.ctfEngine.setWinner(winnerTeam);
    this.syncFlagSchema();
    this.syncTeamSchema();
    this.state.phase        = 'finished';
    this.state.winnerTeam   = winnerTeam;
    this.state.matchEnded   = true;
    this.state.matchEndReason = reason;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private snakeIdToSession(snakeId: string): string | undefined {
    for (const [sid, sid2] of this.sessionSnakeId) {
      if (sid2 === snakeId) return sid;
    }
    return undefined;
  }

  private getTeamOfSnakeId(snakeId: string): TeamId | null {
    const sessionId = this.snakeIdToSession(snakeId);
    if (!sessionId) return null;
    return this.sessionTeam.get(sessionId) ?? null;
  }
}
