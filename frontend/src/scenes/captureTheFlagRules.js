export const CTF_PLAYER_IDS = Object.freeze(['player1', 'player2']);

export function getCtfOpponentId(playerId) {
    return playerId === 'player1' ? 'player2' : 'player1';
}

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

