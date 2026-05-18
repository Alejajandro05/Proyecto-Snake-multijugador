import {
    arcadeButton,
    buildArcadeScreenStyles,
    mountArcadeOverlay,
    unmountArcadeOverlay,
} from './arcadeScreenStyles.js';

/**
 * Muestra confirmación antes de abandonar una partida online.
 * @returns {Promise<boolean>} true si el jugador confirma salir
 */
export function showOnlineExitConfirm() {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.id = 'online-exit-confirm';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'online-exit-title');

        overlay.innerHTML = `
            <style>${buildArcadeScreenStyles('#online-exit-confirm', { arcadeEnhanced: true, liveGameBackdrop: true })}</style>
            <article class="arcade-card arcade-screen-card" style="width: min(440px, 100%);">
                <header class="arcade-screen-header">
                    <span class="arcade-screen-badge">Partida online</span>
                    <h1 id="online-exit-title" class="arcade-title" style="font-size: clamp(2rem, 6vw, 2.6rem);">¿SALIR?</h1>
                    <p class="arcade-subtitle">Vas a abandonar la partida en curso. El rival puede quedarse sin oponente.</p>
                </header>
                <div class="arcade-actions is-row">
                    ${arcadeButton('online-exit-cancel-btn', 'SEGUIR JUGANDO', 'secondary')}
                    ${arcadeButton('online-exit-confirm-btn', 'SALIR DE LA PARTIDA', 'primary')}
                </div>
            </article>
        `;

        const finish = (confirmed) => {
            document.removeEventListener('keydown', onKeyDown);
            unmountArcadeOverlay(overlay);
            resolve(confirmed);
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                finish(false);
            }
        };

        overlay.querySelector('#online-exit-cancel-btn')?.addEventListener('click', () => finish(false));
        overlay.querySelector('#online-exit-confirm-btn')?.addEventListener('click', () => finish(true));

        document.addEventListener('keydown', onKeyDown);
        mountArcadeOverlay(overlay);
        overlay.querySelector('#online-exit-cancel-btn')?.focus();
    });
}
