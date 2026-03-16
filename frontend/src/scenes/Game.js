import colyseusClient from '../services/ColyseusClient.js';

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
    }

    create() {
        this.gridSize = 32;

        // Connection state
        this.room = null;
        this.mySessionId = null;
        this.connected = false;
        this.lastSentDirection = null;

        // Graphics objects keyed by player sessionId
        this.playerGraphics = new Map();
        // Single graphics layer for food
        this.foodGraphics = this.add.graphics();

        // Background
        this.cameras.main.setBackgroundColor(0x1a1a2e);
        this.add.image(512, 384, 'background').setAlpha(0.3);

        // Draw grid lines for visual clarity
        const gridLines = this.add.graphics();
        gridLines.lineStyle(1, 0xffffff, 0.05);
        for (let x = 0; x <= 1024; x += this.gridSize) {
            gridLines.moveTo(x, 0);
            gridLines.lineTo(x, 768);
        }
        for (let y = 0; y <= 768; y += this.gridSize) {
            gridLines.moveTo(0, y);
            gridLines.lineTo(1024, y);
        }
        gridLines.strokePath();

        // UI texts
        this.statusText = this.add.text(512, 384, 'Connecting to server...', {
            fontFamily: 'Arial Black', fontSize: 28, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5).setDepth(10);

        this.scoreText = this.add.text(10, 10, '', {
            fontFamily: 'Arial', fontSize: 16, color: '#ffffff',
            stroke: '#000000', strokeThickness: 3
        }).setDepth(10);

        this.deathText = this.add.text(512, 384, '', {
            fontFamily: 'Arial Black', fontSize: 40, color: '#ff4444',
            stroke: '#000000', strokeThickness: 8, align: 'center'
        }).setOrigin(0.5).setDepth(20).setVisible(false);

        this.tutorialText = this.add.text(512, 50, 'Use arrow keys to move your snake', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6, align: 'center'
        }).setOrigin(0.5).setDepth(10);

        // Setup keyboard input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Hide tutorial on first key press
        this.input.keyboard.on('keydown', () => {
            if (this.tutorialText.visible) {
                this.tutorialText.setVisible(false);
            }
        });

        // Connect to the Colyseus server
        this.connectToServer();
    }

    async connectToServer() {
        try {
            this.room = await colyseusClient.joinOrCreate('snake_room');
            this.mySessionId = this.room.sessionId;
            this.connected = true;
            this.statusText.setVisible(false);

            // --- State listeners ---------------------------------------------------

            // When a new player joins: create a Graphics object for their snake
            this.room.state.players.onAdd((player, sessionId) => {
                const gfx = this.add.graphics();
                this.playerGraphics.set(sessionId, gfx);
            });

            // When a player leaves: destroy their Graphics object
            this.room.state.players.onRemove((player, sessionId) => {
                const gfx = this.playerGraphics.get(sessionId);
                if (gfx) {
                    gfx.destroy();
                    this.playerGraphics.delete(sessionId);
                }
            });

            // Re-render the whole game every time we receive a state patch
            this.room.onStateChange(() => {
                this.renderGame();
            });

            // Handle disconnection
            this.room.onLeave((code) => {
                this.connected = false;
                this.statusText.setText('Disconnected from server (code ' + code + ')')
                    .setVisible(true);
            });

        } catch (err) {
            console.error('Colyseus connection error:', err);
            this.statusText.setText(
                'Could not connect to server!\nMake sure the backend is running on port 2567'
            );
        }
    }

    update() {
        if (!this.room || !this.connected) return;

        // Read arrow keys and send direction to the server (deduplicated)
        let dir = null;
        if (this.cursors.left.isDown) dir = 'left';
        else if (this.cursors.right.isDown) dir = 'right';
        else if (this.cursors.up.isDown) dir = 'up';
        else if (this.cursors.down.isDown) dir = 'down';

        if (dir) {
            if (dir !== this.lastSentDirection) {
                this.room.send('changeDirection', dir);
                this.lastSentDirection = dir;
            }
        } else {
            // Reset when no arrow key is held so the same key can be re-sent
            this.lastSentDirection = null;
        }
    }

    // ─── Rendering ──────────────────────────────────────────────────────────────

    renderGame() {
        const state = this.room.state;

        // --- Draw each player's snake -------------------------------------------
        state.players.forEach((player, sessionId) => {
            const gfx = this.playerGraphics.get(sessionId);
            if (!gfx) return;

            gfx.clear();

            if (!player.alive) {
                // Show death overlay for the local player
                if (sessionId === this.mySessionId) {
                    this.deathText.setText('YOU DIED!\nRespawning...').setVisible(true);
                }
                return;
            }

            // Hide death text when local player is alive again
            if (sessionId === this.mySessionId) {
                this.deathText.setVisible(false);
            }

            const color = player.color;

            player.segments.forEach((seg, i) => {
                if (i === 0) {
                    // Head: white border + colored fill
                    gfx.fillStyle(0xffffff, 1);
                    gfx.fillRect(seg.x + 1, seg.y + 1, this.gridSize - 2, this.gridSize - 2);
                    gfx.fillStyle(color, 1);
                    gfx.fillRect(seg.x + 3, seg.y + 3, this.gridSize - 6, this.gridSize - 6);
                } else {
                    // Body
                    gfx.fillStyle(color, 0.85);
                    gfx.fillRect(seg.x + 2, seg.y + 2, this.gridSize - 4, this.gridSize - 4);
                }
            });
        });

        // --- Draw food ----------------------------------------------------------
        this.foodGraphics.clear();
        state.food.forEach((food) => {
            this.foodGraphics.fillStyle(0xff6347, 1);
            this.foodGraphics.fillRect(
                food.x + 4, food.y + 4,
                this.gridSize - 8, this.gridSize - 8
            );
            // Small highlight to make it pop
            this.foodGraphics.fillStyle(0xffa07a, 1);
            this.foodGraphics.fillRect(
                food.x + 8, food.y + 8,
                this.gridSize - 20, this.gridSize - 20
            );
        });

        // --- Scoreboard ---------------------------------------------------------
        this.updateScoreboard();
    }

    updateScoreboard() {
        let text = '';
        this.room.state.players.forEach((player, sessionId) => {
            const isMe = sessionId === this.mySessionId;
            const marker = isMe ? '► ' : '  ';
            const status = player.alive ? '' : ' ✖';
            const label = isMe ? 'You' : sessionId.substring(0, 4);
            text += marker + label + ': ' + player.score + status + '\n';
        });
        this.scoreText.setText(text);
    }

    // Clean up the Colyseus connection when the scene shuts down
    shutdown() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
    }
}
