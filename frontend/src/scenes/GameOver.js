import Phaser from 'phaser';
import { getGameOverWinnerName, getGameOverPlayerNames } from './gameOverNames.js';
import { getGameOverRematchScene } from './gameOverRouting.js';
import { getPlayerCardTheme } from '../utils/playerIdentity.js';
import { leaveActiveLobbyRoom } from '../net/lobbyClient.js';
import {
    arcadeButton,
    buildArcadeScreenStyles,
    mountArcadeOverlay,
    unmountArcadeOverlay,
} from '../ui/arcadeScreenStyles.js';

export class GameOver extends Phaser.Scene {
    constructor() {
        super('GameOver');
    }

    create(data) {
        this.game.canvas.style.display = 'none';

        const players = data?.players ?? {};
        const { p1Name, p2Name } = getGameOverPlayerNames(data);
        const p1Player = players.p1 ?? { label: 'Jugador 1', name: p1Name, color: 0xe74c3c };
        const p2Player = players.p2 ?? { label: 'Jugador 2', name: p2Name, color: 0x3498db };
        const p1Theme = getPlayerCardTheme(p1Player.color);
        const p2Theme = getPlayerCardTheme(p2Player.color);

        let winnerName = getGameOverWinnerName(data);
        const isTie = data.winner === 'EMPATE';

        const soloMode = data?.soloMode === true;

        if (soloMode) {
            winnerName = `${p1Player.name} — ${data.p1Score ?? 0} pts`;
        } else if (data.winner === 'J1') {
            winnerName = `${p1Player.label}: ${p1Player.name}`;
        } else if (data.winner === 'J2') {
            winnerName = `${p2Player.label}: ${p2Player.name}`;
        }
        const escenaRevancha = getGameOverRematchScene(data);
        const gameOverBadge = soloMode ? 'Juego solitario' : 'Duelo finalizado';
        const gameOverTitle = soloMode ? 'PARTIDA TERMINADA' : 'FIN DE PARTIDA';
        const gameOverSubtitle = soloMode ? 'Tu resultado en solitario' : 'Resultado de la partida';

        let reasonText = '';
        if (data.reason === 'solo') {
            reasonText = 'Te has quedado sin vidas. ¡Inténtalo de nuevo!';
        } else if (data.reason === 'score') {
            reasonText = 'Ganador por puntuación.';
        } else if (data.reason === 'lives') {
            reasonText = 'Ganador por dejar al rival sin vidas.';
        } else if (data.reason === 'time') {
            reasonText = 'El tiempo se ha agotado.';
        } else if (data.reason === 'tiebreaker') {
            reasonText = 'Ganador por muerte súbita (5 frutas).';
        } else if (data.reason === 'hill') {
            reasonText = 'Ganador por dominar la zona.';
        } else if (data.reason === 'territory') {
            reasonText = 'Ganador por controlar más territorio al final del tiempo.';
        } else if (data.reason === 'ctfCaptures') {
            reasonText = 'Ganador por capturar la bandera rival.';
        } else if (data.reason === 'ctfTime') {
            reasonText = data.winner === 'EMPATE' ? 'El tiempo se ha agotado con empate.' : 'Ganador por más capturas al acabarse el tiempo.';
        }

        const mostrarVidas = data.showLives !== false && data.reason !== 'time' && data.reason !== 'tiebreaker';
        const scoreLabel = data.scoreLabel ?? (data.reason === 'territory' ? 'Territorio' : 'Puntuación');
        const vidasJ1HTML = mostrarVidas ? `<span class="arcade-stat">Vidas: ${data.p1Lives}</span>` : '';
        const vidasJ2HTML = mostrarVidas ? `<span class="arcade-stat">Vidas: ${data.p2Lives}</span>` : '';

        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over-screen';

        gameOverDiv.innerHTML = `
            <style>${buildArcadeScreenStyles('#game-over-screen', { duelBackground: true, arcadeEnhanced: true })}</style>
            <article class="arcade-card arcade-screen-card" aria-label="Fin de partida">
                <header class="arcade-screen-header">
                    <span class="arcade-screen-badge">${gameOverBadge}</span>
                    <h1 class="arcade-title">${gameOverTitle}</h1>
                    <p class="arcade-subtitle">${gameOverSubtitle}</p>
                </header>

                <div class="arcade-winner ${isTie ? 'is-tie' : ''}">
                    <p class="arcade-winner-label">${soloMode ? 'Tu puntuación' : (isTie ? 'Empate' : 'Ganador')}</p>
                    <p class="arcade-winner-name">${winnerName}</p>
                    <p class="arcade-winner-reason">${reasonText}</p>
                </div>

                <div class="arcade-players">
                    <div class="arcade-player-card" style="--player-accent:${p1Theme.accentHex};">
                        <p class="arcade-player-name"><span class="player-color-tag">${p1Player.label}</span>: ${p1Player.name}</p>
                        <span class="arcade-stat">${scoreLabel}: ${data.p1Score}</span>
                        ${vidasJ1HTML}
                    </div>
                    <div class="arcade-player-card" style="--player-accent:${p2Theme.accentHex};">
                        <p class="arcade-player-name"><span class="player-color-tag">${p2Player.label}</span>: ${p2Player.name}</p>
                        <span class="arcade-stat">${scoreLabel}: ${data.p2Score}</span>
                        ${vidasJ2HTML}
                    </div>
                </div>

                <div class="arcade-actions is-row">
                    ${arcadeButton('new-match-btn', 'NUEVA PARTIDA', 'primary')}
                    ${arcadeButton('menu-btn', 'SALIR AL MENÚ', 'secondary')}
                </div>
            </article>
        `;

        mountArcadeOverlay(gameOverDiv);

        if (soloMode) {
            const playerCards = gameOverDiv.querySelectorAll('.arcade-players .arcade-player-card');
            if (playerCards.length > 1) playerCards[1].remove();
            const playersRow = gameOverDiv.querySelector('.arcade-players');
            if (playersRow) {
                playersRow.style.gridTemplateColumns = '1fr';
                playersRow.style.maxWidth = '320px';
                playersRow.style.margin = '0 auto 16px';
            }
        }

        const closeOverlay = () => {
            unmountArcadeOverlay(gameOverDiv);
            this.game.canvas.style.display = 'block';
        };

        gameOverDiv.querySelector('#new-match-btn')?.addEventListener('click', () => {
            closeOverlay();
            this.scene.start(escenaRevancha, data?.rematchData ?? undefined);
        });

        gameOverDiv.querySelector('#menu-btn')?.addEventListener('click', async () => {
            if (data?.leaveActiveLobby) {
                await leaveActiveLobbyRoom();
            }
            closeOverlay();
            this.scene.start('MainMenu');
        });
    }
}
