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
        gameOverDiv.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
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
                    <div class="col-lg-8 col-md-10">
                        <div class="card shadow-lg border-0" style="background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);">
                            <div class="card-body p-5">
                                <div class="text-center mb-4">
                                    <h1 class="display-4 fw-bold text-dark mb-4" style="text-shadow: 2px 2px 4px rgba(0,0,0,0.1);">¡Partida Terminada!</h1>
                                    <div class="row justify-content-center mb-4">
                                        <div class="col-md-6">
                                            <div class="card h-100 ${data.winner === 'J1' ? 'border-danger' : 'border-primary'}" style="background: linear-gradient(135deg, ${data.winner === 'J1' ? '#ff9a9e 0%, #fecfef 100%' : '#a8edea 0%, #fed6e3 100%'});">
                                                <div class="card-body text-center">
                                                    <h4 class="card-title ${data.winner === 'J1' ? 'text-danger' : 'text-primary'} fw-bold"> Ganador</h4>
                                                    <h5 class="${data.winner === 'J1' ? 'text-danger' : 'text-primary'}">${winnerName}</h5>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="alert alert-info text-center mb-4" role="alert">
                                    <strong>${reasonText}</strong>
                                </div>

                                <h3 class="text-center mb-4 text-muted">Resumen de la Partida</h3>

                                <div class="row g-4 mb-5">
                                    <div class="col-md-6">
                                        <div class="card h-100 border-danger" style="background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);">
                                            <div class="card-body text-center">
                                                <h5 class="card-title text-danger fw-bold">Jugador 1</h5>
                                                <div class="mb-2">
                                                    <span class="badge bg-light text-dark fs-6">Puntuación: ${data.p1Score}</span>
                                                </div>
                                                <div>
                                                    <span class="badge bg-light text-dark fs-6">Vidas restantes: ${data.p1Lives}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card h-100 border-primary" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);">
                                            <div class="card-body text-center">
                                                <h5 class="card-title text-primary fw-bold">Jugador 2</h5>
                                                <div class="mb-2">
                                                    <span class="badge bg-light text-dark fs-6">Puntuación: ${data.p2Score}</span>
                                                </div>
                                                <div>
                                                    <span class="badge bg-light text-dark fs-6">Vidas restantes: ${data.p2Lives}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="text-center">
                                    <button id="new-match-btn" class="btn btn-success btn-lg me-3 px-5 py-3 fw-bold" style="border-radius: 50px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
                                        Nueva Partida
                                    </button>
                                    <button id="menu-btn" class="btn btn-secondary btn-lg px-5 py-3 fw-bold" style="border-radius: 50px; box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);">
                                        Volver al Menú
                                    </button>
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
