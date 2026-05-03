import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildAuthEmail,
  extractLeaderboardUserName,
  mapFirebaseAuthError,
  normalizeUserName,
  validateUserName,
} from './firebaseAuthService.js';

test('normalizes usernames consistently for auth and leaderboard keys', () => {
  assert.equal(normalizeUserName('  Player.One  '), 'player.one');
  assert.equal(buildAuthEmail('  Player.One  '), 'player.one@snakeclash.local');
});

test('accepts only safe username characters', () => {
  assert.equal(validateUserName('snake_player-01').ok, true);
  assert.equal(validateUserName('Jugador con espacios').ok, false);
  assert.equal(validateUserName('bad@email').ok, false);
});

test('extracts leaderboard usernames from auth users consistently', () => {
  assert.equal(
    extractLeaderboardUserName({ displayName: ' Player.One ', email: 'ignored@snakeclash.local' }),
    'player.one',
  );
  assert.equal(
    extractLeaderboardUserName({ displayName: '', email: 'AnotherUser@snakeclash.local' }),
    'anotheruser',
  );
});

test('maps the modern firebase invalid-credential code to a friendly login message', () => {
  const error = mapFirebaseAuthError({
    code: 'auth/invalid-credential',
    message: 'Firebase: Error (auth/invalid-credential).',
  });

  assert.equal(error.message, 'El usuario no existe o la contrasena es incorrecta.');
  assert.equal(error.code, 'auth/invalid-credential');
});
