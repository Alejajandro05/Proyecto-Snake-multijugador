import test from 'node:test';
import assert from 'node:assert/strict';

import { getGameOverRematchScene, getLivesWinner, getScoreWinner } from '../src/scenes/gameOverRouting.js';

test('keeps local rematches in the local game flow', () => {
  assert.equal(getGameOverRematchScene({ mode: 'local', reason: 'score' }), 'LocalGame');
  assert.equal(getGameOverRematchScene({ mode: 'local', reason: 'lives' }), 'LocalGame');
});

test('keeps time attack rematches in the time attack flow', () => {
  assert.equal(getGameOverRematchScene({ mode: 'timeAttack', reason: 'time' }), 'TimeAttackGame');
  assert.equal(getGameOverRematchScene({ mode: 'timeAttack', reason: 'tiebreaker' }), 'TimeAttackGame');
});

test('keeps king of the hill rematches in the hill flow', () => {
  assert.equal(getGameOverRematchScene({ mode: 'kingOfTheHill', reason: 'hill' }), 'KingOfTheHillGame');
});

test('keeps capture the flag rematches in the flag flow', () => {
  assert.equal(getGameOverRematchScene({ mode: 'captureTheFlag', reason: 'ctfCaptures' }), 'CaptureTheFlagGame');
  assert.equal(getGameOverRematchScene({ mode: 'captureTheFlag', reason: 'ctfTime' }), 'CaptureTheFlagGame');
});

test('returns online players to the online lobby instead of local play', () => {
  assert.equal(getGameOverRematchScene({ mode: 'online', reason: 'score' }), 'OnlineMenu');
  assert.equal(getGameOverRematchScene({ mode: 'online', reason: 'lives' }), 'OnlineMenu');
});

test('allows scenes to provide an explicit rematch target', () => {
  assert.equal(
    getGameOverRematchScene({ mode: 'online', reason: 'score', rematchScene: 'OnlineGame' }),
    'OnlineGame',
  );
});

test('reports score ties explicitly instead of assigning them to player 2', () => {
  assert.equal(getScoreWinner(10, 10), 'EMPATE');
  assert.equal(getScoreWinner(11, 10), 'J1');
  assert.equal(getScoreWinner(10, 11), 'J2');
});

test('reports simultaneous life eliminations as ties', () => {
  assert.equal(getLivesWinner(0, 0), 'EMPATE');
  assert.equal(getLivesWinner(1, 0), 'J1');
  assert.equal(getLivesWinner(0, 1), 'J2');
});
