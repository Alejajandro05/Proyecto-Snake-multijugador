export const DEFAULT_MUSIC_VOLUME = 0.2;
export const DEFAULT_SFX_VOLUME = 0.7;
export const DEFAULT_MUSIC_KEY = 'musica_in_game';

function clampVolume(value, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

export function readStoredVolume(storage, key, fallback) {
  const rawValue = storage?.getItem?.(key);
  if (rawValue === null || rawValue === undefined || rawValue === '') {
    return fallback;
  }

  return clampVolume(Number.parseFloat(rawValue), fallback);
}

export function readStoredMusicKey(storage, availableKeys = []) {
  const rawValue = String(storage?.getItem?.('selectedMusic') ?? '').trim();
  if (!rawValue) return DEFAULT_MUSIC_KEY;
  if (availableKeys.length > 0 && !availableKeys.includes(rawValue)) return DEFAULT_MUSIC_KEY;
  return rawValue;
}

export function getAudioSettings(storage, availableMusicKeys = []) {
  return {
    musicVolume: readStoredVolume(storage, 'musicVolume', DEFAULT_MUSIC_VOLUME),
    sfxVolume: readStoredVolume(storage, 'sfxVolume', DEFAULT_SFX_VOLUME),
    selectedMusic: readStoredMusicKey(storage, availableMusicKeys),
  };
}

export function saveMusicVolume(storage, value) {
  storage?.setItem?.('musicVolume', String(clampVolume(Number(value), DEFAULT_MUSIC_VOLUME)));
}

export function saveSfxVolume(storage, value) {
  storage?.setItem?.('sfxVolume', String(clampVolume(Number(value), DEFAULT_SFX_VOLUME)));
}

export function saveSelectedMusic(storage, value) {
  const musicKey = String(value ?? '').trim() || DEFAULT_MUSIC_KEY;
  storage?.setItem?.('selectedMusic', musicKey);
}
