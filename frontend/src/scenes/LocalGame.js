import { SnakeEngine } from '@shared/SnakeEngine';
import { GRID_SIZE, TICK_MS } from '@shared/GameConfig';

const P1_ID = 'player1';
const P2_ID = 'player2';

/**
 * Local two-player game use case.
 * Uses the pure SnakeEngine domain class directly – no server needed.
 * Player 1: WASD   |   Player 2: Arrow keys
 */
export class LocalGame extends Phaser.Scene {
    constructor() {
        super('LocalGame');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x1a1a2e);
        this.add.image(512, 384, 'background').setAlpha(0.3);

        // Domain engine – pure game logic, no Phaser/Colyseus dependency
        this.engine = new SnakeEngine();
        this.engine.addPlayer(P1_ID, { color: 0xe74c3c, startCol: 8,  startRow: 12 });
        this.engine.addPlayer(P2_ID, { color: 0x3498db, startCol: 24, startRow: 12 });

        // Graphics layers
        this.snakeGraphics = this.add.graphics();
        this.foodGraphics  = this.add.graphics();
        this.obstacleGraphics = this.add.graphics();

        // Score display
        this.p1ScoreText = this.add.text(16, 16, 'J1: 0', {
            fontFamily: 'Arial Black',
            fontSize: 22,
            color: '#e74c3c',
            stroke: '#000000',
            strokeThickness: 4,
        });

        this.p2ScoreText = this.add.text(1008, 16, 'J2: 0', {
            fontFamily: 'Arial Black',
            fontSize: 22,
            color: '#3498db',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(1, 0);

        // Score display
        this.p1LivesText = this.add.text(16, 45, 'J1: 0', {
            fontFamily: 'Arial Black',
            fontSize: 22,
            color: '#e74c3c',
            stroke: '#000000',
            strokeThickness: 4,
        });

        this.p2LivesText = this.add.text(1008, 45, 'J2: 0', {
            fontFamily: 'Arial Black',
            fontSize: 22,
            color: '#3498db',
            stroke: '#000000',
            strokeThickness: 4,
        }).setOrigin(1, 0);

        this.add.text(512, 16, 'WASD  |  Flechas  –  ESC: Menú', {
            fontFamily: 'Arial',
            fontSize: 16,
            color: '#aaaaaa',
        }).setOrigin(0.5, 0);

        // Input
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd    = this.input.keyboard.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' });

        this.isPaused = false;
        this.input.keyboard.on('keydown-ESC', () => {
            if (this.isPaused) return;
            this.isPaused = true;

            const state = this.engine.getState();
            const p1 = state.players.get(P1_ID);
            const p2 = state.players.get(P2_ID);

            this.scene.pause();
            this.scene.launch('PauseScene', {
                p1Score: p1.score ?? 0,
                p2Score: p2.score ?? 0
            });
        });

        // Game loop driven by domain engine
        this.gameTimer = this.time.addEvent({
            delay: TICK_MS,
            loop: true,
            callback: this.gameTick,
            callbackScope: this,
        });

        this.renderState(this.engine.getState());
    }

    gameTick() {
        this.handleInput();
        const state = this.engine.tick();
        this.renderState(state);
    }

    handleInput() {
        // Player 1 – WASD
        if      (this.wasd.up.isDown)    this.engine.setNextDirection(P1_ID, 'up');
        else if (this.wasd.down.isDown)  this.engine.setNextDirection(P1_ID, 'down');
        else if (this.wasd.left.isDown)  this.engine.setNextDirection(P1_ID, 'left');
        else if (this.wasd.right.isDown) this.engine.setNextDirection(P1_ID, 'right');

        // Player 2 – Arrow keys
        if      (this.cursors.up.isDown)    this.engine.setNextDirection(P2_ID, 'up');
        else if (this.cursors.down.isDown)  this.engine.setNextDirection(P2_ID, 'down');
        else if (this.cursors.left.isDown)  this.engine.setNextDirection(P2_ID, 'left');
        else if (this.cursors.right.isDown) this.engine.setNextDirection(P2_ID, 'right');
    }

    renderState(state) {
        this.snakeGraphics.clear();
        this.foodGraphics.clear();
        this.obstacleGraphics.clear();

        state.players.forEach((player) => {
            if (!player.alive) return;
            this.snakeGraphics.fillStyle(player.color, 1);
            player.segments.forEach((seg) => {
                this.snakeGraphics.fillRect(seg.x + 1, seg.y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
            });
        });

        this.foodGraphics.fillStyle(0xffff00, 1);
        state.food.forEach((f) => {
            this.foodGraphics.fillRect(f.x + 1, f.y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        });

        this.obstacleGraphics.fillStyle(0x888888, 1);
        state.obstacles.forEach((o) => {
            this.obstacleGraphics.fillRect(o.x + 1, o.y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
        });

        const p1 = state.players.get(P1_ID);
        const p2 = state.players.get(P2_ID);

        if (p1) this.p1ScoreText.setText(`J1: ${p1.score}`);
        if (p2) this.p2ScoreText.setText(`J2: ${p2.score}`);

        if (p1) this.p1LivesText.setText(`Vidas: ${p1.lives}`);
        if (p2) this.p2LivesText.setText(`Vidas: ${p2.lives}`);

        if(p1.score >= 10 || p2.score >= 10){
            this.gameOver(true) // ganador por puntuación
        }

        if(p1.lives <= 0 || p2.lives <= 0){
            this.gameOver(false); // perdedor por vidas
        }
    }

    gameOver(reason) {
        if (this.gameTimer) this.gameTimer.remove();

        const state = this.engine.getState();
        const p1 = state.players.get(P1_ID);
        const p2 = state.players.get(P2_ID);

        if (reason) {   // ganador por puntuación
            this.scene.start('GameOver', {
                winner: p1.score > p2.score ? 'J1' : 'J2',
                p1Score: p1.score,
                p1Lives: p1.lives,
                p2Score: p2.score,
                p2Lives: p2.lives,
                reason: 'score'
            });
        } else {   // perdedor por vidas
            this.scene.start('GameOver', {
                winner: p1.lives > 0 ? 'J1' : 'J2',
                p1Score: p1.score,
                p1Lives: p1.lives,
                p2Score: p2.score,
                p2Lives: p2.lives,
                reason: 'lives'
            });
        }
    }
}
