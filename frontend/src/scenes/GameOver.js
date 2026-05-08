import Phaser from 'phaser';
import { getGameOverWinnerName, getGameOverPlayerNames } from './gameOverNames.js';
import { getGameOverRematchScene } from './gameOverRouting.js';
import { getPlayerCardTheme } from '../utils/playerIdentity.js';

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

        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over-screen';
        gameOverDiv.style.position = 'fixed';
        gameOverDiv.style.top = '0';
        gameOverDiv.style.left = '0';
        gameOverDiv.style.width = '100vw';
        gameOverDiv.style.height = '100vh';
        gameOverDiv.style.backgroundImage = "linear-gradient(160deg, rgba(11,18,45,0.88) 0%, rgba(18,38,79,0.88) 45%, rgba(27,47,106,0.88) 100%), url('bg.png')";
        gameOverDiv.style.backgroundSize = 'cover';
        gameOverDiv.style.backgroundPosition = 'center';
        gameOverDiv.style.backdropFilter = 'blur(12px)';
        gameOverDiv.style.zIndex = '1000';
        gameOverDiv.style.display = 'flex';
        gameOverDiv.style.alignItems = 'center';
        gameOverDiv.style.justifyContent = 'center';
        gameOverDiv.style.padding = '28px';
        gameOverDiv.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

        let winnerName = getGameOverWinnerName(data);
        let winnerClass;
        let winnerGradient;

        if (data.winner === 'EMPATE') {
            winnerClass = 'warning';
            winnerGradient = 'linear-gradient(135deg, rgba(241, 196, 15, 0.95) 0%, rgba(243, 156, 18, 0.95) 100%)';
        } else if (data.winner === 'J1') {
            winnerName = `${p1Player.label}: ${p1Player.name}`;
            winnerClass = 'danger';
            winnerGradient = 'linear-gradient(135deg, rgba(231, 76, 60, 0.95) 0%, rgba(245, 183, 177, 0.95) 100%)';
        } else {
            winnerName = `${p2Player.label}: ${p2Player.name}`;
            winnerClass = 'primary';
            winnerGradient = 'linear-gradient(135deg, rgba(52, 152, 219, 0.95) 0%, rgba(166, 226, 241, 0.95) 100%)';
        }

        let reasonText = '';
        if (data.reason === 'score') {
            reasonText = 'Ganador por puntuacion.';
        } else if (data.reason === 'lives') {
            reasonText = 'Ganador por dejar al rival sin vidas.';
        } else if (data.reason === 'time') {
            reasonText = 'El tiempo se ha agotado.';
        } else if (data.reason === 'tiebreaker') {
            reasonText = 'Ganador por muerte subita (5 frutas).';
        } else if (data.reason === 'hill') {
            reasonText = 'Ganador por dominar la zona.';
        } else if (data.reason === 'territory') {
            reasonText = 'Ganador por controlar mas territorio al final del tiempo.';
        } else if (data.reason === 'ctfCaptures') {
            reasonText = 'Ganador por capturar la bandera rival.';
        } else if (data.reason === 'ctfTime') {
            reasonText = data.winner === 'EMPATE' ? 'El tiempo se ha agotado con empate.' : 'Ganador por mas capturas al acabarse el tiempo.';
        }

        const mostrarVidas = data.showLives !== false && data.reason !== 'time' && data.reason !== 'tiebreaker';
        const scoreLabel = data.scoreLabel ?? (data.reason === 'territory' ? 'Territorio' : 'Puntuacion');
        const vidasJ1HTML = mostrarVidas ? `<div><span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">Vidas: ${data.p1Lives}</span></div>` : '';
        const vidasJ2HTML = mostrarVidas ? `<div><span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">Vidas: ${data.p2Lives}</span></div>` : '';

        const escenaRevancha = getGameOverRematchScene(data);
        gameOverDiv.innerHTML = `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-xl-5 col-lg-6 col-md-8">
                        <div class="card shadow" style="background: rgba(12, 18, 42, 0.95); border: 4px solid rgba(34, 211, 238, 0.75); border-radius: 28px; box-shadow: 0 26px 80px rgba(0,0,0,0.35);">
                            <div class="card-body p-5 text-center">
                                <h1 class="display-5 fw-bold text-white mb-2">PARTIDA TERMINADA</h1>
                                <p class="text-white mb-4">Revive el resultado final antes de volver a jugar.</p>

                                <div class="card h-100 mb-4 border-${winnerClass}" style="background: ${winnerGradient}; border-radius: 20px; border: 1px solid rgba(255,255,255,0.18);">
                                    <div class="card-body text-center py-4">
                                        <h5 class="card-title text-${winnerClass} fw-bold mb-2">Ganador</h5>
                                        <h4 class="text-${winnerClass} fw-bold mb-2">${winnerName}</h4>
                                        <p class="text-white mb-0">${reasonText}</p>
                                    </div>
                                </div>

                                <div class="row gx-3 gy-3 mb-4">
                                    <div class="col-6">
                                        <div class="card h-100" style="background: ${p1Theme.gradient}; border: 2px solid ${p1Theme.softBorder}; border-radius: 18px;">
                                            <div class="card-body text-center py-4">
                                                <h5 class="card-title fw-bold mb-3" style="color: ${p1Theme.textColor};">${p1Player.label}: ${p1Player.name}</h5>
                                                <div class="mb-3">
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">${scoreLabel}: ${data.p1Score}</span>
                                                </div>
                                                ${vidasJ1HTML}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="card h-100" style="background: ${p2Theme.gradient}; border: 2px solid ${p2Theme.softBorder}; border-radius: 18px;">
                                            <div class="card-body text-center py-4">
                                                <h5 class="card-title fw-bold mb-3" style="color: ${p2Theme.textColor};">${p2Player.label}: ${p2Player.name}</h5>
                                                <div class="mb-3">
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">${scoreLabel}: ${data.p2Score}</span>
                                                </div>
                                                ${vidasJ2HTML}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="d-flex flex-column flex-sm-row justify-content-center gap-3">
                                    <button id="new-match-btn" class="btn btn-lg px-5 py-3 fw-bold pixel-btn pixel-btn-accent" style="min-width: 160px;">Nueva Partida</button>
                                    <button id="menu-btn" class="btn btn-lg px-5 py-3 fw-bold pixel-btn pixel-btn-secondary" style="min-width: 160px;">Salir al Menu</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(gameOverDiv);

        document.getElementById('new-match-btn').addEventListener('click', () => {
            document.body.removeChild(gameOverDiv);
            this.game.canvas.style.display = 'block';
            this.scene.start(escenaRevancha);
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            document.body.removeChild(gameOverDiv);
            this.game.canvas.style.display = 'block';
            this.scene.start('MainMenu');
        });
    }
}
