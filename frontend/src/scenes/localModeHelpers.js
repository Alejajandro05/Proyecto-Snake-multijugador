export function normalizeLocalGameMode(value) {
    switch (String(value ?? '').trim()) {
        case 'classic':
        case 'infinite':
            return 'infinite';
        case 'normal':
        case 'timeAttack':
        case 'chaos':
        case 'kingOfTheHill':
        case 'territory':
        case 'contraIA':
        case 'captureTheFlag':
            return String(value).trim();
        default:
            return 'normal';
    }
}

export function resolveLocalSceneKey(gameMode) {
    switch (normalizeLocalGameMode(gameMode)) {
        case 'infinite':
            return 'LocalGame';
        case 'timeAttack':
            return 'TimeAttackGame';
        case 'chaos':
            return 'ChaosGame';
        case 'kingOfTheHill':
            return 'KingOfTheHillGame';
        case 'territory':
            return 'TerritoryGame';
        case 'contraIA':
            return 'AgainstAIGame';
        case 'captureTheFlag':
            return 'CaptureTheFlagGame';
        case 'normal':
        default:
            return 'NormalLocalGame';
    }
}

export function getNextHeadPosition(head, direction, board) {
    const { gridSize, gridCols, gridRows } = board;
    let x = Number(head?.x) || 0;
    let y = Number(head?.y) || 0;

    if (direction === 'left') x -= gridSize;
    if (direction === 'right') x += gridSize;
    if (direction === 'up') y -= gridSize;
    if (direction === 'down') y += gridSize;

    return {
        x,
        y,
        isOutOfBounds:
            x < 0 ||
            y < 0 ||
            x >= gridCols * gridSize ||
            y >= gridRows * gridSize,
    };
}

export function shouldDieAtWall(head, direction, board) {
    return getNextHeadPosition(head, direction, board).isOutOfBounds;
}

export function getLocalPlayerSpawnPositions(gridCols, gridRows) {
    const cols = Number.isFinite(Number(gridCols)) ? Math.max(10, Number(gridCols)) : 32;
    const rows = Number.isFinite(Number(gridRows)) ? Math.max(8, Number(gridRows)) : 24;
    const centerRow = Math.max(2, Math.min(rows - 3, Math.floor(rows / 2)));
    return {
        p1: {
            startCol: Math.max(2, Math.min(cols - 4, Math.floor(cols / 4))),
            startRow: centerRow,
        },
        p2: {
            startCol: Math.max(3, Math.min(cols - 2, Math.ceil((cols * 3) / 4))),
            startRow: centerRow,
        },
    };
}
