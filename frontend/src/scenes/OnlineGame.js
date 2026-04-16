import { Client } from '@colyseus/sdk';
import { GRID_COLS, GRID_ROWS, GRID_SIZE, MAX_LIVES, WIN_SCORE } from '@shared/GameConfig';

const SERVER_URL = 'ws://localhost:2567';

/**
 * Online multiplayer game use case.
 * Renders the same UI as LocalGame while syncing authoritative state from Colyseus.
 */
export class OnlineGame extends Phaser.Scene {
    constructor() {
        super('OnlineGame');
    }

    async create() {
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

        this.cacheHudElements();
        this.toggleHud(true);

        this.boardBackgroundGraphics = this.add.graphics();
        this.mapTileLayer = this.add.renderTexture(0, 0, 1, 1);
        this.gridGraphics = this.add.graphics();
        this.snakeGraphics = this.add.graphics();
        this.foodGraphics = this.add.graphics();
        this.obstacleGraphics = this.add.graphics();

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys({ up: 'W', left: 'A', down: 'S', right: 'D' });

        this.isLeavingRoom = false;
        this.input.keyboard.on('keydown-ESC', () => this.leaveRoom());

        this.directionHandlers = {
            up: () => this.sendDirection('up'),
            down: () => this.sendDirection('down'),
            left: () => this.sendDirection('left'),
            right: () => this.sendDirection('right'),
        };

        this.input.keyboard.on('keydown-UP', this.directionHandlers.up);
        this.input.keyboard.on('keydown-DOWN', this.directionHandlers.down);
        this.input.keyboard.on('keydown-LEFT', this.directionHandlers.left);
        this.input.keyboard.on('keydown-RIGHT', this.directionHandlers.right);
        this.input.keyboard.on('keydown-W', this.directionHandlers.up);
        this.input.keyboard.on('keydown-A', this.directionHandlers.left);
        this.input.keyboard.on('keydown-S', this.directionHandlers.down);
        this.input.keyboard.on('keydown-D', this.directionHandlers.right);

        this.resizeHandler = (gameSize) => this.updateLayout(gameSize.width, gameSize.height);
        this.scale.on('resize', this.resizeHandler);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.scale.off('resize', this.resizeHandler);
            this.toggleHud(false);
            this.removeInputListeners();
            this.cleanupRoom();
        });

        this.updateLayout(this.scale.width, this.scale.height);

        this.latestState = null;
        this.renderState({ players: new Map(), food: [], obstacles: [] });

        await this.connectToServer();
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

    // ── NUEVO: Rellenar el tablero con el tile de suelo ──────────────
    this.mapTileLayer.setPosition(this.boardOffsetX, this.boardOffsetY);
    this.mapTileLayer.resize(boardWidthScaled, boardHeightScaled);
    this.mapTileLayer.clear();

    const tileTexture = this.textures.get('map_tile');
    const tileFrame   = tileTexture.get();
    const tileW       = tileFrame.realWidth;   // 32
    const tileH       = tileFrame.realHeight;  // 32

    for (let py = 0; py < boardHeightScaled; py += tileH) {
        for (let px = 0; px < boardWidthScaled; px += tileW) {
            this.mapTileLayer.draw('map_tile', px, py);
        }
    }
    // ────────────────────────────────────────────────────────────────

    // Marco oscuro exterior (ligeramente más transparente porque ya hay textura)
    this.boardBackgroundGraphics.fillStyle(0x030a0f, 0.55);
    this.boardBackgroundGraphics.fillRoundedRect(
        this.boardOffsetX - outerPadding,
        this.boardOffsetY - outerPadding,
        boardWidthScaled + outerPadding * 2,
        boardHeightScaled + outerPadding * 2,
        18
    );

    // Borde exterior cyan (igual que antes)
    this.boardBackgroundGraphics.lineStyle(3, 0x22d3ee, 0.55);
    this.boardBackgroundGraphics.strokeRoundedRect(
        this.boardOffsetX - outerPadding,
        this.boardOffsetY - outerPadding,
        boardWidthScaled + outerPadding * 2,
        boardHeightScaled + outerPadding * 2,
        18
    );

    // Borde interior brillante (nuevo detalle pixel art / arcade)
    this.boardBackgroundGraphics.lineStyle(1, 0x00ff88, 0.18);
    this.boardBackgroundGraphics.strokeRoundedRect(
        this.boardOffsetX - outerPadding + 4,
        this.boardOffsetY - outerPadding + 4,
        boardWidthScaled + (outerPadding - 4) * 2,
        boardHeightScaled + (outerPadding - 4) * 2,
        14
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

    getOrderedPlayers(state) {
        return Array.from(state?.players?.values?.() ?? []);
    }

    syncHudFromPlayers(state) {
        const players = this.getOrderedPlayers(state);
        const firstPlayer = players[0];
        const secondPlayer = players[1];

        if (this.hudJ1Score) this.hudJ1Score.textContent = 'J1';
        if (this.hudJ2Score) this.hudJ2Score.textContent = 'J2';

        if (this.hudJ1ScoreBig) this.hudJ1ScoreBig.textContent = `${firstPlayer?.score ?? 0}`;
        if (this.hudJ2ScoreBig) this.hudJ2ScoreBig.textContent = `${secondPlayer?.score ?? 0}`;

        if (this.hudJ1Lives) this.updateLivesHud(this.hudJ1Lives, firstPlayer?.lives ?? MAX_LIVES);
        if (this.hudJ2Lives) this.updateLivesHud(this.hudJ2Lives, secondPlayer?.lives ?? MAX_LIVES);

        return { firstPlayer, secondPlayer };
    }

    async connectToServer() {
        try {
            const client = new Client(SERVER_URL);
            this.room = await client.joinOrCreate('snake_room');

            this.room.onStateChange((state) => {
                this.latestState = state;
                this.renderState(state);
            });

            this.room.onLeave(() => {
                if (this.isLeavingRoom) return;
                this.cleanupRoom();
                this.scene.start('MainMenu');
            });

            this.room.onError((code, message) => {
                console.error('OnlineGame room error:', code, message);
                if (!this.isLeavingRoom) {
                    this.cleanupRoom();
                    this.scene.start('MainMenu');
                }
            });
        } catch (err) {
            console.error('OnlineGame connection error:', err);
            this.cleanupRoom();
            this.scene.start('MainMenu');
        }
    }

    sendDirection(direction) {
        if (!this.room) return;
        this.room.send('changeDirection', direction);
    }

    removeInputListeners() {
        if (!this.input?.keyboard || !this.directionHandlers) return;

        this.input.keyboard.off('keydown-UP', this.directionHandlers.up);
        this.input.keyboard.off('keydown-DOWN', this.directionHandlers.down);
        this.input.keyboard.off('keydown-LEFT', this.directionHandlers.left);
        this.input.keyboard.off('keydown-RIGHT', this.directionHandlers.right);
        this.input.keyboard.off('keydown-W', this.directionHandlers.up);
        this.input.keyboard.off('keydown-S', this.directionHandlers.down);
        this.input.keyboard.off('keydown-A', this.directionHandlers.left);
        this.input.keyboard.off('keydown-D', this.directionHandlers.right);
    }

    cleanupRoom() {
        if (this.room) {
            this.room.leave();
            this.room = null;
        }
    }

    leaveRoom() {
        if (this.isLeavingRoom) return;
        this.isLeavingRoom = true;
        this.cleanupRoom();
        this.scene.start('MainMenu');
    }

    renderState(state) {
        if (!state) return;

        this.latestState = state;
        this.snakeGraphics.clear();
        this.foodGraphics.clear();
        this.obstacleGraphics.clear();

        const { firstPlayer, secondPlayer } = this.syncHudFromPlayers(state);

        state.players.forEach((player) => {
            if (!player.alive) return;

            player.segments.forEach((seg) => {
                this.drawBoardCell(this.snakeGraphics, seg.x, seg.y, player.color);
            });
        });

        state.food.forEach((food) => {
            this.drawBoardCell(this.foodGraphics, food.x, food.y, 0xffff00);
        });

        state.obstacles.forEach((obstacle) => {
            this.drawBoardCell(this.obstacleGraphics, obstacle.x, obstacle.y, 0x888888);
        });

        if (firstPlayer && secondPlayer) {
            if (firstPlayer.score >= WIN_SCORE || secondPlayer.score >= WIN_SCORE) {
                this.gameOver(true);
                return;
            }

            if (firstPlayer.lives <= 0 || secondPlayer.lives <= 0) {
                this.gameOver(false);
            }
        }
    }

    gameOver(reason) {
        if (this.isLeavingRoom) return;
        this.isLeavingRoom = true;
        this.cleanupRoom();

        const players = this.getOrderedPlayers(this.latestState);
        const p1 = players[0];
        const p2 = players[1];

        if (!p1 || !p2) {
            this.scene.start('MainMenu');
            return;
        }

        if (reason) {
            this.scene.start('GameOver', {
                winner: p1.score > p2.score ? 'J1' : 'J2',
                p1Score: p1.score,
                p1Lives: p1.lives,
                p2Score: p2.score,
                p2Lives: p2.lives,
                reason: 'score'
            });
        } else {
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

    shutdown() {
        this.toggleHud(false);
        this.removeInputListeners();
        this.cleanupRoom();
    }
}
