export class Game extends Phaser.Scene {
    constructor() {
        super('Game');
        this.room = null;
        this.mySessionId = null;
        this.gridSize = 32;
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

        // Persistent graphics objects (cleared and redrawn each frame)
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

        // Keyboard controls: send direction on key press (keydown fires once per press,
        // avoiding the lastDirection desync problem with isDown polling).
        this.input.keyboard.on('keydown-LEFT',  () => this.sendDirection('left'));
        this.input.keyboard.on('keydown-RIGHT', () => this.sendDirection('right'));
        this.input.keyboard.on('keydown-UP',    () => this.sendDirection('up'));
        this.input.keyboard.on('keydown-DOWN',  () => this.sendDirection('down'));
        this.input.keyboard.on('keydown-A', () => this.sendDirection('left'));
        this.input.keyboard.on('keydown-D', () => this.sendDirection('right'));
        this.input.keyboard.on('keydown-W', () => this.sendDirection('up'));
        this.input.keyboard.on('keydown-S', () => this.sendDirection('down'));

        if (!this.room) {
            this.overlayText.setText('Sin conexión al servidor.\nVuelve al menú.').setAlpha(1);
            this.time.delayedCall(3000, () => this.scene.start('MainMenu'));
            return;
        }

        // Return to MainMenu if disconnected
        this.room.onLeave(() => {
            this.room = null;
            this.scene.start('MainMenu');
        });
    }

    sendDirection(dir) {
        if (this.room) {
            this.room.send('changeDirection', dir);
        }
    }

    // Rendering is driven by Phaser's update loop every frame so that
    // it always reflects the latest room.state regardless of when
    // onStateChange fires.
    update() {
        if (!this.room || !this.room.state) return;
        this.renderState(this.room.state);
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
