export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this.room = null;
        this.mySessionId = null;
        this.gridSize = 32;
        this.lastDirection = 'right';
    }

    init(data) {
        this.room = data.room;
        this.mySessionId = this.room ? this.room.sessionId : null;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a1a2e);
        this.add.image(512, 384, 'background').setAlpha(0.3);

        // Draw grid lines for visual reference
        const gridGfx = this.add.graphics();
        gridGfx.lineStyle(1, 0x222244, 0.4);
        for (let x = 0; x <= 1024; x += this.gridSize) {
            gridGfx.moveTo(x, 0);
            gridGfx.lineTo(x, 768);
        }
        for (let y = 0; y <= 768; y += this.gridSize) {
            gridGfx.moveTo(0, y);
            gridGfx.lineTo(1024, y);
        }
        gridGfx.strokePath();

        // Persistent graphics objects (cleared and redrawn each state update)
        this.snakeGfx = this.add.graphics();
        this.foodGfx = this.add.graphics();

        // HUD
        this.scoreText = this.add.text(10, 10, 'Puntos: 0', {
            fontFamily: 'Arial',
            fontSize: 20,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        });

        this.playersText = this.add.text(10, 36, 'Jugadores: 1', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#aaaaaa'
        });

        // Overlay text (death / connecting)
        this.overlayText = this.add.text(512, 384, '', {
            fontFamily: 'Arial Black',
            fontSize: 40,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            align: 'center'
        }).setOrigin(0.5).setAlpha(0).setDepth(10);

        // Keyboard controls (arrow keys + WASD)
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        if (!this.room) {
            this.overlayText.setText('Sin conexión al servidor.\nVuelve al menú.').setAlpha(1);
            this.time.delayedCall(3000, () => this.scene.start('MainMenu'));
            return;
        }

        // Listen to state changes broadcast by the server every tick
        this.room.onStateChange((state) => {
            this.renderState(state);
        });

        // Return to MainMenu if disconnected
        this.room.onLeave(() => {
            this.scene.start('MainMenu');
        });
    }

    update() {
        if (!this.room) return;

        let dir = null;
        if (this.cursors.left.isDown || this.wasd.left.isDown) dir = 'left';
        else if (this.cursors.right.isDown || this.wasd.right.isDown) dir = 'right';
        else if (this.cursors.up.isDown || this.wasd.up.isDown) dir = 'up';
        else if (this.cursors.down.isDown || this.wasd.down.isDown) dir = 'down';

        if (dir && dir !== this.lastDirection) {
            this.room.send('changeDirection', dir);
            this.lastDirection = dir;
        }
    }

    renderState(state) {
        const gs = this.gridSize;

        // --- Food ---
        this.foodGfx.clear();
        this.foodGfx.fillStyle(0xff4444, 1);
        state.food.forEach((f) => {
            this.foodGfx.fillRect(f.x + 3, f.y + 3, gs - 6, gs - 6);
        });

        // --- Snakes ---
        this.snakeGfx.clear();
        let myScore = 0;
        let playerCount = 0;

        state.players.forEach((player, sessionId) => {
            const isMe = sessionId === this.mySessionId;
            playerCount++;

            if (isMe) {
                myScore = player.score;
                if (!player.alive) {
                    this.overlayText.setText('💀 Muerto... reapareciendo').setAlpha(1);
                } else {
                    this.overlayText.setAlpha(0);
                }
            }

            if (!player.alive) return;

            const color = player.color;
            player.segments.forEach((seg, idx) => {
                if (idx === 0) {
                    // Head: full grid cell
                    this.snakeGfx.fillStyle(color, 1);
                    this.snakeGfx.fillRect(seg.x + 1, seg.y + 1, gs - 2, gs - 2);
                } else {
                    // Body: slightly smaller, slightly transparent for other players
                    this.snakeGfx.fillStyle(color, isMe ? 1 : 0.85);
                    this.snakeGfx.fillRect(seg.x + 3, seg.y + 3, gs - 6, gs - 6);
                }
            });
        });

        this.scoreText.setText(`Puntos: ${myScore}`);
        this.playersText.setText(`Jugadores: ${playerCount}`);
    }

    shutdown() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
    }
}
