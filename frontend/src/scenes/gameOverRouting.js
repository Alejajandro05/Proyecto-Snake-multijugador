const REMATCH_SCENE_BY_MODE = {
    local: 'LocalGame',
    timeAttack: 'TimeAttackGame',
    kingOfTheHill: 'KingOfTheHillGame',
    online: 'OnlineMenu',
};

export function getGameOverRematchScene(data = {}) {
    if (typeof data.rematchScene === 'string' && data.rematchScene.trim()) {
        return data.rematchScene;
    }

    if (data.mode && REMATCH_SCENE_BY_MODE[data.mode]) {
        return REMATCH_SCENE_BY_MODE[data.mode];
    }

    if (data.reason === 'time' || data.reason === 'tiebreaker') {
        return 'TimeAttackGame';
    }

    return 'LocalGame';
}

export function getScoreWinner(p1Score, p2Score) {
    const score1 = Number(p1Score) || 0;
    const score2 = Number(p2Score) || 0;

    if (score1 === score2) return 'EMPATE';
    return score1 > score2 ? 'J1' : 'J2';
}

export function getLivesWinner(p1Lives, p2Lives) {
    const lives1 = Number(p1Lives) || 0;
    const lives2 = Number(p2Lives) || 0;

    if (lives1 === lives2) return 'EMPATE';
    return lives1 > lives2 ? 'J1' : 'J2';
}
