// Runtime JS mirror — generated from CtfEngine.ts. Do not edit by hand.
import {
  GRID_COLS, GRID_ROWS, GRID_SIZE,
  CTF_CAPTURES_TO_WIN, CTF_FLAG_BASE_MARGIN, CTF_BASE_HALF_HEIGHT,
} from './GameConfig.js';

function cellsEqual(a, b) {
  if (!a || !b) return false;
  return a.col === b.col && a.row === b.row;
}

function isCellInBounds(cell, bounds) {
  return (
    cell.col >= bounds.col0 && cell.col <= bounds.col1 &&
    cell.row >= bounds.row0 && cell.row <= bounds.row1
  );
}

export function segmentToCell(segment, gridSize = GRID_SIZE) {
  return {
    col: Math.round(segment.x / gridSize),
    row: Math.round(segment.y / gridSize),
  };
}

export function buildCtfLayout(cfg = {}) {
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
    flagHomeA: { col: margin,            row: centerRow },
    flagHomeB: { col: cols - margin - 1,  row: centerRow },
    spawnA:    { col: margin + 2,         row: centerRow },
    spawnB:    { col: cols - margin - 3,  row: centerRow },
  };
}

export function buildInitialCtfGameState(layout) {
  return {
    flagA: { teamId: 'A', home: { ...layout.flagHomeA }, position: { ...layout.flagHomeA }, carrierId: '', isAtBase: true },
    flagB: { teamId: 'B', home: { ...layout.flagHomeB }, position: { ...layout.flagHomeB }, carrierId: '', isAtBase: true },
    teamA: { teamId: 'A', captures: 0, memberIds: [] },
    teamB: { teamId: 'B', captures: 0, memberIds: [] },
    phase: 'waiting',
    winnerTeam: '',
  };
}

export class CtfEngine {
  constructor(cfg = {}) {
    this.layout = buildCtfLayout(cfg);
    this.capturesToWin = cfg.capturesToWin ?? CTF_CAPTURES_TO_WIN;
    this.state = buildInitialCtfGameState(this.layout);
  }

  getState() { return this.state; }
  getLayout() { return this.layout; }

  addMember(sessionId, teamId) {
    const team = teamId === 'A' ? this.state.teamA : this.state.teamB;
    if (!team.memberIds.includes(sessionId)) team.memberIds.push(sessionId);
  }

  removeMember(sessionId) {
    this.state.teamA.memberIds = this.state.teamA.memberIds.filter((id) => id !== sessionId);
    this.state.teamB.memberIds = this.state.teamB.memberIds.filter((id) => id !== sessionId);
  }

  getTeamOf(sessionId) {
    if (this.state.teamA.memberIds.includes(sessionId)) return 'A';
    if (this.state.teamB.memberIds.includes(sessionId)) return 'B';
    return null;
  }

  tryPickupFlag(sessionId, headCell) {
    const myTeam = this.getTeamOf(sessionId);
    if (!myTeam) return false;
    const enemyFlag = myTeam === 'A' ? this.state.flagB : this.state.flagA;
    if (enemyFlag.carrierId !== '') return false;
    if (!cellsEqual(enemyFlag.position, headCell)) return false;
    enemyFlag.carrierId = sessionId;
    enemyFlag.position = null;
    enemyFlag.isAtBase = false;
    return true;
  }

  dropFlag(sessionId, dropCell) {
    const flags = [this.state.flagA, this.state.flagB];
    for (const flag of flags) {
      if (flag.carrierId !== sessionId) continue;
      flag.carrierId = '';
      flag.position = dropCell ?? { ...flag.home };
      flag.isAtBase = cellsEqual(flag.position, flag.home);
    }
  }

  tryCapture(sessionId, headCell) {
    const myTeam = this.getTeamOf(sessionId);
    if (!myTeam) return false;
    const enemyFlag = myTeam === 'A' ? this.state.flagB : this.state.flagA;
    const ownFlag   = myTeam === 'A' ? this.state.flagA : this.state.flagB;
    const ownBase   = myTeam === 'A' ? this.layout.baseA : this.layout.baseB;
    const team      = myTeam === 'A' ? this.state.teamA : this.state.teamB;
    if (enemyFlag.carrierId !== sessionId) return false;
    if (!isCellInBounds(headCell, ownBase)) return false;
    if (!ownFlag.isAtBase) return false;
    enemyFlag.carrierId = '';
    enemyFlag.position = { ...enemyFlag.home };
    enemyFlag.isAtBase = true;
    team.captures += 1;
    return true;
  }

  tryReturnOwnFlag(sessionId, headCell) {
    const myTeam = this.getTeamOf(sessionId);
    if (!myTeam) return false;
    const ownFlag = myTeam === 'A' ? this.state.flagA : this.state.flagB;
    if (ownFlag.carrierId !== '' || ownFlag.isAtBase) return false;
    if (!cellsEqual(ownFlag.position, headCell)) return false;
    ownFlag.position = { ...ownFlag.home };
    ownFlag.isAtBase = true;
    return true;
  }

  checkWin() {
    if (this.state.teamA.captures >= this.capturesToWin) return 'A';
    if (this.state.teamB.captures >= this.capturesToWin) return 'B';
    return null;
  }

  setPhase(phase) { this.state.phase = phase; }
  setWinner(team) { this.state.winnerTeam = team; this.state.phase = 'finished'; }
}
