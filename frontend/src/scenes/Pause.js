import Phaser from 'phaser';
import { getPlayerCardTheme } from '../utils/playerIdentity.js';

export class Pause extends Phaser.Scene {
    constructor() {
        super('Pause');
    }

    create(data) {
        const callerScene = data.caller || 'LocalGame';
        const players = data?.players ?? {};
        const p1 = players.p1 ?? { label: 'Jugador 1', name: 'J1', color: 0xe74c3c };
        const p2 = players.p2 ?? { label: 'Jugador 2', name: 'J2', color: 0x3498db };
        const p1Theme = getPlayerCardTheme(p1.color);
        const p2Theme = getPlayerCardTheme(p2.color);

        const pauseDiv = document.createElement('div');
        pauseDiv.id = 'pause-screen';
        pauseDiv.style.position = 'fixed';
        pauseDiv.style.top = '0';
        pauseDiv.style.left = '0';
        pauseDiv.style.width = '100vw';
        pauseDiv.style.height = '100vh';
        pauseDiv.style.background = 'rgba(11,18,45,0.5)';
        pauseDiv.style.backdropFilter = 'blur(15px)';
        pauseDiv.style.zIndex = '1000';
        pauseDiv.style.display = 'flex';
        pauseDiv.style.alignItems = 'center';
        pauseDiv.style.justifyContent = 'center';
        pauseDiv.style.padding = '28px';
        pauseDiv.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

        const p1Score = data?.p1Score ?? 0;
        const p2Score = data?.p2Score ?? 0;
        const p1Lives = data?.p1Lives ?? 0;
        const p2Lives = data?.p2Lives ?? 0;
        const scoreLabel = data?.scoreLabel ?? 'Puntuación';

        pauseDiv.innerHTML = `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-xl-5 col-lg-6 col-md-8">
                        <div class="card shadow" style="background: rgba(12, 18, 42, 0.95); border: 4px solid rgba(34, 211, 238, 0.45); border-radius: 28px; box-shadow: 0 26px 80px rgba(0,0,0,0.35);">
                            <div class="card-body p-5 text-center">
                                <h1 class="display-5 fw-bold text-white mb-2">PAUSA</h1>
                                <p class="text-white mb-4">Pulsa ESC o usa los botones para continuar.</p>

                                <div class="row gx-3 gy-3 mb-4">
                                    <div class="col-6">
                                        <div class="card h-100" style="background: ${p1Theme.gradient}; border: 2px solid ${p1Theme.softBorder}; border-radius: 18px;">
                                            <div class="card-body text-center py-4">
                                                <h5 class="fw-bold mb-3" style="color: ${p1Theme.textColor};">${p1.label}: ${p1.name}</h5>
                                                <div class="mb-3">
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">${scoreLabel}: ${p1Score}</span>
                                                </div>
                                                <div>
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">Vidas restantes: ${p1Lives}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="card h-100" style="background: ${p2Theme.gradient}; border: 2px solid ${p2Theme.softBorder}; border-radius: 18px;">
                                            <div class="card-body text-center py-4">
                                                <h5 class="fw-bold mb-3" style="color: ${p2Theme.textColor};">${p2.label}: ${p2.name}</h5>
                                                <div class="mb-3">
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">${scoreLabel}: ${p2Score}</span>
                                                </div>
                                                <div>
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">Vidas restantes: ${p2Lives}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="d-flex flex-column flex-sm-row justify-content-center gap-3">
                                    <button id="resume-btn" class="btn btn-secondary px-5 py-3 fw-bold" style="border-radius: 50px; min-width: 180px;">Reanudar</button>
                                    <button id="menu-btn" class="btn btn-secondary px-5 py-3 fw-bold" style="border-radius: 50px; min-width: 180px;">Salir al Menú</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(pauseDiv);

        const removePauseOverlay = () => {
            if (document.body.contains(pauseDiv)) {
                document.body.removeChild(pauseDiv);
            }
        };

        const reanudarJuego = () => {
            removePauseOverlay();
            this.scene.stop();
            this.scene.resume(callerScene);
            const gameScene = this.scene.get(callerScene);
            if (gameScene) gameScene.isPaused = false;
        };

        document.getElementById('resume-btn').addEventListener('click', reanudarJuego);

        document.getElementById('menu-btn').addEventListener('click', () => {
            removePauseOverlay();
            this.scene.stop(callerScene);
            this.scene.start('MainMenu');
        });

        this.input.keyboard.on('keydown-ESC', reanudarJuego);
    }
}
