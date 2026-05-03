const STORAGE_KEY = 'localPlayerProfiles.v1';
const MAX_NAME_LENGTH = 16;

function createEmptyProfile(name) {
    const safeName = sanitizeLocalProfileName(name);
    return {
        name: safeName,
        wins: 0,
        losses: 0,
        gamesPlayed: 0,
        lastPlayedAt: null,
    };
}

function toProfileId(name) {
    return sanitizeLocalProfileName(name).toLowerCase();
}

export function sanitizeLocalProfileName(value) {
    return String(value ?? '').trim().slice(0, MAX_NAME_LENGTH);
}

function normalizeProfile(input) {
    const name = sanitizeLocalProfileName(input?.name);
    if (!name) return null;

    return {
        name,
        wins: Math.max(0, Number(input?.wins) || 0),
        losses: Math.max(0, Number(input?.losses) || 0),
        gamesPlayed: Math.max(0, Number(input?.gamesPlayed) || 0),
        lastPlayedAt: input?.lastPlayedAt ? String(input.lastPlayedAt) : null,
    };
}

function saveProfiles(storage, profiles) {
    storage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function loadLocalPlayerProfiles(storage = localStorage) {
    try {
        const raw = storage.getItem(STORAGE_KEY);
        if (!raw) return [];

        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];

        return parsed
            .map(normalizeProfile)
            .filter(Boolean)
            .sort((first, second) => first.name.localeCompare(second.name, 'es', { sensitivity: 'base' }));
    } catch {
        return [];
    }
}

export function ensureLocalPlayerProfile(storage = localStorage, name) {
    const safeName = sanitizeLocalProfileName(name);
    if (!safeName) return null;

    const profiles = loadLocalPlayerProfiles(storage);
    const profileId = toProfileId(safeName);
    const existingIndex = profiles.findIndex((profile) => toProfileId(profile.name) === profileId);

    if (existingIndex >= 0) {
        const existing = profiles[existingIndex];
        if (existing.name !== safeName) {
            profiles[existingIndex] = { ...existing, name: safeName };
            saveProfiles(storage, profiles);
            return profiles[existingIndex];
        }
        return existing;
    }

    const created = createEmptyProfile(safeName);
    profiles.push(created);
    saveProfiles(storage, profiles);
    return created;
}

export function recordLocalMatchResult(storage = localStorage, result = {}) {
    const p1Name = sanitizeLocalProfileName(result.p1Name);
    const p2Name = sanitizeLocalProfileName(result.p2Name);
    const winner = String(result.winner ?? '').toUpperCase();
    const playedAt = result.playedAt ? String(result.playedAt) : new Date().toISOString();

    const profiles = loadLocalPlayerProfiles(storage);
    const profileMap = new Map(profiles.map((profile) => [toProfileId(profile.name), { ...profile }]));

    const touchProfile = (name) => {
        if (!name) return null;
        const id = toProfileId(name);
        const current = profileMap.get(id) ?? createEmptyProfile(name);
        const next = { ...current, name };
        profileMap.set(id, next);
        return next;
    };

    const p1 = touchProfile(p1Name);
    const p2 = touchProfile(p2Name);

    if (p1) {
        p1.gamesPlayed += 1;
        p1.lastPlayedAt = playedAt;
    }
    if (p2) {
        p2.gamesPlayed += 1;
        p2.lastPlayedAt = playedAt;
    }

    if (winner === 'J1' && p1) {
        p1.wins += 1;
        if (p2) p2.losses += 1;
    } else if (winner === 'J2' && p2) {
        p2.wins += 1;
        if (p1) p1.losses += 1;
    }

    const updatedProfiles = Array.from(profileMap.values())
        .map(normalizeProfile)
        .filter(Boolean)
        .sort((first, second) => first.name.localeCompare(second.name, 'es', { sensitivity: 'base' }));

    saveProfiles(storage, updatedProfiles);
    return updatedProfiles;
}

export function getLocalLeaderboardEntries(storage = localStorage) {
    return loadLocalPlayerProfiles(storage)
        .slice()
        .sort((first, second) => {
            if (second.wins !== first.wins) return second.wins - first.wins;
            if (first.losses !== second.losses) return first.losses - second.losses;
            if (second.gamesPlayed !== first.gamesPlayed) return second.gamesPlayed - first.gamesPlayed;
            return first.name.localeCompare(second.name, 'es', { sensitivity: 'base' });
        });
}
