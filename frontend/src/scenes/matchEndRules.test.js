import test from 'node:test';
import assert from 'node:assert/strict';

import { shouldEndStandardMatchByLives, shouldEndStandardMatchByScore } from './matchEndRules.js';

test('standard matches no longer end because of score', () => {
  assert.equal(shouldEndStandardMatchByScore({ score: 10 }, { score: 0 }), false);
  assert.equal(shouldEndStandardMatchByScore({ score: 999 }, { score: 999 }), false);
});

test('standard matches still end when a player runs out of lives', () => {
  assert.equal(shouldEndStandardMatchByLives({ lives: 1 }, { lives: 0 }), true);
  assert.equal(shouldEndStandardMatchByLives({ lives: 0 }, { lives: 2 }), true);
  assert.equal(shouldEndStandardMatchByLives({ lives: 1 }, { lives: 1 }), false);
});
