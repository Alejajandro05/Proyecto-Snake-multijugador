import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPlayerIdentityMap, getPlayerCardTheme } from '../playerIdentity.js';

test('buildPlayerIdentityMap keeps each player name and chosen color together', () => {
    const identities = buildPlayerIdentityMap({
        players: {
            p1: { name: 'Azul', color: 0x3498db },
            p2: { name: 'Verde', color: 0x2ecc71 },
        },
    });

    assert.equal(identities.p1.name, 'Azul');
    assert.equal(identities.p1.colorHex, '#3498db');
    assert.equal(identities.p2.name, 'Verde');
    assert.equal(identities.p2.colorHex, '#2ecc71');
});

test('getPlayerCardTheme derives readable colors from the selected player color', () => {
    const theme = getPlayerCardTheme(0x2ecc71);

    assert.equal(theme.accentHex, '#2ecc71');
    assert.match(theme.gradient, /rgba\(46, 204, 113, 0\.95\)/i);
    assert.match(theme.softBorder, /rgba\(/i);
});
