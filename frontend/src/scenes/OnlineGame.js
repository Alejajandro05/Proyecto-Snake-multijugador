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
        this.cameras.main.setBackgroundColor(0x1a1a2e);
        this.add.image(512, 384, 'background').setAlpha(0.5);

        // Graphics
        this.snakeGraphics = this.add.graphics();
        this.foodGraphics  = this.add.graphics();

        // Score labels (keyed by sessionId) + stable index map
        this.scoreLabels = new Map();
        this.playerIndex = new Map(); // sessionId → display index

        this.statusText = this.add.text(512, 384, 'Conectando…', {
            fontFamily: 'Arial Black',
            fontSize: 32,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center',
        }).setOrigin(0.5);

        this.add.text(512, 748, 'ESC: Menú', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#888888',
        }).setOrigin(0.5, 1);

        this.input.keyboard.on('keydown-ESC', () => this.leaveRoom());

        // Keyboard
        this.cursors = this.input.keyboard.createCursorKeys();

        await this.connectToServer();
    }

    async connectToServer() {
        try {
            const client = new Client(SERVER_URL);
            this.room = await client.joinOrCreate('snake_room');

            this.statusText.setVisible(false);

            // Render state on every server update
            this.room.onStateChange((state) => this.renderState(state));

            // Send direction changes each frame
            this.input.keyboard.on('keydown-UP',    () => this.room.send('changeDirection', 'up'));
            this.input.keyboard.on('keydown-DOWN',  () => this.room.send('changeDirection', 'down'));
            this.input.keyboard.on('keydown-LEFT',  () => this.room.send('changeDirection', 'left'));
            this.input.keyboard.on('keydown-RIGHT', () => this.room.send('changeDirection', 'right'));

            this.room.onLeave(() => {
                this.statusText.setText('Desconectado').setVisible(true);
            });

            this.room.onError((code, message) => {
                this.statusText.setText(`Error: ${message}`).setVisible(true);
            });
        } catch (err) {
            this.statusText.setText('No se pudo conectar\nal servidor.').setVisible(true);
            console.error('OnlineGame connection error:', err);
        }
    }

    renderState(state) {
        this.snakeGraphics.clear();
        this.foodGraphics.clear();

        // Render each player's snake
        state.players.forEach((player, sessionId) => {
            if (!player.alive) {
                this.updateScoreLabel(sessionId, player, '💀');
                return;
            }
            this.snakeGraphics.fillStyle(player.color, 1);
            player.segments.forEach((seg) => {
                this.snakeGraphics.fillRect(seg.x + 1, seg.y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
            });
            this.updateScoreLabel(sessionId, player);
        });

        // Remove labels for players who left
        this.scoreLabels.forEach((label, id) => {
            if (!state.players.has(id)) {
                label.destroy();
                this.scoreLabels.delete(id);
                this.playerIndex.delete(id);
            }
        });

        // Render food
        this.foodGraphics.fillStyle(0xffff00, 1);
        state.food.forEach((f) => {
            this.foodGraphics.fillRect(f.x + 1, f.y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        });
    }

    updateScoreLabel(sessionId, player, suffix = '') {
        const isMe = this.room && sessionId === this.room.sessionId;

        if (!this.scoreLabels.has(sessionId)) {
            const idx = this.scoreLabels.size;
            this.playerIndex.set(sessionId, idx);
            const label = this.add.text(16, 16 + idx * 30, '', {
                fontFamily: 'Arial Black',
                fontSize: 20,
                color: '#' + player.color.toString(16).padStart(6, '0'),
                stroke: '#000000',
                strokeThickness: 4,
            });
            this.scoreLabels.set(sessionId, label);
        }

        const label = this.scoreLabels.get(sessionId);
        const idx = this.playerIndex.get(sessionId) ?? 0;
        const prefix = isMe ? '★ Tú' : `J${idx + 1}`;
        label.setText(`${prefix}: ${player.score}${suffix}`);
    }

    leaveRoom() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
        this.scene.start('MainMenu');
    }

    shutdown() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
    }
}
