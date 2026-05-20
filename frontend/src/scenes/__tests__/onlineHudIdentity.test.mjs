import assert from 'node:assert/strict';
import test from 'node:test';

import { syncOnlineHudIdentity } from '../modes/onlineHudIdentity.js';

function createElement() {
    const style = {
        setProperty(name, value) {
            this[name] = value;
        },
    };

    return {
        textContent: '',
        innerHTML: '',
        style,
    };
}

test('syncOnlineHudIdentity applies player names, scores, lives and theme colors', () => {
    const leftPanel = createElement();
    const rightPanel = createElement();
    const leftName = createElement();
    const rightName = createElement();
    const leftScore = createElement();
    const rightScore = createElement();
    const leftLives = createElement();
    const rightLives = createElement();

    const result = syncOnlineHudIdentity({
        state: {
            difficulty: 'hard',
            players: new Map([
                ['one', { playerName: 'Samuel', score: 7, lives: 2, color: 0xe74c3c }],
                ['two', { playerName: 'J2', score: 4, lives: 3, color: 0x3498db }],
            ]),
        },
        hud: {
            leftPanel,
            rightPanel,
            leftName,
            rightName,
            leftScore,
            rightScore,
            leftLives,
            rightLives,
        },
        updateLivesHud(target, lives) {
            target.innerHTML = `vidas:${lives}`;
        },
    });

    assert.equal(leftName.textContent, 'Samuel');
    assert.equal(rightName.textContent, 'J2');
    assert.equal(leftScore.textContent, '7');
    assert.equal(rightScore.textContent, '4');
    assert.equal(leftLives.innerHTML, 'vidas:2');
    assert.equal(rightLives.innerHTML, 'vidas:3');
    assert.equal(leftPanel.style['--player-accent'], '#e74c3c');
    assert.equal(rightPanel.style['--player-accent'], '#3498db');
    assert.equal(result.difficultyLabel, 'Difficult');
});

test('syncOnlineHudIdentity places the current client on the left panel regardless of join order', () => {
    const leftName = createElement();
    const rightName = createElement();
    const leftScore = createElement();
    const rightScore = createElement();
    const leftLives = createElement();
    const rightLives = createElement();

    const result = syncOnlineHudIdentity({
        state: {
            difficulty: 'normal',
            players: new Map([
                ['host', { playerName: 'Host', score: 3, lives: 3, color: 0xe74c3c }],
                ['guest', { playerName: 'Guest', score: 5, lives: 2, color: 0x3498db }],
            ]),
        },
        hud: {
            leftPanel: createElement(),
            rightPanel: createElement(),
            leftName,
            rightName,
            leftScore,
            rightScore,
            leftLives,
            rightLives,
        },
        updateLivesHud(target, lives) {
            target.innerHTML = `vidas:${lives}`;
        },
        currentSessionId: 'guest',
    });

    assert.equal(result.firstPlayer?.playerName, 'Guest');
    assert.equal(result.secondPlayer?.playerName, 'Host');
    assert.equal(leftName.textContent, 'Guest');
    assert.equal(rightName.textContent, 'Host');
    assert.equal(leftScore.textContent, '5');
    assert.equal(rightScore.textContent, '3');
    assert.equal(leftLives.innerHTML, 'vidas:2');
    assert.equal(rightLives.innerHTML, 'vidas:3');
});
