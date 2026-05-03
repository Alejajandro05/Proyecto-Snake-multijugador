import assert from 'node:assert/strict';
import test from 'node:test';

import { getTerritoryPlayers, shouldTerritoryMatchEndOnDeath } from '../territoryModeHelpers.js';

test('territory mode forces fixed red and blue player colors', () => {
    const players = getTerritoryPlayers({
        players: {
            p1: { name: 'Uno', color: 0x2ecc71, skinId: 'snake7' },
            p2: { name: 'Dos', color: 0xf1c40f, skinId: 'snake8' },
        },
    });

    assert.equal(players.p1.color, 0xe74c3c);
    assert.equal(players.p2.color, 0x3498db);
    assert.equal(players.p1.name, 'Uno');
    assert.equal(players.p2.name, 'Dos');
    assert.equal(players.p1.skinId, 'snake7');
    assert.equal(players.p2.skinId, 'snake8');
});

test('territory mode ends the match as soon as any player reaches zero lives', () => {
    assert.equal(shouldTerritoryMatchEndOnDeath({ lives: 1 }, { lives: 1 }), false);
    assert.equal(shouldTerritoryMatchEndOnDeath({ lives: 0 }, { lives: 1 }), true);
    assert.equal(shouldTerritoryMatchEndOnDeath({ lives: 1 }, { lives: 0 }), true);
    assert.equal(shouldTerritoryMatchEndOnDeath({ lives: 0 }, { lives: 0 }), true);
});
