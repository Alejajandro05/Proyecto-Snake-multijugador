import { SnakeEngine } from '@shared/SnakeEngine';
import { MAX_LIVES, TICK_MS, WIN_SCORE } from '@shared/GameConfig';
import { SnakeBoardRenderer } from '../renderers/SnakeBoardRenderer.js';

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
        this.boardRenderer = new SnakeBoardRenderer(this);

        this.cacheHudElements();
        this.toggleHud(true);

        // Domain engine – pure game logic, no Phaser/Colyseus dependency
        this.engine = new SnakeEngine();
        this.engine.addPlayer(P1_ID, { color: 0xe74c3c, startCol: 8,  startRow: 12 });
        this.engine.addPlayer(P2_ID, { color: 0x3498db, startCol: 24, startRow: 12 });

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
        this.applyBoardMetrics(this.boardRenderer.updateLayout({
            viewportWidth,
            viewportHeight,
            safePadding,
            sideGap,
            topGap,
            sidePanelWidthLeft,
            sidePanelWidthRight,
        }));

        this.positionHudElements(viewportWidth, viewportHeight, sidePanelWidthLeft, sidePanelWidthRight, sideGap, safePadding, helpHeight);
    }

    applyBoardMetrics(metrics) {
        this.boardOffsetX = metrics.boardOffsetX;
        this.boardOffsetY = metrics.boardOffsetY;
        this.boardWidth = metrics.boardWidth;
        this.boardHeight = metrics.boardHeight;
        this.cellSize = metrics.cellSize;
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
        const state = this.engine.tick();
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
        this.boardRenderer.renderState(state);

        const p1 = state.players.get(P1_ID);
        const p2 = state.players.get(P2_ID);

        if (p1 && this.hudJ1Score) this.hudJ1Score.textContent = `J1`;
        if (p2 && this.hudJ2Score) this.hudJ2Score.textContent = `J2`;
        if (p1 && this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${p1.score}`;
        if (p2 && this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = `${p2.score}`;

        if (p1) this.updateLivesHud(this.hudJ1Lives, p1.lives);
        if (p2) this.updateLivesHud(this.hudJ2Lives, p2.lives);

        if (p1.score >= WIN_SCORE || p2.score >= WIN_SCORE) {
            this.gameOver(true) // ganador por puntuación
        }

        if (p1.lives <= 0 || p2.lives <= 0) {
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
