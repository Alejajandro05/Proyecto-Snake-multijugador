export class GameOver extends Phaser.Scene {
    constructor() {
        super('GameOver');
    }

    create(data) {
        const { width, height } = this.scale;

        // Ocultar el canvas y mostrar la interfaz HTML
        this.game.canvas.style.display = 'none';

        // Crear el contenedor principal
        const gameOverDiv = document.createElement('div');
        gameOverDiv.id = 'game-over-screen';
        gameOverDiv.style.position = 'fixed';
        gameOverDiv.style.top = '0';
        gameOverDiv.style.left = '0';
        gameOverDiv.style.width = '100vw';
        gameOverDiv.style.height = '100vh';
        gameOverDiv.style.background = 'rgba(12, 15, 36, 0.55)';
        gameOverDiv.style.backdropFilter = 'blur(8px)';
        gameOverDiv.style.zIndex = '1000';
        gameOverDiv.style.display = 'flex';
        gameOverDiv.style.alignItems = 'center';
        gameOverDiv.style.justifyContent = 'center';
        gameOverDiv.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

        // Contenido HTML con Bootstrap
        const winnerColor = data.winner === 'J1' ? '#e74c3c' : '#3498db';
        const winnerName = data.winner === 'J1' ? 'Jugador 1' : 'Jugador 2';

        let reasonText = '';
        if (data.reason === 'score') {
            reasonText = '¡Ganador por alcanzar la puntuación máxima!';
        } else if (data.reason === 'lives') {
            reasonText = '¡Ganador por el oponente quedarse sin vidas!';
        }

        gameOverDiv.innerHTML = `
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-xl-5 col-lg-6 col-md-8">
                        <div class="card shadow border-0" style="background: rgba(255, 255, 255, 0.97); border-radius: 24px;">
                            <div class="card-body p-5 text-center">
                                <h1 class="display-5 fw-bold text-dark mb-2">¡PARTIDA TERMINADA!</h1>
                                <p class="text-muted mb-4">Resumen del resultado final.</p>
                                <div class="card h-100 mb-4 ${data.winner === 'J1' ? 'border-danger' : 'border-primary'}" style="background: linear-gradient(135deg, ${data.winner === 'J1' ? '#ff9a9e 0%, #fecfef 100%' : '#a8edea 0%, #fed6e3 100%'}); border-radius: 18px;">
                                    <div class="card-body text-center py-4">
                                        <h5 class="card-title ${data.winner === 'J1' ? 'text-danger' : 'text-primary'} fw-bold mb-2">🏆 Ganador</h5>
                                        <h4 class="${data.winner === 'J1' ? 'text-danger' : 'text-primary'} fw-bold">${winnerName}</h4>
                                        <p class="text-muted mt-2"> ${reasonText}</p>
                                    </div>
                                </div>

                                <div class="row gx-3 gy-3 mb-4">
                                    <div class="col-6">
                                        <div class="card h-100 border-danger" style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); border-radius: 18px;">
                                            <div class="card-body text-center py-4">
                                                <h5 class="card-title text-danger fw-bold mb-3">Jugador 1</h5>
                                                <div class="mb-3">
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">Puntuación: ${data.p1Score}</span>
                                                </div>
                                                <div>
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">Vidas: ${data.p1Lives}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-6">
                                        <div class="card h-100 border-primary" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); border-radius: 18px;">
                                            <div class="card-body text-center py-4">
                                                <h5 class="card-title text-primary fw-bold mb-3">Jugador 2</h5>
                                                <div class="mb-3">
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">Puntuación: ${data.p2Score}</span>
                                                </div>
                                                <div>
                                                    <span class="badge bg-white text-dark fs-6 d-inline-block px-3 py-2 rounded-pill">Vidas: ${data.p2Lives}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="d-flex flex-column flex-sm-row justify-content-center gap-3">
                                    <button id="new-match-btn" class="btn btn-success btn-lg px-5 py-3 fw-bold" style="border-radius: 50px; min-width: 160px;">Nueva Partida</button>
                                    <button id="menu-btn" class="btn btn-secondary btn-lg px-5 py-3 fw-bold" style="border-radius: 50px; min-width: 160px;">Salir al Menú</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Agregar al body
        document.body.appendChild(gameOverDiv);

        // Event listeners para los botones
        document.getElementById('new-match-btn').addEventListener('click', () => {
            document.body.removeChild(gameOverDiv);
            this.game.canvas.style.display = 'block';
            this.scene.start('LocalGame');
        });

        document.getElementById('menu-btn').addEventListener('click', () => {
            document.body.removeChild(gameOverDiv);
            this.game.canvas.style.display = 'block';
            this.scene.start('MainMenu');
        });
    }
}
