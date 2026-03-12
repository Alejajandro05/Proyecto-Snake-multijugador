import * as Colyseus from 'colyseus.js';

const GRID_SIZE = 32;
const PLAYER_COLORS = [0x00cc00, 0x0088ff];
const PLAYER_HEAD_COLORS = [0x00ff00, 0x00aaff];

export class Game extends Phaser.Scene {
    constructor() {
        super('Game');

        this.gridSize = GRID_SIZE;
        this.room = null;
        this.client = null;
        this.snakeGraphics = {};
        this.foodGraphic = null;
        this.mySessionId = null;
        this.currentDirection = null;
        this.statusText = null;
        this.scoreTexts = {};
        this.countdownText = null;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a1a2e);

        // Draw grid lines for visual reference
        this.drawGrid();

        // Setup keyboard controls
        this.cursors = this.input.keyboard.createCursorKeys();

        // Status text
        this.statusText = this.add.text(512, 384, 'Connecting to server...', {
            fontFamily: 'Arial Black', fontSize: 24, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(10);

        // Countdown text
        this.countdownText = this.add.text(512, 300, '', {
            fontFamily: 'Arial Black', fontSize: 96, color: '#ffff00',
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(10).setVisible(false);

        // Score display (top of screen)
        this.scoreTexts.player1 = this.add.text(20, 10, '', {
            fontFamily: 'Arial', fontSize: 18, color: '#00ff00',
            stroke: '#000000', strokeThickness: 3,
        }).setDepth(10);

        this.scoreTexts.player2 = this.add.text(1004, 10, '', {
            fontFamily: 'Arial', fontSize: 18, color: '#00aaff',
            stroke: '#000000', strokeThickness: 3,
        }).setOrigin(1, 0).setDepth(10);

        // Connect to Colyseus
        this.connectToServer();
    }

    drawGrid() {
        const graphics = this.add.graphics();
        graphics.lineStyle(1, 0x333355, 0.3);

        for (let x = 0; x <= 1024; x += GRID_SIZE) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, 768);
        }
        for (let y = 0; y <= 768; y += GRID_SIZE) {
            graphics.moveTo(0, y);
            graphics.lineTo(1024, y);
        }
        graphics.strokePath();
    }

    async connectToServer() {
        try {
            const serverUrl = window.location.hostname === 'localhost'
                ? 'ws://localhost:2567'
                : `ws://${window.location.hostname}:2567`;

            this.client = new Colyseus.Client(serverUrl);
            this.room = await this.client.joinOrCreate('snake_room');
            this.mySessionId = this.room.sessionId;

            this.statusText.setText('Waiting for opponent...\nPress any key when ready!');

            // Listen for any key to send ready signal
            const readyHandler = () => {
                if (this.room) {
                    this.room.send('ready');
                    this.statusText.setText('Ready! Waiting for opponent...');
                    this.input.keyboard.off('keydown', readyHandler);
                }
            };
            this.input.keyboard.on('keydown', readyHandler);

            // Listen for state changes
            this.setupStateListeners();

        } catch (error) {
            console.error('Connection error:', error);
            this.statusText.setText('Could not connect to server.\nClick to return to menu.');
            this.input.once('pointerdown', () => {
                this.scene.start('MainMenu');
            });
        }
    }

    setupStateListeners() {
        // Listen for game state changes
        this.room.state.listen("gameStarted", (value) => {
            if (value) {
                this.statusText.setVisible(false);
                this.countdownText.setVisible(false);
            }
        });

        this.room.state.listen("countdown", (value) => {
            if (value > 0) {
                this.countdownText.setText(value.toString()).setVisible(true);
                this.statusText.setVisible(false);
            } else {
                this.countdownText.setVisible(false);
            }
        });

        this.room.state.listen("gameOver", (value) => {
            if (value) {
                this.onGameOver();
            }
        });

        // Track players joining/leaving
        this.room.state.players.onAdd((player, sessionId) => {
            this.snakeGraphics[sessionId] = [];
        });

        this.room.state.players.onRemove((player, sessionId) => {
            this.clearSnakeGraphics(sessionId);
            delete this.snakeGraphics[sessionId];
        });
    }

    update() {
        if (!this.room || !this.room.state.gameStarted || this.room.state.gameOver) return;

        // Handle input and send direction to server
        if (this.cursors.left.isDown && this.currentDirection !== 'left') {
            this.currentDirection = 'left';
            this.room.send('direction', { dir: 'left' });
        } else if (this.cursors.right.isDown && this.currentDirection !== 'right') {
            this.currentDirection = 'right';
            this.room.send('direction', { dir: 'right' });
        } else if (this.cursors.up.isDown && this.currentDirection !== 'up') {
            this.currentDirection = 'up';
            this.room.send('direction', { dir: 'up' });
        } else if (this.cursors.down.isDown && this.currentDirection !== 'down') {
            this.currentDirection = 'down';
            this.room.send('direction', { dir: 'down' });
        }

        // Render the game state
        this.renderGameState();
    }

    renderGameState() {
        if (!this.room || !this.room.state) return;

        let playerIndex = 0;
        const playerIds = [];

        // Collect player IDs to maintain consistent coloring
        this.room.state.players.forEach((player, sessionId) => {
            playerIds.push(sessionId);
        });

        // Render each player's snake
        playerIds.forEach((sessionId, idx) => {
            const player = this.room.state.players.get(sessionId);
            if (!player) return;

            // Clear previous graphics for this snake
            this.clearSnakeGraphics(sessionId);
            this.snakeGraphics[sessionId] = [];

            const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
            const headColor = PLAYER_HEAD_COLORS[idx % PLAYER_HEAD_COLORS.length];
            const alpha = player.alive ? 1 : 0.3;

            // Draw snake segments
            for (let i = 0; i < player.segments.length; i++) {
                const seg = player.segments[i];
                const isHead = i === 0;
                const segColor = isHead ? headColor : color;

                const rect = this.add.rectangle(
                    seg.x, seg.y,
                    GRID_SIZE - 2, GRID_SIZE - 2,
                    segColor
                ).setAlpha(alpha);

                // Add border to current player's snake head
                if (isHead && sessionId === this.mySessionId) {
                    rect.setStrokeStyle(2, 0xffffff);
                }

                this.snakeGraphics[sessionId].push(rect);
            }

            // Update score texts
            const scoreLabel = idx === 0 ? 'player1' : 'player2';
            const isMe = sessionId === this.mySessionId;
            const prefix = isMe ? '(You) ' : '';
            if (this.scoreTexts[scoreLabel]) {
                this.scoreTexts[scoreLabel].setText(`${prefix}Player ${idx + 1}: ${player.score}`);
            }
        });

        // Render food
        if (this.foodGraphic) {
            this.foodGraphic.destroy();
        }
        const food = this.room.state.food;
        if (food) {
            this.foodGraphic = this.add.rectangle(
                food.x, food.y,
                GRID_SIZE - 2, GRID_SIZE - 2,
                0xff4444
            ).setStrokeStyle(1, 0xff0000);
        }
    }

    clearSnakeGraphics(sessionId) {
        if (this.snakeGraphics[sessionId]) {
            this.snakeGraphics[sessionId].forEach(g => g.destroy());
            this.snakeGraphics[sessionId] = [];
        }
    }

    onGameOver() {
        const winner = this.room.state.winner;
        const isWinner = winner === this.mySessionId;
        const isDraw = winner === '';

        let resultText, resultColor;
        if (isDraw) {
            resultText = 'DRAW!';
            resultColor = '#ffff00';
        } else if (isWinner) {
            resultText = 'YOU WIN! 🏆';
            resultColor = '#00ff00';
        } else {
            resultText = 'YOU LOSE!';
            resultColor = '#ff4444';
        }

        // Show result
        this.add.rectangle(512, 384, 500, 200, 0x000000, 0.8).setDepth(20);

        this.add.text(512, 340, resultText, {
            fontFamily: 'Arial Black', fontSize: 52, color: resultColor,
            stroke: '#000000', strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5).setDepth(21);

        this.add.text(512, 420, 'Click to return to menu', {
            fontFamily: 'Arial', fontSize: 20, color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5).setDepth(21);

        this.input.once('pointerdown', () => {
            this.cleanup();
            this.scene.start('MainMenu');
        });
    }

    cleanup() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
        // Clear all graphics
        Object.keys(this.snakeGraphics).forEach(id => {
            this.clearSnakeGraphics(id);
        });
        this.snakeGraphics = {};
        if (this.foodGraphic) {
            this.foodGraphic.destroy();
            this.foodGraphic = null;
        }
    }
}
