export const DUEL_BACKGROUND_URL = './assets/fondo_duelo.png';

/** Estilos compartidos para overlays (pausa, game over, menús). */
export function buildArcadeScreenStyles(scope, { duelBackground = false, arcadeEnhanced = false, liveGameBackdrop = false } = {}) {
    const overlayBackground = liveGameBackdrop
        ? 'rgba(2, 6, 23, 0.32)'
        : duelBackground
            ? 'transparent'
            : 'rgba(2, 6, 23, 0.62)';
    const overlayBlur = liveGameBackdrop
        ? 'blur(7px)'
        : duelBackground
            ? 'none'
            : 'blur(10px)';
    const duelBackdropStyles = duelBackground && !liveGameBackdrop ? `
        ${scope}::before {
            content: '';
            position: absolute;
            inset: -8px;
            background: url('${DUEL_BACKGROUND_URL}') center/cover no-repeat;
            filter: blur(${arcadeEnhanced ? 7 : 14}px) brightness(${arcadeEnhanced ? 0.72 : 0.42}) saturate(${arcadeEnhanced ? 1.05 : 0.9});
            transform: scale(1.04);
            z-index: 0;
        }

        ${scope}::after {
            content: '';
            position: absolute;
            inset: 0;
            background: ${arcadeEnhanced
        ? `linear-gradient(
                180deg,
                rgba(2, 6, 23, 0.38) 0%,
                rgba(15, 23, 42, 0.48) 55%,
                rgba(49, 12, 53, 0.42) 100%
            )`
        : `linear-gradient(
                rgba(2, 6, 23, 0.72),
                rgba(15, 23, 42, 0.78)
            )`};
            z-index: 1;
        }

        ${scope} > * {
            position: relative;
            z-index: 2;
        }
    ` : '';

    const arcadeEnhancedStyles = arcadeEnhanced ? `
        ${scope} .arcade-screen-card {
            position: relative;
            border: 2px solid rgba(246, 125, 49, 0.85);
            border-radius: 20px;
            background:
                linear-gradient(180deg, rgba(17, 24, 39, 0.94) 0%, rgba(49, 12, 53, 0.9) 100%);
            box-shadow:
                0 0 0 1px rgba(253, 230, 138, 0.12) inset,
                0 22px 50px rgba(0, 0, 0, 0.5),
                0 0 32px rgba(246, 125, 49, 0.22);
            animation: arcade-screen-card-in 0.45s cubic-bezier(0.22, 1, 0.36, 1);
        }

        ${scope} .arcade-screen-card::before,
        ${scope} .arcade-screen-card::after {
            content: '';
            position: absolute;
            width: 28px;
            height: 28px;
            border: 3px solid rgba(253, 230, 138, 0.55);
            pointer-events: none;
        }

        ${scope} .arcade-screen-card::before {
            top: 10px;
            left: 10px;
            border-right: none;
            border-bottom: none;
            border-radius: 6px 0 0 0;
        }

        ${scope} .arcade-screen-card::after {
            bottom: 10px;
            right: 10px;
            border-left: none;
            border-top: none;
            border-radius: 0 0 6px 0;
        }

        @keyframes arcade-screen-card-in {
            from {
                opacity: 0;
                transform: translateY(18px) scale(0.97);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        ${scope} .arcade-screen-header {
            text-align: center;
            margin-bottom: 18px;
        }

        ${scope} .arcade-screen-badge {
            display: inline-block;
            margin-bottom: 8px;
            padding: 5px 14px;
            border-radius: 999px;
            border: 1px solid rgba(246, 125, 49, 0.65);
            background: linear-gradient(90deg, rgba(222, 26, 88, 0.35), rgba(143, 1, 119, 0.35));
            color: #FDE68A;
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.14em;
            text-transform: uppercase;
        }

        ${scope} .arcade-title {
            font-size: clamp(2.6rem, 8vw, 3.4rem);
            letter-spacing: 2px;
            text-shadow:
                0 0 18px rgba(246, 125, 49, 0.55),
                0 2px 0 rgba(0, 0, 0, 0.35);
        }

        ${scope} .arcade-subtitle {
            margin-bottom: 0;
            color: #94A3B8;
            font-size: 0.85rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        ${scope} .arcade-winner {
            position: relative;
            overflow: hidden;
            padding: 20px 16px;
            border-radius: 14px;
            border: 2px solid rgba(246, 125, 49, 0.7);
            background:
                radial-gradient(circle at 50% 0%, rgba(246, 125, 49, 0.22), transparent 58%),
                linear-gradient(135deg, rgba(222, 26, 88, 0.42), rgba(143, 1, 119, 0.36));
            box-shadow: 0 0 24px rgba(246, 125, 49, 0.18);
        }

        ${scope} .arcade-winner::before {
            content: '🏆';
            display: block;
            font-size: 1.6rem;
            margin-bottom: 6px;
            filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.4));
        }

        ${scope} .arcade-winner.is-tie::before {
            content: '⚔️';
        }

        ${scope} .arcade-winner-name {
            font-size: clamp(1.85rem, 6vw, 2.35rem);
            text-shadow: 0 0 14px rgba(253, 230, 138, 0.35);
        }

        ${scope} .arcade-player-card {
            background: rgba(8, 12, 28, 0.78);
            border: 1px solid rgba(255, 255, 255, 0.16);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        ${scope} .arcade-player-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35), 0 0 14px var(--player-accent);
        }

        ${scope} .arcade-stat {
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.22));
            border-color: rgba(246, 125, 49, 0.28);
            font-family: 'Teko', sans-serif;
            font-size: 1rem;
            letter-spacing: 0.04em;
        }

        ${scope} .arcade-btn {
            letter-spacing: 0.04em;
            text-transform: uppercase;
            box-shadow: 0 6px 0 rgba(0, 0, 0, 0.28);
        }

        ${scope} .arcade-btn:active {
            transform: translateY(2px) scale(0.99);
            box-shadow: 0 2px 0 rgba(0, 0, 0, 0.28);
        }

        ${scope} .arcade-btn-primary {
            background: linear-gradient(180deg, #F67D31 0%, #DE1A58 48%, #8F0177 100%);
        }

        ${scope} .arcade-btn-primary:hover {
            box-shadow: 0 6px 0 rgba(0, 0, 0, 0.28), 0 0 20px rgba(246, 125, 49, 0.45);
        }

        ${scope} .arcade-section {
            border: 1px solid rgba(246, 125, 49, 0.28);
            background:
                linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0.18));
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }

        ${scope} .arcade-section-title {
            letter-spacing: 0.1em;
            text-shadow: 0 0 10px rgba(246, 125, 49, 0.25);
        }

        ${scope} .form-range {
            height: 0.45rem;
        }
    ` : '';

    return `
        ${scope} {
            position: absolute;
            inset: 0;
            z-index: 10050;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: clamp(14px, 3vw, 28px);
            box-sizing: border-box;
            background: ${overlayBackground};
            backdrop-filter: ${overlayBlur};
            font-family: 'Montserrat', sans-serif;
            overflow: hidden;
        }

        ${duelBackdropStyles}

        ${arcadeEnhancedStyles}

        ${scope} .arcade-card {
            width: min(560px, 100%);
            max-height: min(92vh, 820px);
            overflow-y: auto;
            padding: clamp(22px, 4vw, 30px);
            border: 2px solid rgba(246, 125, 49, 0.65);
            border-radius: 16px;
            background: linear-gradient(180deg, rgba(17, 24, 39, 0.97), rgba(49, 12, 53, 0.93));
            box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45), 0 0 22px rgba(246, 125, 49, 0.14);
            color: #F8FAFC;
        }

        ${scope} .arcade-card::-webkit-scrollbar {
            width: 6px;
        }

        ${scope} .arcade-card::-webkit-scrollbar-thumb {
            background: rgba(246, 125, 49, 0.5);
            border-radius: 999px;
        }

        ${scope} .arcade-title {
            margin: 0 0 6px;
            color: #FDE68A;
            font-family: 'Teko', sans-serif;
            font-size: clamp(2.25rem, 7vw, 3rem);
            font-weight: 700;
            letter-spacing: 1px;
            line-height: 1;
            text-align: center;
            text-shadow: 0 0 12px rgba(246, 125, 49, 0.35);
        }

        ${scope} .arcade-subtitle {
            margin: 0 0 20px;
            color: #CBD5E1;
            font-size: 0.9rem;
            font-weight: 600;
            text-align: center;
            line-height: 1.4;
        }

        ${scope} .arcade-players {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-bottom: 16px;
        }

        @media (max-width: 520px) {
            ${scope} .arcade-players {
                grid-template-columns: 1fr;
            }
        }

        ${scope} .arcade-player-card {
            --player-accent: #F67D31;
            position: relative;
            border-radius: 12px;
            padding: 14px 12px;
            text-align: center;
            background: rgba(10, 15, 30, 0.92);
            border: 1px solid rgba(255, 255, 255, 0.14);
            border-left: 4px solid var(--player-accent);
            box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.04);
        }

        ${scope} .arcade-player-card::after {
            content: '';
            position: absolute;
            top: 12px;
            right: 12px;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--player-accent);
            box-shadow: 0 0 10px var(--player-accent);
        }

        ${scope} .arcade-player-name {
            margin: 0 0 10px;
            padding-right: 18px;
            color: #F8FAFC;
            font-size: 0.95rem;
            font-weight: 800;
            line-height: 1.35;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
        }

        ${scope} .arcade-player-name .player-color-tag {
            color: var(--player-accent);
        }

        ${scope} .arcade-stat {
            display: block;
            margin: 0 auto 8px;
            width: fit-content;
            padding: 6px 12px;
            border-radius: 999px;
            background: rgba(0, 0, 0, 0.28);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #F8FAFC;
            font-size: 0.82rem;
            font-weight: 700;
        }

        ${scope} .arcade-stat:last-child {
            margin-bottom: 0;
        }

        ${scope} .arcade-section {
            margin-bottom: 16px;
            padding: 14px 16px;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        ${scope} .arcade-section-title {
            margin: 0 0 12px;
            color: #FDE68A;
            font-size: 0.88rem;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            text-align: center;
        }

        ${scope} .arcade-label {
            display: block;
            margin-bottom: 6px;
            color: #E2E8F0;
            font-size: 0.82rem;
            font-weight: 700;
        }

        ${scope} .form-range {
            accent-color: #F67D31;
        }

        ${scope} .form-select {
            background-color: rgba(15, 23, 42, 0.9) !important;
            border-color: rgba(255, 255, 255, 0.2) !important;
            color: white !important;
        }

        ${scope} .arcade-winner {
            margin-bottom: 16px;
            padding: 16px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid rgba(246, 125, 49, 0.55);
            background: linear-gradient(135deg, rgba(222, 26, 88, 0.35), rgba(143, 1, 119, 0.28));
        }

        ${scope} .arcade-winner.is-tie {
            border-color: rgba(253, 230, 138, 0.7);
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(234, 88, 12, 0.22));
        }

        ${scope} .arcade-winner-label {
            margin: 0 0 6px;
            color: #F67D31;
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
        }

        ${scope} .arcade-winner.is-tie .arcade-winner-label {
            color: #FDE68A;
        }

        ${scope} .arcade-winner-name {
            margin: 0 0 6px;
            color: #FDE68A;
            font-family: 'Teko', sans-serif;
            font-size: clamp(1.6rem, 5vw, 2rem);
            font-weight: 700;
            line-height: 1.1;
        }

        ${scope} .arcade-winner-reason {
            margin: 0;
            color: #E2E8F0;
            font-size: 0.88rem;
            font-weight: 600;
        }

        ${scope} .arcade-actions {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
        }

        @media (min-width: 480px) {
            ${scope} .arcade-actions.is-row {
                flex-direction: row;
                justify-content: center;
                flex-wrap: wrap;
            }
        }

        ${scope} .arcade-btn {
            width: 100%;
            max-width: 260px;
            padding: 12px 18px;
            border: 2px solid #F67D31;
            border-radius: 12px;
            color: white;
            font-family: 'Montserrat', sans-serif;
            font-size: 1.05rem;
            font-weight: 700;
            cursor: pointer;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        ${scope} .arcade-btn:hover {
            transform: scale(1.03);
        }

        ${scope} .arcade-btn-primary {
            background: linear-gradient(90deg, #DE1A58, #8F0177);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
        }

        ${scope} .arcade-btn-secondary {
            background: #1A05A2;
            border-color: #F67D31;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
        }

        ${scope} .arcade-btn-muted {
            background: #334155;
            border-color: #94A3B8;
        }
    `;
}

export function arcadeButton(id, label, variant = 'primary') {
    const variantClass = variant === 'secondary'
        ? 'arcade-btn-secondary'
        : variant === 'muted'
            ? 'arcade-btn-muted'
            : 'arcade-btn-primary';

    return `<button id="${id}" type="button" class="arcade-btn ${variantClass}">${label}</button>`;
}

export function getArcadeOverlayContainer() {
    return document.getElementById('game-container') ?? document.body;
}

export function mountArcadeOverlay(element) {
    getArcadeOverlayContainer().appendChild(element);
}

export function unmountArcadeOverlay(element) {
    const container = getArcadeOverlayContainer();
    if (container.contains(element)) {
        container.removeChild(element);
    }
}
