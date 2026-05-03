function colorNumberToCssHex(colorNumber, fallback = '#ffffff') {
    const n = Number(colorNumber);
    if (!Number.isFinite(n)) return fallback;
    return `#${(n >>> 0 & 0xffffff).toString(16).padStart(6, '0')}`;
}

function hexToRgb(hex) {
    const normalized = String(hex ?? '').replace('#', '').trim();
    const safe = normalized.length === 6 ? normalized : 'ffffff';
    return {
        r: parseInt(safe.slice(0, 2), 16),
        g: parseInt(safe.slice(2, 4), 16),
        b: parseInt(safe.slice(4, 6), 16),
    };
}

export function buildPlayerIdentityMap(matchSettings) {
    const p1Color = matchSettings?.players?.p1?.color ?? 0xe74c3c;
    const p2Color = matchSettings?.players?.p2?.color ?? 0x3498db;

    return {
        p1: {
            key: 'p1',
            label: 'Jugador 1',
            name: matchSettings?.players?.p1?.name ?? 'J1',
            color: p1Color,
            colorHex: colorNumberToCssHex(p1Color),
        },
        p2: {
            key: 'p2',
            label: 'Jugador 2',
            name: matchSettings?.players?.p2?.name ?? 'J2',
            color: p2Color,
            colorHex: colorNumberToCssHex(p2Color),
        },
    };
}

export function getPlayerCardTheme(colorNumber) {
    const accentHex = colorNumberToCssHex(colorNumber);
    const { r, g, b } = hexToRgb(accentHex);
    return {
        accentHex,
        textColor: accentHex,
        softBorder: `rgba(${r}, ${g}, ${b}, 0.45)`,
        glowInset: `rgba(${r}, ${g}, ${b}, 0.20)`,
        gradient: `linear-gradient(135deg, rgba(${r}, ${g}, ${b}, 0.95) 0%, rgba(255,255,255,0.92) 100%)`,
    };
}

export function applyPlayerThemeToHud({ panelEl, titleEl, scoreEl, livesEl, colorNumber }) {
    const theme = getPlayerCardTheme(colorNumber);

    if (panelEl) {
        panelEl.style.borderColor = theme.softBorder;
        panelEl.style.boxShadow = `0 12px 40px rgba(0,0,0,0.35), 0 0 0 2px ${theme.glowInset} inset`;
    }
    if (titleEl) titleEl.style.color = theme.textColor;
    if (scoreEl) titleEl ? scoreEl.style.color = theme.textColor : scoreEl.style.color = theme.textColor;
    if (livesEl) livesEl.style.color = theme.textColor;

    return theme;
}
