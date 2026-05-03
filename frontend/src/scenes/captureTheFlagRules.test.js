import test from 'node:test';
import assert from 'node:assert/strict';

import {
    cellsEqual,
    getCtfOpponentId,
    getCtfWinnerByCaptureLimit,
    isCellInsideBounds,
    isFlagAtHome,
} from './captureTheFlagRules.js';

test('capture the flag helpers identify opponents and cells', () => {
    assert.equal(getCtfOpponentId('player1'), 'player2');
    assert.equal(getCtfOpponentId('player2'), 'player1');
    assert.equal(cellsEqual({ col: 2, row: 4 }, { col: 2, row: 4 }), true);
    assert.equal(cellsEqual({ col: 2, row: 4 }, { col: 3, row: 4 }), false);
});

test('capture the flag detects home flags and base bounds', () => {
    const home = { col: 2, row: 12 };
    const flag = { home, position: { ...home }, carrierId: null };
    const base = { col0: 1, col1: 6, row0: 9, row1: 15 };

    assert.equal(isFlagAtHome(flag), true);
    assert.equal(isFlagAtHome({ ...flag, carrierId: 'player2' }), false);
    assert.equal(isFlagAtHome({ ...flag, position: { col: 5, row: 12 } }), false);
    assert.equal(isCellInsideBounds({ col: 2, row: 12 }, base), true);
    assert.equal(isCellInsideBounds({ col: 0, row: 12 }, base), false);
});

test('capture the flag winner only appears at the capture limit', () => {
    assert.equal(getCtfWinnerByCaptureLimit({ player1: 2, player2: 1 }, 3), null);
    assert.equal(getCtfWinnerByCaptureLimit({ player1: 3, player2: 2 }, 3), 'J1');
    assert.equal(getCtfWinnerByCaptureLimit({ player1: 1, player2: 3 }, 3), 'J2');
});

