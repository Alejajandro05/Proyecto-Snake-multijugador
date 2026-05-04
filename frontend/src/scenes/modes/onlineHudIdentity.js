import { applyPlayerThemeToHud } from '../../utils/playerIdentity.js';

const DEFAULT_MAX_LIVES = 3;
const DEFAULT_LEFT_COLOR = 0xe74c3c;
const DEFAULT_RIGHT_COLOR = 0x3498db;

export function getOnlineDifficultyLabel(difficulty) {
    return difficulty === 'easy' ? 'Easy' : difficulty === 'hard' ? 'Difficult' : 'Medium';
}

function getOrderedPlayerEntries(state) {
    const entries = [];
    state?.players?.forEach?.((player, sessionId) => {
        entries.push([sessionId, player]);
    });
    return entries;
}

function getHudPlayers(state, currentSessionId) {
    const entries = getOrderedPlayerEntries(state);
    if (!entries.length) {
        return { firstPlayer: undefined, secondPlayer: undefined };
    }

    if (!currentSessionId) {
        return {
            firstPlayer: entries[0]?.[1],
            secondPlayer: entries[1]?.[1],
        };
    }

    const currentEntry = entries.find(([sessionId]) => sessionId === currentSessionId);
    const rivalEntry = entries.find(([sessionId]) => sessionId !== currentSessionId);

    return {
        firstPlayer: currentEntry?.[1] ?? entries[0]?.[1],
        secondPlayer: rivalEntry?.[1] ?? entries.find(([, player]) => player !== currentEntry?.[1])?.[1],
    };
}

export function syncOnlineHudIdentity({ state, hud, updateLivesHud, currentSessionId }) {
    const { firstPlayer, secondPlayer } = getHudPlayers(state, currentSessionId);

    if (hud.leftName) hud.leftName.textContent = firstPlayer?.playerName || 'J1';
    if (hud.rightName) hud.rightName.textContent = secondPlayer?.playerName || 'J2';

    if (hud.leftScore) hud.leftScore.textContent = `${firstPlayer?.score ?? 0}`;
    if (hud.rightScore) hud.rightScore.textContent = `${secondPlayer?.score ?? 0}`;

    if (hud.leftLives) updateLivesHud(hud.leftLives, firstPlayer?.lives ?? DEFAULT_MAX_LIVES);
    if (hud.rightLives) updateLivesHud(hud.rightLives, secondPlayer?.lives ?? DEFAULT_MAX_LIVES);

    const firstColor = firstPlayer?.color ?? DEFAULT_LEFT_COLOR;
    const secondColor = secondPlayer?.color ?? DEFAULT_RIGHT_COLOR;

    if (firstPlayer || hud.leftPanel || hud.leftName || hud.leftScore || hud.leftLives) {
        applyPlayerThemeToHud({
            panelEl: hud.leftPanel,
            titleEl: hud.leftName,
            scoreEl: hud.leftScore,
            livesEl: hud.leftLives,
            colorNumber: firstColor,
        });
    }

    if (secondPlayer || hud.rightPanel || hud.rightName || hud.rightScore || hud.rightLives) {
        applyPlayerThemeToHud({
            panelEl: hud.rightPanel,
            titleEl: hud.rightName,
            scoreEl: hud.rightScore,
            livesEl: hud.rightLives,
            colorNumber: secondColor,
        });
    }

    return {
        firstPlayer,
        secondPlayer,
        difficultyLabel: getOnlineDifficultyLabel(String(state?.difficulty ?? 'normal')),
    };
}
