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
