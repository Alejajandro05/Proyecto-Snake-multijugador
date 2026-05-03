import test from 'node:test';
import assert from 'node:assert/strict';

import { getGameOverPlayerNames, getGameOverWinnerName } from './gameOverNames.js';

test('uses explicit player names in game over data', () => {
  assert.deepEqual(
    getGameOverPlayerNames({ p1Name: 'Alice', p2Name: 'Bob' }),
    { p1Name: 'Alice', p2Name: 'Bob' },
  );
});

test('falls back to generic names when game over data omits them', () => {
  assert.deepEqual(
    getGameOverPlayerNames({}),
    { p1Name: 'Jugador 1', p2Name: 'Jugador 2' },
  );
});

test('resolves the winner label from the real player names', () => {
  assert.equal(getGameOverWinnerName({ winner: 'J1', p1Name: 'Alice', p2Name: 'Bob' }), 'Alice');
  assert.equal(getGameOverWinnerName({ winner: 'J2', p1Name: 'Alice', p2Name: 'Bob' }), 'Bob');
  assert.equal(getGameOverWinnerName({ winner: 'EMPATE', p1Name: 'Alice', p2Name: 'Bob' }), 'EMPATE');
});
