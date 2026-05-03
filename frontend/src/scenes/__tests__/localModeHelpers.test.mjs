import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
    resolveLocalSceneKey,
    normalizeLocalGameMode,
    shouldDieAtWall,
} from '../localModeHelpers.js';

test('routes normal mode to the wall-collision scene', () => {
    assert.equal(resolveLocalSceneKey('normal'), 'NormalLocalGame');
});

test('routes infinite mode to the existing local scene', () => {
    assert.equal(resolveLocalSceneKey('infinite'), 'LocalGame');
});

test('keeps special modes unchanged and falls back to normal mode', () => {
    assert.equal(resolveLocalSceneKey('timeAttack'), 'TimeAttackGame');
    assert.equal(resolveLocalSceneKey('chaos'), 'ChaosGame');
    assert.equal(resolveLocalSceneKey('kingOfTheHill'), 'KingOfTheHillGame');
    assert.equal(resolveLocalSceneKey('territory'), 'TerritoryGame');
    assert.equal(resolveLocalSceneKey('unknown-mode'), 'NormalLocalGame');
    assert.equal(resolveLocalSceneKey(), 'NormalLocalGame');
});

test('maps legacy classic saves to infinite mode', () => {
    assert.equal(normalizeLocalGameMode('classic'), 'infinite');
    assert.equal(normalizeLocalGameMode('infinite'), 'infinite');
    assert.equal(normalizeLocalGameMode('normal'), 'normal');
    assert.equal(normalizeLocalGameMode('territory'), 'territory');
});

test('local mode cards use deploy-safe image paths for infinite and chaos', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const setupPath = path.resolve(testDir, '../LocalGameSetup.js');
    const source = fs.readFileSync(setupPath, 'utf8');

    assert.equal(source.includes("img: '/assets/infinite_mode.png'"), false);
    assert.equal(source.includes("img: '/assets/ModoCaos2.png'"), false);
    assert.equal(source.includes("img: '/infinite_mode.png'"), true);
    assert.equal(source.includes("img: '/ModoCaos2.png'"), true);
});

test('detects when a move exits the board bounds', () => {
    const board = { gridSize: 32, gridCols: 32, gridRows: 24 };

    assert.equal(shouldDieAtWall({ x: 0, y: 0 }, 'left', board), true);
    assert.equal(shouldDieAtWall({ x: 0, y: 0 }, 'up', board), true);
    assert.equal(shouldDieAtWall({ x: 31 * 32, y: 0 }, 'right', board), true);
    assert.equal(shouldDieAtWall({ x: 0, y: 23 * 32 }, 'down', board), true);
    assert.equal(shouldDieAtWall({ x: 32, y: 0 }, 'left', board), false);
    assert.equal(shouldDieAtWall({ x: 0, y: 32 }, 'up', board), false);
});
