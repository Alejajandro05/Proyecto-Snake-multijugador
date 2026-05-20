import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

test('online game joins the match room created by the lobby instead of creating a default snake room', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const onlineGamePath = path.resolve(testDir, '../modes/OnlineGame.js');
    const source = fs.readFileSync(onlineGamePath, 'utf8');

    assert.equal(source.includes("joinOrCreate('snake_room')"), false);
    assert.equal(source.includes("joinSnakeRoomById(this.matchRoomId, options)"), true);
});

test('online lobby passes the selected mode into the online match scene', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const onlineMenuPath = path.resolve(testDir, '../OnlineMenu.js');
    const source = fs.readFileSync(onlineMenuPath, 'utf8');

    assert.match(source, /gameMode:\s*state\.gameMode/);
});

test('online game renders the joined room initial state before waiting for patches', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const onlineGamePath = path.resolve(testDir, '../modes/OnlineGame.js');
    const source = fs.readFileSync(onlineGamePath, 'utf8');

    assert.match(source, /this\.renderState\(this\.room\.state\)/);
});

test('ranked matchmaking sends and reuses the selected competitive skin', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const onlineMenuPath = path.resolve(testDir, '../OnlineMenu.js');
    const source = fs.readFileSync(onlineMenuPath, 'utf8');

    assert.match(source, /rankedSkinId/);
    assert.match(source, /skinId:\s*this\.prefs\.rankedSkinId/);
    assert.match(source, /skinId:\s*data\.skinId/);
});

test('online leaderboard wins are recorded only for ranked matches', () => {
    const testDir = path.dirname(fileURLToPath(import.meta.url));
    const onlineGamePath = path.resolve(testDir, '../modes/OnlineGame.js');
    const source = fs.readFileSync(onlineGamePath, 'utf8');

    assert.match(source, /if\s*\(!this\.latestState\?\.isRanked\)\s*return/);
});
