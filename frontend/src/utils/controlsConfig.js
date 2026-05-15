// Default control keys for both players
export const DEFAULT_CONTROLS = {
  player1: {
    up: 'W',
    down: 'S',
    left: 'A',
    right: 'D'
  },
  player2: {
    up: 'UP',
    down: 'DOWN',
    left: 'LEFT',
    right: 'RIGHT'
  }
};

// Valid key codes that can be used for controls
export const VALID_KEYS = [
  'W', 'A', 'S', 'D',
  'UP', 'DOWN', 'LEFT', 'RIGHT',
  'I', 'J', 'K', 'L',
  'Z', 'X', 'C', 'V',
  'SPACE', 'ENTER',
  'Q', 'E', 'R', 'T',
  'U', 'O', 'P'
];

/**
 * Get saved controls from localStorage or return defaults
 * @param {Storage} storage - localStorage object
 * @returns {Object} Controls configuration with player1 and player2
 */
export function getControlsConfig(storage) {
  try {
    const saved = storage?.getItem?.('controlsConfig');
    if (!saved) return { ...DEFAULT_CONTROLS };
    
    const parsed = JSON.parse(saved);
    // Validate structure
    if (parsed.player1 && parsed.player2) {
      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse controlsConfig:', e);
  }
  return { ...DEFAULT_CONTROLS };
}

/**
 * Save controls configuration to localStorage
 * @param {Storage} storage - localStorage object
 * @param {Object} controls - Controls configuration
 */
export function saveControlsConfig(storage, controls) {
  try {
    storage?.setItem?.('controlsConfig', JSON.stringify(controls));
  } catch (e) {
    console.error('Failed to save controlsConfig:', e);
  }
}

/**
 * Reset controls to default and save to localStorage
 * @param {Storage} storage - localStorage object
 * @returns {Object} Default controls
 */
export function resetControlsToDefault(storage) {
  const defaultControls = { ...DEFAULT_CONTROLS };
  saveControlsConfig(storage, defaultControls);
  return defaultControls;
}

/**
 * Check if a key is valid for control configuration
 * @param {string} key - The key to validate
 * @returns {boolean} True if key is valid
 */
export function isValidControlKey(key) {
  return VALID_KEYS.includes(String(key).toUpperCase());
}

/**
 * Update a single control key
 * @param {Storage} storage - localStorage object
 * @param {string} player - 'player1' or 'player2'
 * @param {string} direction - 'up', 'down', 'left', 'right'
 * @param {string} key - The new key code
 * @returns {Object} Updated controls configuration
 */
export function updateControlKey(storage, player, direction, key) {
  const controls = getControlsConfig(storage);
  const validKey = String(key).toUpperCase();
  
  if (!['player1', 'player2'].includes(player)) {
    throw new Error('Invalid player: must be player1 or player2');
  }
  
  if (!['up', 'down', 'left', 'right'].includes(direction)) {
    throw new Error('Invalid direction: must be up, down, left, or right');
  }
  
  if (!isValidControlKey(validKey)) {
    throw new Error(`Invalid key: ${key}`);
  }
  
  // Check if key is already used
  for (const p in controls) {
    for (const dir in controls[p]) {
      if (controls[p][dir] === validKey && !(p === player && dir === direction)) {
        throw new Error(`Key ${validKey} is already used`);
      }
    }
  }
  
  controls[player][direction] = validKey;
  saveControlsConfig(storage, controls);
  return controls;
}
