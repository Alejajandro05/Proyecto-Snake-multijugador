const ONLINE_PREFS_KEY = 'snake-online-prefs';

const DEFAULT_ONLINE_PREFS = Object.freeze({
  playerName: '',
  hostSkinId: 'player1',
  guestSkinId: 'player1',
  rankedSkinId: 'player1',
  gameMode: 'normal',
  difficulty: 'normal',
  mapId: 'arena01',
  boardSizeId: 'medium',
  foodCountId: 'medium',
  visibility: 'public',
});

export function loadOnlinePrefs() {
  try {
    const raw = localStorage.getItem(ONLINE_PREFS_KEY);
    if (!raw) {
      return { ...DEFAULT_ONLINE_PREFS };
    }

    return { ...DEFAULT_ONLINE_PREFS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_ONLINE_PREFS };
  }
}

export function saveOnlinePrefs(nextPrefs) {
  const mergedPrefs = { ...DEFAULT_ONLINE_PREFS, ...nextPrefs };
  localStorage.setItem(ONLINE_PREFS_KEY, JSON.stringify(mergedPrefs));
  return mergedPrefs;
}

export function clearOnlinePrefs() {
  localStorage.removeItem(ONLINE_PREFS_KEY);
}
