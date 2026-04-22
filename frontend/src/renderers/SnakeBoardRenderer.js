// frontend/src/renderers/SnakeBoardRenderer.js
import { GRID_COLS, GRID_ROWS, GRID_SIZE } from '@shared/GameConfig';
import { ASSET_KEYS } from '../config/assetManifest.js';

const FOOD_COLOR = 0xffff00;
const OBSTACLE_COLOR = 0x888888;

// Ángulos de rotación para segmentos rectos (asset base orientado →)
const DIR_ANGLE = {
    right: 0,
    down: Math.PI / 2,
    left: Math.PI,
    up: -Math.PI / 2,
};

// Mapa playerIndex → keys de sus sprites
const PLAYER_SPRITE_KEYS = [
    {
        head: ASSET_KEYS.SNAKE_P1_HEAD,
        body: ASSET_KEYS.SNAKE_P1_BODY,
        turn: ASSET_KEYS.SNAKE_P1_TURN,
        tail: ASSET_KEYS.SNAKE_P1_TAIL,
    },
    {
        head: ASSET_KEYS.SNAKE_P2_HEAD,
        body: ASSET_KEYS.SNAKE_P2_BODY,
        turn: ASSET_KEYS.SNAKE_P2_TURN,
        tail: ASSET_KEYS.SNAKE_P2_TAIL,
    },
];

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
        ).setAlpha(0.22).setDepth(-50);

        this.boardBackgroundGraphics = this.scene.add.graphics().setDepth(-20);

        this.floorTileSprite = this.scene.textures.exists(ASSET_KEYS.MAP_FLOOR_TILE)
            ? this.scene.add.tileSprite(0, 0, 1, 1, ASSET_KEYS.MAP_FLOOR_TILE)
                .setOrigin(0).setAlpha(0.96).setDepth(-15)
            : null;

        this.gridGraphics = this.scene.add.graphics().setDepth(-10);

        this.boardFrameSprite = this.scene.textures.exists(ASSET_KEYS.MAP_BOARD_FRAME)
            ? this.scene.add.image(0, 0, ASSET_KEYS.MAP_BOARD_FRAME)
                .setOrigin(0).setAlpha(0.92).setDepth(5)
            : null;

        this.snakeGraphics = this.scene.add.graphics().setDepth(10);
        this.foodGraphics = this.scene.add.graphics().setDepth(11);
        this.obstacleGraphics = this.scene.add.graphics().setDepth(12);
        this.obstacleSprites = [];

        // Pool de sprites por jugador: snakeSpritePools[playerIndex] = []
        this.snakeSpritePools = [[], []];
    }

    // ─────────────────────────────────────────────────────────────────
    //  LAYOUT
    // ─────────────────────────────────────────────────────────────────

    updateLayout({
        viewportWidth,
        viewportHeight,
        safePadding = 18,
        sideGap = 22,
        topGap = 68,
        sidePanelWidthLeft = 0,
        sidePanelWidthRight = 0,
    }) {
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

        this.updateFloorTileLayer();
        this.updateBoardFrameSprite();

        [this.gridGraphics, this.snakeGraphics, this.foodGraphics, this.obstacleGraphics].forEach((layer) => {
            layer.setPosition(0, 0).setScale(1);
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

    // ─────────────────────────────────────────────────────────────────
    //  RENDER PRINCIPAL
    // ─────────────────────────────────────────────────────────────────

    clearDynamicLayers() {
        this.snakeGraphics.clear();
        this.foodGraphics.clear();
        this.obstacleGraphics.clear();
        this.hideObstacleSprites();
        this.snakeSpritePools.forEach(pool => pool.forEach(s => s.setVisible(false)));
    }

    renderState(state) {
        this.clearDynamicLayers();
        this.renderPlayers(state?.players);
        this.renderFood(state?.food);
        this.renderObstacles(state?.obstacles);
    }

    // ─────────────────────────────────────────────────────────────────
    //  RENDERIZADO DE SERPIENTES
    // ─────────────────────────────────────────────────────────────────

    renderPlayers(players) {
        let playerIndex = 0;
        players?.forEach?.((player) => {
            if (!player?.alive) {
                playerIndex++;
                return;
            }
            this._renderPlayerSprites(player, playerIndex);
            playerIndex++;
        });
    }

    _renderPlayerSprites(player, playerIndex) {
        const segments = player.segments;
        if (!segments || segments.length === 0) return;

        const keys = PLAYER_SPRITE_KEYS[playerIndex] ?? PLAYER_SPRITE_KEYS[0];
        const useSprites = this._playerHasSprites(keys);

        if (!useSprites) {
            // FALLBACK: comportamiento original con fillRect
            segments.forEach((seg) => {
                this.drawBoardCell(this.snakeGraphics, seg.x, seg.y, player.color);
            });
            return;
        }

        segments.forEach((seg, i) => {
            const isHead = i === 0;
            const isTail = i === segments.length - 1;
            const spriteKey = this._selectSpriteKey(keys, segments, i, isHead, isTail);
            const isTurnSprite = spriteKey === keys.turn;

            const angle = isTurnSprite
                ? this._computeTurnAngle(segments, i)
                : this._computeAngle(segments, i, isHead, isTail, player.direction);

            const sprite = this._getSnakeSprite(playerIndex, i, spriteKey);
            this._placeSprite(sprite, seg, angle);
        });
    }

    /** Devuelve true si los sprites mínimos (head + body) están cargados */
    _playerHasSprites(keys) {
        return (
            this.scene.textures.exists(keys.head) &&
            this.scene.textures.exists(keys.body)
        );
    }

    /**
     * Decide qué sprite usar para el segmento i:
     *   - índice 0       → head
     *   - último índice  → tail (o body si no existe)
     *   - intermedio con giro → turn (o body si no existe)
     *   - intermedio recto   → body
     */
    _selectSpriteKey(keys, segments, i, isHead, isTail) {
        if (isHead) return keys.head;

        if (isTail) {
            return this.scene.textures.exists(keys.tail) ? keys.tail : keys.body;
        }

        if (this.scene.textures.exists(keys.turn)) {
            const prev = segments[i - 1];
            const next = segments[i + 1];
            if (prev && next) {
                const dxIn = segments[i].x - prev.x;
                const dyIn = segments[i].y - prev.y;
                const dxOut = next.x - segments[i].x;
                const dyOut = next.y - segments[i].y;
                const isTurn = (dxIn !== 0 && dyOut !== 0) || (dyIn !== 0 && dxOut !== 0);
                if (isTurn) return keys.turn;
            }
        }

        return keys.body;
    }

    /**
     * Ángulo para segmentos rectos (head, body, tail).
     * Asset base orientado hacia la derecha (→).
     */
    _computeAngle(segments, i, isHead, isTail, playerDirection) {
        if (isHead) {
            return DIR_ANGLE[playerDirection] ?? 0;
        }

        const prev = segments[i - 1];
        const current = segments[i];
        const dx = current.x - prev.x;
        const dy = current.y - prev.y;

        if (dx > 0) return DIR_ANGLE.right;
        if (dx < 0) return DIR_ANGLE.left;
        if (dy > 0) return DIR_ANGLE.down;
        return DIR_ANGLE.up;
    }

    /**
     * Ángulo para segmentos de giro.
     * Asset base: viene desde abajo (↑) y gira a la derecha (→).
     *
     * Vectores: entrada = prev→current, salida = current→next
     *
     * ┌─────────────────────────────────────────────────────┐
     * │  Entrada  │  Salida   │  Ángulo                     │
     * ├───────────┼───────────┼─────────────────────────────┤
     * │  ↑ (ey=-1)│  → (sx=1) │  0        (base del asset)  │
     * │  → (ex=1) │  ↑ (sy=-1)│  0        (equivalente)     │
     * │  ↓ (ey=1) │  ← (sx=-1)│  π        (180°)            │
     * │  ← (ex=-1)│  ↓ (sy=1) │  π        (180°)            │
     * │  ↑ (ey=-1)│  ← (sx=-1)│  -π/2     (-90°)            │
     * │  ← (ex=-1)│  ↑ (sy=-1)│  -π/2     (-90°)            │
     * │  ↓ (ey=1) │  → (sx=1) │  +π/2     (90°)             │
     * │  → (ex=1) │  ↓ (sy=1) │  +π/2     (90°)             │
     * └─────────────────────────────────────────────────────┘
     */

    _computeTurnAngle(segments, i) {
        const prev = segments[i - 1];
        const current = segments[i];
        const next = segments[i + 1];
        if (!prev || !next) return 0;

        const ex = Math.sign(current.x - prev.x);
        const ey = Math.sign(current.y - prev.y);
        const sx = Math.sign(next.x - current.x);
        const sy = Math.sign(next.y - current.y);

        // ex  ey  sx  sy  → ángulo
        if (ex === -1 && ey === 0 && sx === 0 && sy === 1) return 0;
        if (ex === 0 && ey === 1 && sx === -1 && sy === 0) return Math.PI;
        if (ex === 1 && ey === 0 && sx === 0 && sy === -1) return -Math.PI;
        if (ex === 0 && ey === -1 && sx === 1 && sy === 0) return 0;
        if (ex === -1 && ey === 0 && sx === 0 && sy === -1) return -Math.PI / 2;
        if (ex === 0 && ey === -1 && sx === -1 && sy === 0) return Math.PI / 2;
        if (ex === 1 && ey === 0 && sx === 0 && sy === 1) return Math.PI / 2;
        if (ex === 0 && ey === 1 && sx === 1 && sy === 0) return -Math.PI / 2;

        return 0;
    }


    /**
     * Obtiene (o crea) el sprite del pool para este jugador y posición en la serpiente.
     * Usa object pooling para no crear/destruir objetos en cada tick.
     */
    _getSnakeSprite(playerIndex, segmentIndex, textureKey) {
        const pool = this.snakeSpritePools[playerIndex];

        if (pool[segmentIndex]) {
            const sprite = pool[segmentIndex];
            if (sprite.texture.key !== textureKey) {
                sprite.setTexture(textureKey);
            }
            return sprite;
        }

        const sprite = this.scene.add.image(0, 0, textureKey)
            .setOrigin(0.5)
            .setDepth(10)
            .setVisible(false);

        pool[segmentIndex] = sprite;
        return sprite;
    }

    /**
     * Posiciona, escala y rota un sprite en una celda del tablero.
     */
    _placeSprite(sprite, segment, angle) {
        const col = Math.floor(segment.x / GRID_SIZE);
        const row = Math.floor(segment.y / GRID_SIZE);
        const centerX = this.boardOffsetX + col * this.cellSize + this.cellSize * 0.5;
        const centerY = this.boardOffsetY + row * this.cellSize + this.cellSize * 0.5;

        sprite
            .setPosition(centerX, centerY)
            .setDisplaySize(this.cellSize, this.cellSize)
            .setRotation(angle)
            .setVisible(true);
    }

    // ─────────────────────────────────────────────────────────────────
    //  COMIDA Y OBSTÁCULOS
    // ─────────────────────────────────────────────────────────────────

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
        if (this.obstacleSprites[index]) return this.obstacleSprites[index];
        const sprite = this.scene.add.image(0, 0, ASSET_KEYS.MAP_OBSTACLE_ROCK)
            .setOrigin(0).setDepth(12).setVisible(false);
        this.obstacleSprites[index] = sprite;
        return sprite;
    }

    hideObstacleSprites() {
        this.obstacleSprites.forEach(s => s.setVisible(false));
    }

    // ─────────────────────────────────────────────────────────────────
    //  TABLERO
    // ─────────────────────────────────────────────────────────────────

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

        for (let col = 0; col <= GRID_COLS; col++) {
            const x = this.boardOffsetX + col * this.cellSize;
            this.gridGraphics.beginPath();
            this.gridGraphics.moveTo(x, this.boardOffsetY);
            this.gridGraphics.lineTo(x, this.boardOffsetY + this.boardHeight);
            this.gridGraphics.strokePath();
        }

        for (let row = 0; row <= GRID_ROWS; row++) {
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