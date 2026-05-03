import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_MUSIC_KEY,
  DEFAULT_MUSIC_VOLUME,
  DEFAULT_SFX_VOLUME,
  getAudioSettings,
  saveMusicVolume,
  saveSelectedMusic,
  saveSfxVolume,
} from './audioSettings.js';

function createStorage(initialEntries = {}) {
  const store = new Map(Object.entries(initialEntries));
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
  };
}

test('keeps explicit zero volumes instead of falling back to defaults', () => {
  const storage = createStorage({
    musicVolume: '0',
    sfxVolume: '0',
    selectedMusic: 'musica2',
  });

  const settings = getAudioSettings(storage, ['musica_in_game', 'musica2', 'musica3']);

  assert.equal(settings.musicVolume, 0);
  assert.equal(settings.sfxVolume, 0);
  assert.equal(settings.selectedMusic, 'musica2');
});

test('falls back only when stored audio settings are invalid', () => {
  const storage = createStorage({
    musicVolume: 'not-a-number',
    sfxVolume: '',
    selectedMusic: 'missing-track',
  });

  const settings = getAudioSettings(storage, ['musica_in_game', 'musica2', 'musica3']);

  assert.equal(settings.musicVolume, DEFAULT_MUSIC_VOLUME);
  assert.equal(settings.sfxVolume, DEFAULT_SFX_VOLUME);
  assert.equal(settings.selectedMusic, DEFAULT_MUSIC_KEY);
});

test('persists sanitized audio settings', () => {
  const storage = createStorage();

  saveMusicVolume(storage, -1);
  saveSfxVolume(storage, 3);
  saveSelectedMusic(storage, '');

  const settings = getAudioSettings(storage, ['musica_in_game', 'musica2', 'musica3']);

  assert.equal(settings.musicVolume, 0);
  assert.equal(settings.sfxVolume, 1);
  assert.equal(settings.selectedMusic, DEFAULT_MUSIC_KEY);
});
