const TERRITORY_P1_COLOR = 0xe74c3c;
const TERRITORY_P2_COLOR = 0x3498db;

export function getTerritoryPlayers(matchSettings) {
    const p1 = matchSettings?.players?.p1 ?? {};
    const p2 = matchSettings?.players?.p2 ?? {};

    return {
        p1: {
            name: p1.name ?? 'J1',
            skinId: p1.skinId,
            color: TERRITORY_P1_COLOR,
        },
        p2: {
            name: p2.name ?? 'J2',
            skinId: p2.skinId,
            color: TERRITORY_P2_COLOR,
        },
    };
}

export function shouldTerritoryMatchEndOnDeath(p1, p2) {
    return (Number(p1?.lives) || 0) <= 0 || (Number(p2?.lives) || 0) <= 0;
}
