import { GRID_COLS, GRID_ROWS, GRID_SIZE } from '@shared/GameConfig';
import { ASSET_KEYS } from '../config/assetManifest.js';

const FOOD_COLOR = 0xffff00;
const OBSTACLE_COLOR = 0x888888;

export class SnakeBoardRenderer {
    constructor(scene) {
        this.scene = scene;
        this.outerPadding = 14;
        this.boardOffsetX = 0;
        this.boardOffsetY = 0;
        this.cellSize = GRID_SIZE;
        this.boardWidth = GRID_COLS * GRID_SIZE;
        this.boardHeight = GRID_ROWS * GRID_SIZE;

        this.scene.cameras.main.roundPixels = true;
        this.scene.cameras.main.setBackgroundColor(0x1a1a2e);

        this.backgroundImage = this.scene.add.image(
            this.scene.scale.width * 0.5,
            this.scene.scale.height * 0.5,
            'background'
        )
            .setAlpha(0.22)
            .setDepth(-50);

        this.boardBackgroundGraphics = this.scene.add.graphics().setDepth(-20);
        this.floorTileSprite = this.scene.textures.exists(ASSET_KEYS.MAP_FLOOR_TILE)
            ? this.scene.add.tileSprite(0, 0, 1, 1, ASSET_KEYS.MAP_FLOOR_TILE).setOrigin(0).setAlpha(0.96).setDepth(-15)
            : null;
        this.gridGraphics = this.scene.add.graphics().setDepth(-10);
        this.boardFrameSprite = this.scene.textures.exists(ASSET_KEYS.MAP_BOARD_FRAME)
            ? this.scene.add.image(0, 0, ASSET_KEYS.MAP_BOARD_FRAME).setOrigin(0).setAlpha(0.92).setDepth(5)
            : null;
        this.snakeGraphics = this.scene.add.graphics().setDepth(10);
        this.foodGraphics = this.scene.add.graphics().setDepth(11);
        this.obstacleGraphics = this.scene.add.graphics().setDepth(12);
        this.obstacleSprites = [];
    }

    updateLayout({
        viewportWidth,
        viewportHeight,
        safePadding = 18,
        sideGap = 22,
        topGap = 68,
        sidePanelWidthLeft = 0,
        sidePanelWidthRight = 0,
    }) {
        const availableWidth = Math.max(
            320,
            viewportWidth - safePadding * 2 - sidePanelWidthLeft - sidePanelWidthRight - sideGap * 2
        );
        const availableHeight = Math.max(240, viewportHeight - topGap - safePadding);

        this.cellSize = Math.max(12, Math.floor(Math.min(availableWidth / GRID_COLS, availableHeight / GRID_ROWS)));
        this.boardWidth = this.cellSize * GRID_COLS;
        this.boardHeight = this.cellSize * GRID_ROWS;

        this.boardOffsetX = Math.floor((viewportWidth - this.boardWidth) * 0.5);
        this.boardOffsetY = Math.floor(topGap + (availableHeight - this.boardHeight) * 0.5);

        this.backgroundImage
            .setPosition(viewportWidth * 0.5, viewportHeight * 0.5)
            .setDisplaySize(viewportWidth, viewportHeight);

        this.updateFloorTileLayer();
        this.updateBoardFrameSprite();

        [this.gridGraphics, this.snakeGraphics, this.foodGraphics, this.obstacleGraphics].forEach((layer) => {
            layer.setPosition(0, 0);
            layer.setScale(1);
        });

        this.drawBoardFrame();
        this.drawGrid();

        return this.getMetrics();
    }

    getMetrics() {
        return {
            boardOffsetX: this.boardOffsetX,
            boardOffsetY: this.boardOffsetY,
            boardWidth: this.boardWidth,
            boardHeight: this.boardHeight,
            cellSize: this.cellSize,
        };
    }

    updateFloorTileLayer() {
        if (!this.floorTileSprite) return;

        const textureFrame = this.scene.textures.get(ASSET_KEYS.MAP_FLOOR_TILE).get();
        const scaleX = this.cellSize / textureFrame.realWidth;
        const scaleY = this.cellSize / textureFrame.realHeight;

        this.floorTileSprite
            .setPosition(this.boardOffsetX, this.boardOffsetY)
            .setSize(this.boardWidth, this.boardHeight)
            .setVisible(true);

        this.floorTileSprite.tilePositionX = 0;
        this.floorTileSprite.tilePositionY = 0;
        this.floorTileSprite.tileScaleX = scaleX;
        this.floorTileSprite.tileScaleY = scaleY;
    }

    updateBoardFrameSprite() {
        if (!this.boardFrameSprite) return;

        const frameWidth = this.boardWidth + this.outerPadding * 2;
        const frameHeight = this.boardHeight + this.outerPadding * 2;

        this.boardFrameSprite
            .setPosition(this.boardOffsetX - this.outerPadding, this.boardOffsetY - this.outerPadding)
            .setDisplaySize(frameWidth, frameHeight)
            .setVisible(true);
    }

    clearDynamicLayers() {
        this.snakeGraphics.clear();
        this.foodGraphics.clear();
        this.obstacleGraphics.clear();
        this.hideObstacleSprites();
    }

    renderState(state) {
        this.clearDynamicLayers();
        this.renderPlayers(state?.players);
        this.renderFood(state?.food);
        this.renderObstacles(state?.obstacles);
    }

    renderPlayers(players) {
        players?.forEach?.((player) => {
            if (!player?.alive) return;

            player.segments?.forEach?.((segment) => {
                this.drawBoardCell(this.snakeGraphics, segment.x, segment.y, player.color);
            });
        });
    }

    renderFood(foodItems) {
        foodItems?.forEach?.((food) => {
            this.drawBoardCell(this.foodGraphics, food.x, food.y, FOOD_COLOR);
        });
    }

    renderObstacles(obstacles) {
        if (!this.scene.textures.exists(ASSET_KEYS.MAP_OBSTACLE_ROCK)) {
            obstacles?.forEach?.((obstacle) => {
                this.drawBoardCell(this.obstacleGraphics, obstacle.x, obstacle.y, OBSTACLE_COLOR);
            });
            return;
        }

        obstacles?.forEach?.((obstacle, index) => {
            const sprite = this.getObstacleSprite(index);
            const col = Math.floor(obstacle.x / GRID_SIZE);
            const row = Math.floor(obstacle.y / GRID_SIZE);
            const px = this.boardOffsetX + col * this.cellSize;
            const py = this.boardOffsetY + row * this.cellSize;
            const padding = Math.max(1, Math.floor(this.cellSize * 0.04));

            sprite
                .setPosition(px + padding, py + padding)
                .setDisplaySize(
                    Math.max(1, this.cellSize - padding * 2),
                    Math.max(1, this.cellSize - padding * 2)
                )
                .setVisible(true);
        });
    }

    getObstacleSprite(index) {
        if (this.obstacleSprites[index]) {
            return this.obstacleSprites[index];
        }

        const sprite = this.scene.add.image(0, 0, ASSET_KEYS.MAP_OBSTACLE_ROCK)
            .setOrigin(0)
            .setDepth(12)
            .setVisible(false);

        this.obstacleSprites[index] = sprite;
        return sprite;
    }

    hideObstacleSprites() {
        this.obstacleSprites.forEach((sprite) => {
            sprite.setVisible(false);
        });
    }

    drawBoardFrame() {
        this.boardBackgroundGraphics.clear();

        this.boardBackgroundGraphics.fillStyle(0x0f172a, 0.86);
        this.boardBackgroundGraphics.fillRoundedRect(
            this.boardOffsetX - this.outerPadding,
            this.boardOffsetY - this.outerPadding,
            this.boardWidth + this.outerPadding * 2,
            this.boardHeight + this.outerPadding * 2,
            18
        );

        if (!this.boardFrameSprite) {
            this.boardBackgroundGraphics.lineStyle(3, 0x22d3ee, 0.55);
            this.boardBackgroundGraphics.strokeRoundedRect(
                this.boardOffsetX - this.outerPadding,
                this.boardOffsetY - this.outerPadding,
                this.boardWidth + this.outerPadding * 2,
                this.boardHeight + this.outerPadding * 2,
                18
            );
        }
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
}
