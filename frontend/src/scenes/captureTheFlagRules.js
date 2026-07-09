// ── 1v1 ──────────────────────────────────────────────────────────────────────
export const CTF_PLAYER_IDS = Object.freeze(['player1', 'player2']);

export function getCtfOpponentId(playerId) {
    return playerId === 'player1' ? 'player2' : 'player1';
}

// ── 2v2 ──────────────────────────────────────────────────────────────────────
/** All four player IDs used in 2v2 CTF */
export const CTF_2V2_PLAYER_IDS = Object.freeze(['p1', 'p2', 'p3', 'p4']);

/** Team A = p1 + p2  |  Team B = p3 + p4 */
export const CTF_2V2_TEAMS = Object.freeze({
    teamA: Object.freeze(['p1', 'p2']),
    teamB: Object.freeze(['p3', 'p4']),
});

export function getCtf2v2TeamOf(playerId) {
    return CTF_2V2_TEAMS.teamA.includes(playerId) ? 'teamA' : 'teamB';
}

export function getCtf2v2EnemyTeam(teamId) {
    return teamId === 'teamA' ? 'teamB' : 'teamA';
}

/** Flag owner is the team, not a single player */
export function getCtf2v2FlagOwnerTeam(flagId) {
    return flagId; // 'teamA' | 'teamB'
}

// ── shared helpers ────────────────────────────────────────────────────────────
export function cellsEqual(a, b) {
    return Boolean(a && b && a.col === b.col && a.row === b.row);
}

export function isCellInsideBounds(cell, bounds) {
    if (!cell || !bounds) return false;
    return cell.col >= bounds.col0 && cell.col <= bounds.col1 && cell.row >= bounds.row0 && cell.row <= bounds.row1;
}

export function isFlagAtHome(flag) {
    return Boolean(flag && !flag.carrierId && cellsEqual(flag.position, flag.home));
}

export function getCtfWinnerByCaptureLimit(scores, captureLimit) {
    const target = Number(captureLimit) || 0;
    if (target <= 0) return null;
    if ((Number(scores?.player1) || 0) >= target) return 'J1';
    if ((Number(scores?.player2) || 0) >= target) return 'J2';
    return null;
}

export function getCtf2v2WinnerByCaptureLimit(scores, captureLimit) {
    const target = Number(captureLimit) || 0;
    if (target <= 0) return null;
    if ((Number(scores?.teamA) || 0) >= target) return 'teamA';
    if ((Number(scores?.teamB) || 0) >= target) return 'teamB';
    return null;
}
