import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_CONTROLS,
  VALID_KEYS,
  getControlsConfig,
  saveControlsConfig,
  resetControlsToDefault,
  isValidControlKey,
  updateControlKey
} from '../controlsConfig.js';

test('DEFAULT_CONTROLS has default keys for both players', () => {
  assert.ok(DEFAULT_CONTROLS.player1);
  assert.ok(DEFAULT_CONTROLS.player2);
  assert.equal(DEFAULT_CONTROLS.player1.up, 'W');
  assert.equal(DEFAULT_CONTROLS.player1.down, 'S');
  assert.equal(DEFAULT_CONTROLS.player1.left, 'A');
  assert.equal(DEFAULT_CONTROLS.player1.right, 'D');
  assert.equal(DEFAULT_CONTROLS.player2.up, 'UP');
  assert.equal(DEFAULT_CONTROLS.player2.down, 'DOWN');
  assert.equal(DEFAULT_CONTROLS.player2.left, 'LEFT');
  assert.equal(DEFAULT_CONTROLS.player2.right, 'RIGHT');
});

test('VALID_KEYS contains expected keys', () => {
  assert.ok(Array.isArray(VALID_KEYS));
  assert.ok(VALID_KEYS.length > 0);
  assert.ok(VALID_KEYS.includes('W'));
  assert.ok(VALID_KEYS.includes('UP'));
  assert.ok(VALID_KEYS.includes('SPACE'));
});

test('getControlsConfig returns default controls when nothing is saved', () => {
  const mockStorage = { getItem: () => null };
  const controls = getControlsConfig(mockStorage);
  assert.deepEqual(controls, DEFAULT_CONTROLS);
});

test('getControlsConfig returns saved controls from localStorage', () => {
  const customControls = {
    player1: { up: 'I', down: 'K', left: 'J', right: 'L' },
    player2: { up: 'W', down: 'S', left: 'A', right: 'D' }
  };
  const mockStorage = {
    getItem: () => JSON.stringify(customControls)
  };
  const controls = getControlsConfig(mockStorage);
  assert.deepEqual(controls, customControls);
});

test('getControlsConfig returns defaults if saved data is invalid', () => {
  const mockStorage = { getItem: () => 'invalid json' };
  const controls = getControlsConfig(mockStorage);
  assert.deepEqual(controls, DEFAULT_CONTROLS);
});

test('getControlsConfig returns defaults if structure is incomplete', () => {
  const mockStorage = {
    getItem: () => JSON.stringify({ player1: { up: 'W' } })
  };
  const controls = getControlsConfig(mockStorage);
  assert.deepEqual(controls, DEFAULT_CONTROLS);
});

test('saveControlsConfig saves controls to localStorage', () => {
  let savedData = null;
  const mockStorage = {
    setItem: (key, value) => {
      if (key === 'controlsConfig') savedData = value;
    }
  };
  const customControls = {
    player1: { up: 'I', down: 'K', left: 'J', right: 'L' },
    player2: { up: 'W', down: 'S', left: 'A', right: 'D' }
  };
  
  saveControlsConfig(mockStorage, customControls);
  
  assert.equal(savedData, JSON.stringify(customControls));
});

test('resetControlsToDefault resets controls and saves to localStorage', () => {
  let savedData = null;
  const mockStorage = {
    getItem: () => null,
    setItem: (key, value) => {
      if (key === 'controlsConfig') savedData = value;
    }
  };
  
  const result = resetControlsToDefault(mockStorage);
  
  assert.deepEqual(result, DEFAULT_CONTROLS);
  assert.equal(savedData, JSON.stringify(DEFAULT_CONTROLS));
});

test('isValidControlKey returns true for valid keys', () => {
  assert.equal(isValidControlKey('W'), true);
  assert.equal(isValidControlKey('UP'), true);
  assert.equal(isValidControlKey('SPACE'), true);
});

test('isValidControlKey returns false for invalid keys', () => {
  assert.equal(isValidControlKey('BACKSPACE'), false);
  assert.equal(isValidControlKey('INVALID'), false);
});

test('isValidControlKey is case-insensitive', () => {
  assert.equal(isValidControlKey('w'), true);
  assert.equal(isValidControlKey('up'), true);
});

test('updateControlKey updates a control key', () => {
  let savedData = null;
  const mockStorage = {
    getItem: () => savedData,
    setItem: (key, value) => {
      if (key === 'controlsConfig') savedData = value;
    }
  };
  
  const result = updateControlKey(mockStorage, 'player1', 'up', 'I');
  assert.equal(result.player1.up, 'I');
  assert.equal(JSON.parse(savedData).player1.up, 'I');
});

test('updateControlKey throws error for invalid player', () => {
  const mockStorage = { getItem: () => null, setItem: () => {} };
  assert.throws(
    () => updateControlKey(mockStorage, 'player3', 'up', 'W'),
    /Invalid player/
  );
});

test('updateControlKey throws error for invalid direction', () => {
  const mockStorage = { getItem: () => null, setItem: () => {} };
  assert.throws(
    () => updateControlKey(mockStorage, 'player1', 'diagonal', 'W'),
    /Invalid direction/
  );
});

test('updateControlKey throws error for invalid key', () => {
  const mockStorage = { getItem: () => null, setItem: () => {} };
  assert.throws(
    () => updateControlKey(mockStorage, 'player1', 'up', 'INVALID'),
    /Invalid key/
  );
});

test('updateControlKey throws error if key is already used', () => {
  const savedControls = {
    player1: { up: 'W', down: 'S', left: 'A', right: 'D' },
    player2: { up: 'I', down: 'K', left: 'J', right: 'L' }
  };
  const mockStorage = {
    getItem: () => JSON.stringify(savedControls),
    setItem: () => {}
  };
  
  assert.throws(
    () => updateControlKey(mockStorage, 'player1', 'down', 'I'),
    /already used/
  );
});

test('updateControlKey allows reassigning a key to itself', () => {
  let savedData = null;
  const savedControls = {
    player1: { up: 'W', down: 'S', left: 'A', right: 'D' },
    player2: { up: 'I', down: 'K', left: 'J', right: 'L' }
  };
  const mockStorage = {
    getItem: () => JSON.stringify(savedControls),
    setItem: (key, value) => {
      if (key === 'controlsConfig') savedData = value;
    }
  };
  
  assert.doesNotThrow(() => {
    updateControlKey(mockStorage, 'player1', 'up', 'W');
  });
});
