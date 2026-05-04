import assert from 'node:assert/strict';
import test from 'node:test';

import { clearOnlinePrefs, loadOnlinePrefs, saveOnlinePrefs } from './onlineStorage.js';

function createStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
  };
}

test('online prefs default to normal difficulty', () => {
  global.localStorage = createStorage();

  const prefs = loadOnlinePrefs();

  assert.equal(prefs.difficulty, 'normal');
});

test('online prefs persist the selected difficulty', () => {
  global.localStorage = createStorage();

  saveOnlinePrefs({ difficulty: 'hard', playerName: 'Samuel' });
  const prefs = loadOnlinePrefs();

  assert.equal(prefs.difficulty, 'hard');
  assert.equal(prefs.playerName, 'Samuel');

  clearOnlinePrefs();
  assert.equal(loadOnlinePrefs().difficulty, 'normal');
});
