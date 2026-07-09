import type { TeamId, CtfCell, CtfBaseBounds, CtfFlagState, CtfTeamState, CtfGameState } from './types.js';
import {
  GRID_COLS, GRID_ROWS, GRID_SIZE,
  CTF_CAPTURES_TO_WIN, CTF_FLAG_BASE_MARGIN, CTF_BASE_HALF_HEIGHT,
} from './GameConfig.js';

// ─── Geometry helpers ─────────────────────────────────────────────────────────

function cellsEqual(a: CtfCell | null, b: CtfCell | null): boolean {
  if (!a || !b) return false;
  return a.col === b.col && a.row === b.row;
}

function isCellInBounds(cell: CtfCell, bounds: CtfBaseBounds): boolean {
  return (
    cell.col >= bounds.col0 && cell.col <= bounds.col1 &&
    cell.row >= bounds.row0 && cell.row <= bounds.row1
  );
}

export function segmentToCell(segment: { x: number; y: number }, gridSize = GRID_SIZE): CtfCell {
  return {
    col: Math.round(segment.x / gridSize),
    row: Math.round(segment.y / gridSize),
  };
}

// ─── Base / flag placement ────────────────────────────────────────────────────

export interface CtfLayoutConfig {
  gridCols?: number;
  gridRows?: number;
}

export interface CtfLayout {
  baseA: CtfBaseBounds;
  baseB: CtfBaseBounds;
  flagHomeA: CtfCell;
  flagHomeB: CtfCell;
  spawnA: CtfCell;
  spawnB: CtfCell;
}

export function buildCtfLayout(cfg: CtfLayoutConfig = {}): CtfLayout {
  const cols = cfg.gridCols ?? GRID_COLS;
  const rows = cfg.gridRows ?? GRID_ROWS;
  const centerRow = Math.floor(rows / 2);
  const half = CTF_BASE_HALF_HEIGHT;
  const margin = CTF_FLAG_BASE_MARGIN;

  return {
    baseA: {
      col0: 1,
      col1: margin + 3,
      row0: Math.max(1, centerRow - half),
      row1: Math.min(rows - 2, centerRow + half),
    },
    baseB: {
      col0: cols - margin - 4,
      col1: cols - 2,
      row0: Math.max(1, centerRow - half),
      row1: Math.min(rows - 2, centerRow + half),
    },
    flagHomeA: { col: margin,           row: centerRow },
    flagHomeB: { col: cols - margin - 1, row: centerRow },
    spawnA:    { col: margin + 2,        row: centerRow },
    spawnB:    { col: cols - margin - 3, row: centerRow },
  };
}

// ─── Initial state factory ────────────────────────────────────────────────────

export function buildInitialCtfGameState(layout: CtfLayout): CtfGameState {
  return {
    flagA: {
      teamId: 'A',
      home: { ...layout.flagHomeA },
      position: { ...layout.flagHomeA },
      carrierId: '',
      isAtBase: true,
    },
    flagB: {
      teamId: 'B',
      home: { ...layout.flagHomeB },
      position: { ...layout.flagHomeB },
      carrierId: '',
      isAtBase: true,
    },
    teamA: { teamId: 'A', captures: 0, memberIds: [] },
    teamB: { teamId: 'B', captures: 0, memberIds: [] },
    phase: 'waiting',
    winnerTeam: '',
  };
}

// ─── CtfEngine ────────────────────────────────────────────────────────────────

export interface CtfEngineConfig extends CtfLayoutConfig {
  capturesToWin?: number;
}

/**
 * Pure CTF rule engine.
 * Has NO dependency on Phaser or Colyseus.
 * All methods are deterministic given the same inputs.
 */
export class CtfEngine {
  private readonly layout: CtfLayout;
  private readonly capturesToWin: number;
  private state: CtfGameState;

  constructor(cfg: CtfEngineConfig = {}) {
    this.layout = buildCtfLayout(cfg);
    this.capturesToWin = cfg.capturesToWin ?? CTF_CAPTURES_TO_WIN;
    this.state = buildInitialCtfGameState(this.layout);
  }

  // ── Public read-only accessors ──────────────────────────────────────────────

  getState(): Readonly<CtfGameState> { return this.state; }
  getLayout(): Readonly<CtfLayout>   { return this.layout; }

  // ── Team management ─────────────────────────────────────────────────────────

  addMember(sessionId: string, teamId: TeamId): void {
    const team = teamId === 'A' ? this.state.teamA : this.state.teamB;
    if (!team.memberIds.includes(sessionId)) {
      team.memberIds.push(sessionId);
    }
  }

  removeMember(sessionId: string): void {
    this.state.teamA.memberIds = this.state.teamA.memberIds.filter((id) => id !== sessionId);
    this.state.teamB.memberIds = this.state.teamB.memberIds.filter((id) => id !== sessionId);
  }

  getTeamOf(sessionId: string): TeamId | null {
    if (this.state.teamA.memberIds.includes(sessionId)) return 'A';
    if (this.state.teamB.memberIds.includes(sessionId)) return 'B';
    return null;
  }

  // ── Flag logic ───────────────────────────────────────────────────────────────

  /**
   * Check if a player's head enters an enemy flag cell and picks it up.
   * Returns true if the pickup happened.
   */
  tryPickupFlag(sessionId: string, headCell: CtfCell): boolean {
    const myTeam = this.getTeamOf(sessionId);
    if (!myTeam) return false;

    const enemyFlag = myTeam === 'A' ? this.state.flagB : this.state.flagA;
    if (enemyFlag.carrierId !== '') return false; // already carried
    if (!cellsEqual(enemyFlag.position, headCell)) return false;

    enemyFlag.carrierId = sessionId;
    enemyFlag.position = null;
    enemyFlag.isAtBase = false;
    return true;
  }

  /**
   * Drop the flag carried by sessionId at the given cell (or home if cell is null).
   * Called on death or disconnect.
   */
  dropFlag(sessionId: string, dropCell?: CtfCell | null): void {
    const flags: CtfFlagState[] = [this.state.flagA, this.state.flagB];
    for (const flag of flags) {
      if (flag.carrierId !== sessionId) continue;
      flag.carrierId = '';
      flag.position = dropCell ?? { ...flag.home };
      flag.isAtBase = cellsEqual(flag.position, flag.home);
    }
  }

  /**
   * Check if a player carrying the enemy flag has reached their own base
   * AND their own flag is at home. If so, register a capture.
   * Returns true if a capture happened.
   */
  tryCapture(sessionId: string, headCell: CtfCell): boolean {
    const myTeam = this.getTeamOf(sessionId);
    if (!myTeam) return false;

    const enemyFlag = myTeam === 'A' ? this.state.flagB : this.state.flagA;
    const ownFlag   = myTeam === 'A' ? this.state.flagA : this.state.flagB;
    const ownBase   = myTeam === 'A' ? this.layout.baseA : this.layout.baseB;
    const team      = myTeam === 'A' ? this.state.teamA : this.state.teamB;

    if (enemyFlag.carrierId !== sessionId) return false;
    if (!isCellInBounds(headCell, ownBase)) return false;
    if (!ownFlag.isAtBase) return false; // own flag must be home

    // Register capture
    enemyFlag.carrierId = '';
    enemyFlag.position = { ...enemyFlag.home };
    enemyFlag.isAtBase = true;
    team.captures += 1;

    return true;
  }

  /**
   * Check if a player walks over their own flag that is on the ground (not at base).
   * If so, return it home.
   */
  tryReturnOwnFlag(sessionId: string, headCell: CtfCell): boolean {
    const myTeam = this.getTeamOf(sessionId);
    if (!myTeam) return false;

    const ownFlag = myTeam === 'A' ? this.state.flagA : this.state.flagB;
    if (ownFlag.carrierId !== '' || ownFlag.isAtBase) return false;
    if (!cellsEqual(ownFlag.position, headCell)) return false;

    ownFlag.position = { ...ownFlag.home };
    ownFlag.isAtBase = true;
    return true;
  }

  /**
   * Check win condition. Returns the winning team or null.
   */
  checkWin(): TeamId | null {
    if (this.state.teamA.captures >= this.capturesToWin) return 'A';
    if (this.state.teamB.captures >= this.capturesToWin) return 'B';
    return null;
  }

  setPhase(phase: string): void {
    this.state.phase = phase;
  }

  setWinner(team: TeamId): void {
    this.state.winnerTeam = team;
    this.state.phase = 'finished';
  }
}
