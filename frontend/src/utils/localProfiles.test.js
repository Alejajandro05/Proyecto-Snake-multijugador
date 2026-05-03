import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ensureLocalPlayerProfile,
    getLocalLeaderboardEntries,
    loadLocalPlayerProfiles,
    recordLocalMatchResult,
    sanitizeLocalProfileName,
} from './localProfiles.js';

function createStorage(initial = {}) {
    const data = new Map(Object.entries(initial));
    return {
        getItem(key) {
            return data.has(key) ? data.get(key) : null;
        },
        setItem(key, value) {
            data.set(key, String(value));
        },
        removeItem(key) {
            data.delete(key);
        },
    };
}

test('creates local profiles once and reuses them case-insensitively', () => {
    const storage = createStorage();

    ensureLocalPlayerProfile(storage, '  Alex  ');
    ensureLocalPlayerProfile(storage, 'alex');

    assert.deepEqual(loadLocalPlayerProfiles(storage), [
        {
            name: 'alex',
            wins: 0,
            losses: 0,
            gamesPlayed: 0,
            lastPlayedAt: null,
        },
    ]);
});

test('records local wins, losses and played games', () => {
    const storage = createStorage();

    recordLocalMatchResult(storage, {
        p1Name: 'Alice',
        p2Name: 'Bob',
        winner: 'J1',
        playedAt: '2026-05-03T12:00:00.000Z',
    });

    assert.deepEqual(loadLocalPlayerProfiles(storage), [
        {
            name: 'Alice',
            wins: 1,
            losses: 0,
            gamesPlayed: 1,
            lastPlayedAt: '2026-05-03T12:00:00.000Z',
        },
        {
            name: 'Bob',
            wins: 0,
            losses: 1,
            gamesPlayed: 1,
            lastPlayedAt: '2026-05-03T12:00:00.000Z',
        },
    ]);
});

test('ties only increase local games played', () => {
    const storage = createStorage();

    recordLocalMatchResult(storage, {
        p1Name: 'Alice',
        p2Name: 'Bob',
        winner: 'EMPATE',
        playedAt: '2026-05-03T12:00:00.000Z',
    });

    assert.deepEqual(loadLocalPlayerProfiles(storage), [
        {
            name: 'Alice',
            wins: 0,
            losses: 0,
            gamesPlayed: 1,
            lastPlayedAt: '2026-05-03T12:00:00.000Z',
        },
        {
            name: 'Bob',
            wins: 0,
            losses: 0,
            gamesPlayed: 1,
            lastPlayedAt: '2026-05-03T12:00:00.000Z',
        },
    ]);
});

test('sorts the local leaderboard by wins, then fewer losses, then games played', () => {
    const storage = createStorage();

    recordLocalMatchResult(storage, { p1Name: 'Bob', p2Name: 'Alice', winner: 'J1', playedAt: '2026-05-03T12:00:00.000Z' });
    recordLocalMatchResult(storage, { p1Name: 'Bob', p2Name: 'Carla', winner: 'J1', playedAt: '2026-05-03T12:05:00.000Z' });
    recordLocalMatchResult(storage, { p1Name: 'Carla', p2Name: 'Alice', winner: 'J1', playedAt: '2026-05-03T12:10:00.000Z' });

    assert.deepEqual(
        getLocalLeaderboardEntries(storage).map((entry) => entry.name),
        ['Bob', 'Carla', 'Alice'],
    );
});

test('sanitizes local names to the setup limit', () => {
    assert.equal(sanitizeLocalProfileName('  Nombre Larguisimo de Prueba  '), 'Nombre Larguisim');
});
