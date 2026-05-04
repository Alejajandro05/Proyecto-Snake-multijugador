import { applyPlayerThemeToHud } from '../../utils/playerIdentity.js';

const DEFAULT_MAX_LIVES = 3;

export function getOnlineDifficultyLabel(difficulty) {
    return difficulty === 'easy' ? 'Easy' : difficulty === 'hard' ? 'Difficult' : 'Medium';
}

function getOrderedPlayers(state) {
    return Array.from(state?.players?.values?.() ?? []);
}

export function syncOnlineHudIdentity({ state, hud, updateLivesHud }) {
    const players = getOrderedPlayers(state);
    const firstPlayer = players[0];
    const secondPlayer = players[1];

    if (hud.leftName) hud.leftName.textContent = firstPlayer?.playerName || 'J1';
    if (hud.rightName) hud.rightName.textContent = secondPlayer?.playerName || 'J2';

    if (hud.leftScore) hud.leftScore.textContent = `${firstPlayer?.score ?? 0}`;
    if (hud.rightScore) hud.rightScore.textContent = `${secondPlayer?.score ?? 0}`;

    if (hud.leftLives) updateLivesHud(hud.leftLives, firstPlayer?.lives ?? DEFAULT_MAX_LIVES);
    if (hud.rightLives) updateLivesHud(hud.rightLives, secondPlayer?.lives ?? DEFAULT_MAX_LIVES);

    if (firstPlayer?.color !== undefined) {
        applyPlayerThemeToHud({
            panelEl: hud.leftPanel,
            titleEl: hud.leftName,
            scoreEl: hud.leftScore,
            livesEl: hud.leftLives,
            colorNumber: firstPlayer.color,
        });
    }

    if (secondPlayer?.color !== undefined) {
        applyPlayerThemeToHud({
            panelEl: hud.rightPanel,
            titleEl: hud.rightName,
            scoreEl: hud.rightScore,
            livesEl: hud.rightLives,
            colorNumber: secondPlayer.color,
        });
    }

    return {
        firstPlayer,
        secondPlayer,
        difficultyLabel: getOnlineDifficultyLabel(String(state?.difficulty ?? 'normal')),
    };
}
