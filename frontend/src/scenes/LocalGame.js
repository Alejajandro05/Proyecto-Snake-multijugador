import { SnakeEngine } from '@shared/SnakeEngine';
import { GRID_COLS, GRID_ROWS, GRID_SIZE, MAX_LIVES, TICK_MS, WIN_SCORE } from '@shared/GameConfig';

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
        this.cameras.main.roundPixels = true;
        this.cameras.main.setBackgroundColor(0x1a1a2e);
        this.backgroundImage = this.add.image(this.scale.width * 0.5, this.scale.height * 0.5, 'background')
            .setAlpha(0.22)
            .setDepth(-50);

        this.worldWidth = GRID_COLS * GRID_SIZE;
        this.worldHeight = GRID_ROWS * GRID_SIZE;
        this.boardOffsetX = 0;
        this.boardOffsetY = 0;
        this.cellSize = GRID_SIZE;

// 1. Iniciamos la música
        this.music = this.sound.add('musica_in_game', { loop: true, volume: 0.3 });
        this.music.play();

        // --- EL CONTROL DE LA MÚSICA ---

        // 2. Si la escena se CIERRA (Sales al menú principal) -> Parar música
        this.events.on('shutdown', () => {
            if (this.music && this.music.isPlaying) {
                this.music.stop();
            }
        });

        // 3. Si la escena se PAUSA (Abres el menú de pausa) -> Pausar música
        this.events.on('pause', () => {
            if (this.music && this.music.isPlaying) {
                this.music.pause();
            }
        });

        // 4. Si la escena se REANUDA (Cierras el menú de pausa) -> Reanudar música
        this.events.on('resume', () => {
            if (this.music && this.music.isPaused) {
                this.music.resume();
            }
        });

        this.cacheHudElements();
        this.toggleHud(true);

        this.boardBackgroundGraphics = this.add.graphics();
        this.gridGraphics = this.add.graphics();

        // Domain engine – pure game logic, no Phaser/Colyseus dependency
        this.engine = new SnakeEngine();
        this.engine.addPlayer(P1_ID, { color: 0xe74c3c, startCol: 8,  startRow: 12 });
        this.engine.addPlayer(P2_ID, { color: 0x3498db, startCol: 24, startRow: 12 });

        // Graphics layers
        this.snakeGraphics = this.add.graphics();
        this.foodGraphics  = this.add.graphics();
        this.obstacleGraphics = this.add.graphics();

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

        // Input buffers: small queues for direction changes
        this.inputBuffers = {
            [P1_ID]: [],  // Max 3 directions
            [P2_ID]: []
        };

        // Keydown listeners: push to buffer on press (async, outside game loop)
        this.input.keyboard.on('keydown-W', () => this.pushDirection(P1_ID, 'up'));
        this.input.keyboard.on('keydown-A', () => this.pushDirection(P1_ID, 'left'));
        this.input.keyboard.on('keydown-S', () => this.pushDirection(P1_ID, 'down'));
        this.input.keyboard.on('keydown-D', () => this.pushDirection(P1_ID, 'right'));

        this.input.keyboard.on('keydown-UP', () => this.pushDirection(P2_ID, 'up'));
        this.input.keyboard.on('keydown-LEFT', () => this.pushDirection(P2_ID, 'left'));
        this.input.keyboard.on('keydown-DOWN', () => this.pushDirection(P2_ID, 'down'));
        this.input.keyboard.on('keydown-RIGHT', () => this.pushDirection(P2_ID, 'right'));

        // Game loop driven by domain engine
        this.gameTimer = this.time.addEvent({
            delay: TICK_MS,
            loop: true,
            callback: this.gameTick,
            callbackScope: this,
        });

        this.resizeHandler = (gameSize) => this.updateLayout(gameSize.width, gameSize.height);
        this.scale.on('resize', this.resizeHandler);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.resizeHandler);
            this.toggleHud(false);
        });

        this.updateLayout(this.scale.width, this.scale.height);

        this.renderState(this.engine.getState());
    }

    cacheHudElements() {
        this.hudRoot = document.getElementById('localgame-hud');
        this.hudJ1Score = document.getElementById('hud-j1-score');
        this.hudJ1ScoreBig = document.getElementById('hud-j1-score-big');
        this.hudJ1Lives = document.getElementById('hud-j1-lives');
        this.hudJ2Score = document.getElementById('hud-j2-score');
        this.hudJ2ScoreBig = document.getElementById('hud-j2-score-big');
        this.hudJ2Lives = document.getElementById('hud-j2-lives');
        this.hudHelp = document.getElementById('hud-help');
        this.hudHelpWrap = document.getElementById('hud-help-wrap');
        this.hudLeftPlayer = document.getElementById('hud-left-player');
        this.hudRightPlayer = document.getElementById('hud-right-player');
        if (this.hudHelp) {
            this.hudHelp.textContent = 'WASD | Flechas - ESC: Menu';
        }

        this.updateLivesHud(this.hudJ1Lives, MAX_LIVES);
        this.updateLivesHud(this.hudJ2Lives, MAX_LIVES);
    }

    toggleHud(visible) {
        if (!this.hudRoot) return;
        this.hudRoot.classList.toggle('d-none', !visible);
    }

    updateLayout(viewportWidth, viewportHeight) {
        const safePadding = 18;
        const helpHeight = this.hudHelpWrap ? this.hudHelpWrap.offsetHeight : 42;
        const topGap = helpHeight + 26;
        const sidePanelWidthLeft = this.hudLeftPlayer ? this.hudLeftPlayer.offsetWidth : 0;
        const sidePanelWidthRight = this.hudRightPlayer ? this.hudRightPlayer.offsetWidth : 0;
        const sideGap = 22;
        const availableWidth = Math.max(320, viewportWidth - safePadding * 2 - sidePanelWidthLeft - sidePanelWidthRight - sideGap * 2);
        const availableHeight = Math.max(240, viewportHeight - topGap - safePadding);

        this.cellSize = Math.max(12, Math.floor(Math.min(availableWidth / GRID_COLS, availableHeight / GRID_ROWS)));
        this.boardWidth = this.cellSize * GRID_COLS;
        this.boardHeight = this.cellSize * GRID_ROWS;

        this.boardOffsetX = Math.floor((viewportWidth - this.boardWidth) * 0.5);
        this.boardOffsetY = Math.floor(topGap + (availableHeight - this.boardHeight) * 0.5);

        this.backgroundImage
            .setPosition(viewportWidth * 0.5, viewportHeight * 0.5)
            .setDisplaySize(viewportWidth, viewportHeight);

        [this.gridGraphics, this.snakeGraphics, this.foodGraphics, this.obstacleGraphics].forEach((layer) => {
            layer.setPosition(0, 0);
            layer.setScale(1);
        });

        this.positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight);

        this.drawBoardFrame(this.boardWidth, this.boardHeight);
        this.drawGrid();
    }

    positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight) {
        if (this.hudLeftPlayer) {
            const leftAreaStart = safePadding;
            const leftAreaEnd = this.boardOffsetX - sideGap;
            const leftFree = Math.max(0, leftAreaEnd - leftAreaStart - sidePanelWidthLeft);
            const leftX = Math.floor(leftAreaStart + leftFree * 0.5);
            const leftY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudLeftPlayer.offsetHeight) * 0.5);
            this.hudLeftPlayer.style.left = `${leftX}px`;
            this.hudLeftPlayer.style.right = 'auto';
            this.hudLeftPlayer.style.top = `${Math.max(8, leftY)}px`;
            this.hudLeftPlayer.style.transform = 'none';
        }

        if (this.hudRightPlayer) {
            const rightAreaStart = this.boardOffsetX + this.boardWidth + sideGap;
            const rightAreaEnd = viewportWidth - safePadding;
            const rightFree = Math.max(0, rightAreaEnd - rightAreaStart - sidePanelWidthRight);
            const rightX = Math.floor(rightAreaStart + rightFree * 0.5);
            const rightY = Math.floor(this.boardOffsetY + (this.boardHeight - this.hudRightPlayer.offsetHeight) * 0.5);
            this.hudRightPlayer.style.left = `${rightX}px`;
            this.hudRightPlayer.style.right = 'auto';
            this.hudRightPlayer.style.top = `${Math.max(8, rightY)}px`;
            this.hudRightPlayer.style.transform = 'none';
        }

        if (this.hudHelpWrap) {
            const helpTop = Math.max(8, this.boardOffsetY - helpHeight - 10);
            this.hudHelpWrap.style.top = `${helpTop}px`;
            this.hudHelpWrap.style.left = `${Math.floor(viewportWidth * 0.5)}px`;
            this.hudHelpWrap.style.transform = 'translateX(-50%)';
        }
    }

    drawBoardFrame(boardWidthScaled, boardHeightScaled) {
        this.boardBackgroundGraphics.clear();

        const outerPadding = 14;
        this.boardBackgroundGraphics.fillStyle(0x0f172a, 0.86);
        this.boardBackgroundGraphics.fillRoundedRect(
            this.boardOffsetX - outerPadding,
            this.boardOffsetY - outerPadding,
            boardWidthScaled + outerPadding * 2,
            boardHeightScaled + outerPadding * 2,
            18
        );

        this.boardBackgroundGraphics.lineStyle(3, 0x22d3ee, 0.55);
        this.boardBackgroundGraphics.strokeRoundedRect(
            this.boardOffsetX - outerPadding,
            this.boardOffsetY - outerPadding,
            boardWidthScaled + outerPadding * 2,
            boardHeightScaled + outerPadding * 2,
            18
        );
    }

    drawGrid() {
        this.gridGraphics.clear();
        this.gridGraphics.lineStyle(1, 0xffffff, 0.08);

        for (let col = 0; col <= GRID_COLS; col += 1) {
            const x = this.boardOffsetX + col * this.cellSize;
            this.gridGraphics.beginPath();
            this.gridGraphics.moveTo(x, this.boardOffsetY);
            this.gridGraphics.lineTo(x, this.boardOffsetY + this.boardHeight);
            this.gridGraphics.strokePath();
        }

        for (let row = 0; row <= GRID_ROWS; row += 1) {
            const y = this.boardOffsetY + row * this.cellSize;
            this.gridGraphics.beginPath();
            this.gridGraphics.moveTo(this.boardOffsetX, y);
            this.gridGraphics.lineTo(this.boardOffsetX + this.boardWidth, y);
            this.gridGraphics.strokePath();
        }
    }

    drawBoardCell(layer, x, y, color) {
        const col = Math.floor(x / GRID_SIZE);
        const row = Math.floor(y / GRID_SIZE);
        const px = this.boardOffsetX + col * this.cellSize;
        const py = this.boardOffsetY + row * this.cellSize;
        const padding = Math.max(1, Math.floor(this.cellSize * 0.08));

        layer.fillStyle(color, 1);
        layer.fillRect(
            px + padding,
            py + padding,
            Math.max(1, this.cellSize - padding * 2),
            Math.max(1, this.cellSize - padding * 2)
        );
    }

    updateLivesHud(targetElement, lives) {
        if (!targetElement) return;

        const safeLives = Math.max(0, Math.min(MAX_LIVES, Number(lives) || 0));
        const heartsOn = '<span class="text-danger">&#10084;</span>'.repeat(safeLives);
        const heartsOff = '<span class="text-secondary opacity-50">&#10084;</span>'.repeat(MAX_LIVES - safeLives);
        targetElement.innerHTML = `${heartsOn}${heartsOff}`;
    }

    // Helper: Push direction to buffer (limit to 3 to prevent spam)
    pushDirection(playerId, direction) {
        if (this.inputBuffers[playerId].length < 3) {
            this.inputBuffers[playerId].push(direction);
        }
    }

    gameTick() {
        this.handleInput();
        const oldScore = this.engine.getState().players.get(P1_ID).score; // Guardar solo 1 número

        const state = this.engine.tick();

        // Si el score de P1 o P2 ha cambiado, suena la manzana
        if (state.players.get(P1_ID).score > oldScore || state.players.get(P2_ID).score > oldScore) {
            this.sound.play('eat_apple', { volume: 0.7 });
        }

        this.renderState(state);
    }

    handleInput() {
        // Process one buffered input per player per tick
        [P1_ID, P2_ID].forEach(playerId => {
            if (this.inputBuffers[playerId].length > 0) {
                const direction = this.inputBuffers[playerId].shift();  // Dequeue
                this.engine.setNextDirection(playerId, direction);
            }
        });
    }

    renderState(state) {
        this.snakeGraphics.clear();
        this.foodGraphics.clear();
        this.obstacleGraphics.clear();

        state.players.forEach((player) => {
            if (!player.alive) return;
            player.segments.forEach((seg) => {
                this.drawBoardCell(this.snakeGraphics, seg.x, seg.y, player.color);
            });
        });

        state.food.forEach((f) => {
            this.drawBoardCell(this.foodGraphics, f.x, f.y, 0xffff00);
        });

        state.obstacles.forEach((o) => {
            this.drawBoardCell(this.obstacleGraphics, o.x, o.y, 0x888888);
        });

        const p1 = state.players.get(P1_ID);
        const p2 = state.players.get(P2_ID);

        if (p1 && this.hudJ1Score) this.hudJ1Score.textContent = `J1`;
        if (p2 && this.hudJ2Score) this.hudJ2Score.textContent = `J2`;
        if (p1 && this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${p1.score}`;
        if (p2 && this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = `${p2.score}`;

        if (p1) this.updateLivesHud(this.hudJ1Lives, p1.lives);
        if (p2) this.updateLivesHud(this.hudJ2Lives, p2.lives);

        if(p1.score >= WIN_SCORE || p2.score >= WIN_SCORE){
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
