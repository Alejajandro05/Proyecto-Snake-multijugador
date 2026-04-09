import { Client } from '@colyseus/sdk';
import { GRID_SIZE } from '@shared/GameConfig';

const SERVER_URL = 'ws://localhost:2567';

/**
 * Online multiplayer game use case.
 * Connects to the Colyseus server (SnakeRoom) and renders the authoritative game state.
 * All game logic runs on the server via SnakeEngine – the client only sends input.
 */
export class OnlineGame extends Phaser.Scene {
    constructor() {
        super('OnlineGame');
    }

    async create() {
        // Create HTML overlay with panel
        const gameContainer = document.createElement('div');
        gameContainer.id = 'online-game-overlay';
        gameContainer.style.position = 'fixed';
        gameContainer.style.top = '0';
        gameContainer.style.left = '0';
        gameContainer.style.width = '100vw';
        gameContainer.style.height = '100vh';
        gameContainer.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        gameContainer.style.zIndex = '999';
        gameContainer.style.display = 'flex';
        gameContainer.style.alignItems = 'center';
        gameContainer.style.justifyContent = 'center';
        gameContainer.style.pointerEvents = 'none';
        gameContainer.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

        gameContainer.innerHTML = `
            <div style="width: 710px; background: rgba(255, 255, 255, 0.98); border-radius: 20px; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); display: flex; flex-direction: column; padding: 30px; align-items: center; pointer-events: auto;">
                <div style="text-align: left; margin-bottom: 20px; align-self: flex-start; width: 100%;">
                    <span id="game-status-badge" class="badge bg-success fs-6">En línea</span>
                </div>
                <div id="game-canvas-container" style="display: flex; justify-content: center; align-items: center; margin-bottom: 20px; width: 100%; height: 360px; border-radius: 8px; overflow: hidden; background: linear-gradient(135deg, #1b6f8b 0%, #2a9d8f 100%); position: relative; z-index: 1001;"></div>
                <div style="text-align: center; color: #888; font-size: 14px; width: 100%;">
                    Flechas o WASD para mover | ESC para salir
                </div>
            </div>
        `;
        document.body.appendChild(gameContainer);
        this.gameContainer = gameContainer;

        // Make Phaser canvas visible above overlay and properly positioned
        this.game.canvas.style.zIndex = '1001';
        this.game.canvas.style.position = 'fixed';
        this.game.canvas.style.top = '50%';
        this.game.canvas.style.left = '50%';
        this.game.canvas.style.transform = 'translate(-50%, -50%)';
        this.game.canvas.style.width = '650px';
        this.game.canvas.style.height = '360px';
        this.game.canvas.style.borderRadius = '8px';
        this.game.canvas.style.display = 'block';
        this.game.canvas.style.pointerEvents = 'auto';
        this.game.canvas.style.margin = '0';
        this.game.canvas.style.padding = '0';

        // Setup Phaser render target
        this.cameras.main.setBackgroundColor(0x1b6f8b);

        // Graphics layers for rendering
        this.snakeGraphics = this.add.graphics();
        this.foodGraphics = this.add.graphics();

        // Input handling
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' });

        this.input.keyboard.on('keydown-ESC', () => this.leaveRoom());

        const statusBadge = document.getElementById('game-status-badge');
        this.statusBadge = statusBadge;

        await this.connectToServer();
    }

    async connectToServer() {
        try {
            const client = new Client(SERVER_URL);
            this.room = await client.joinOrCreate('snake_room');

            this.statusBadge.textContent = 'En línea';
            this.statusBadge.className = 'badge bg-success fs-6';

            // Render state on every server update
            this.room.onStateChange((state) => {
                this.renderState(state);
            });

            // Send direction changes
            this.input.keyboard.on('keydown-UP',    () => this.room.send('changeDirection', 'up'));
            this.input.keyboard.on('keydown-DOWN',  () => this.room.send('changeDirection', 'down'));
            this.input.keyboard.on('keydown-LEFT',  () => this.room.send('changeDirection', 'left'));
            this.input.keyboard.on('keydown-RIGHT', () => this.room.send('changeDirection', 'right'));

            // Also handle WASD
            this.input.keyboard.on('keydown-W', () => this.room.send('changeDirection', 'up'));
            this.input.keyboard.on('keydown-S', () => this.room.send('changeDirection', 'down'));
            this.input.keyboard.on('keydown-A', () => this.room.send('changeDirection', 'left'));
            this.input.keyboard.on('keydown-D', () => this.room.send('changeDirection', 'right'));

            this.room.onLeave(() => {
                this.statusBadge.textContent = 'Desconectado';
                this.statusBadge.className = 'badge bg-danger fs-6';
            });

            this.room.onError((code, message) => {
                this.statusBadge.textContent = `Error: ${message}`;
                this.statusBadge.className = 'badge bg-warning fs-6';
            });
        } catch (err) {
            this.statusBadge.textContent = 'Error de conexión';
            this.statusBadge.className = 'badge bg-danger fs-6';
            console.error('OnlineGame connection error:', err);
        }
    }

    renderState(state) {
        this.snakeGraphics.clear();
        this.foodGraphics.clear();

        // Render each player's snake
        state.players.forEach((player) => {
            if (!player.alive) return;

            this.snakeGraphics.fillStyle(player.color, 1);
            player.segments.forEach((seg) => {
                this.snakeGraphics.fillRect(seg.x + 1, seg.y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
            });
        });

        // Render food
        this.foodGraphics.fillStyle(0xffff00, 1);
        state.food.forEach((f) => {
            this.foodGraphics.fillRect(f.x + 1, f.y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        });
    }

    leaveRoom() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
        if (this.gameContainer && this.gameContainer.parentNode) {
            document.body.removeChild(this.gameContainer);
        }
        this.scene.start('MainMenu');
    }

    shutdown() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
        if (this.gameContainer && this.gameContainer.parentNode) {
            document.body.removeChild(this.gameContainer);
        }
    }
}

