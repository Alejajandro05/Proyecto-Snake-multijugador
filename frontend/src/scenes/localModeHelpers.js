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
