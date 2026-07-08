// frontend/src/renderers/SnakeBoardRenderer.js
import { GRID_COLS, GRID_ROWS, GRID_SIZE } from '@shared/GameConfig';
import { ASSET_KEYS } from '../config/assetManifest.js';
import { getMapAsset, getSnakeAsset } from '../config/gameAssetRegistry.js';
import { getSnakeIdentityStyle } from './snakeIdentityStyle.js';

const FOOD_COLOR     = 0xffff00;
const OBSTACLE_COLOR = 0x888888;
const FOOD_FRAME_CYCLE = [0, 1, 2, 3, 4, 5];
const FOOD_PADDING_RATIO = 0.04;

const FOOD_TYPE_TO_FRAME = {
    apple: 0,
    grape: 3,
    poison: 4,
    speed: 10
};

const SPECIAL_FOOD_EFFECTS = {
    grape: { color: 0xC084FC, label: '+3' },
    speed: { color: 0xF472B6, label: 'speed' },
    poison: { color: 0xA3E635, label: '-2' },
};

const FOOD_EFFECT_DURATION_MS = 500;
const FOOD_EFFECT_PARTICLE_COUNT = 14;

const TUTORIAL_FRUIT_HIGHLIGHT_COLORS = {
    apple: 0xF87171,
    grape: 0xC084FC,
    speed: 0xF472B6,
    poison: 0xA3E635,
};

const TUTORIAL_OBSTACLE_HIGHLIGHT_COLOR = 0xF67D31;
const TUTORIAL_MIXED_FRUIT_HIGHLIGHT_COLOR = 0xFDE68A;

// Ángulos de rotación para cada dirección (en radianes)
const DIR_ANGLE = {
    right: 0,
    down:  Math.PI / 2,
    left:  Math.PI,
    up:    -Math.PI / 2,
};

export class SnakeBoardRenderer {
    constructor(scene, options = {}) {
        this.scene = scene;
        // Resolve map asset defensively: ensure we always have an object shape
        this.mapAsset = getMapAsset(options.mapId) || { id: null, theme: {}, floor: {}, border: {}, obstacle: {} };
        this.activeMapId = this.mapAsset.id ?? null;
        
        // Use dynamic grid dimensions from options, fallback to constants
        this.gridCols = options.gridCols ?? GRID_COLS;
        this.gridRows = options.gridRows ?? GRID_ROWS;
        this.gridSize = GRID_SIZE;
        
        this.outerPadding = 14;
        this.boardOffsetX = 0;
        this.boardOffsetY = 0;
        this.cellSize = GRID_SIZE;
        this.boardWidth  = this.gridCols * GRID_SIZE;
        this.boardHeight = this.gridRows * GRID_SIZE;

        this.scene.cameras.main.roundPixels = true;
        // Only set background color if theme value exists
        if (this.mapAsset?.theme?.backgroundColor != null) {
            this.scene.cameras.main.setBackgroundColor(this.mapAsset.theme.backgroundColor);
        }

        this.backgroundImage = this.scene.add.image(
            this.scene.scale.width  * 0.5,
            this.scene.scale.height * 0.5,
            'background'
        ).setAlpha(0.22).setDepth(-50);

        this.boardBackgroundGraphics = this.scene.add.graphics().setDepth(-20);
        const floorKey = this.mapAsset?.floor?.key;
        this.floorTileSprite = (floorKey && this.scene.textures.exists(floorKey))
            ? this.scene.add.tileSprite(0, 0, 1, 1, floorKey)
                .setOrigin(0).setAlpha(0.96).setDepth(-15)
            : null;
        this.gridGraphics    = this.scene.add.graphics().setDepth(-10);
        this.boardBorderSprites = [];
        this.ensureBoardBorderSprites();

        this.identityGraphics = this.scene.add.graphics().setDepth(9);
        this.territoryGraphics = this.scene.add.graphics().setDepth(-12);
        this.snakeGraphics    = this.scene.add.graphics().setDepth(10);
        this.foodGraphics     = this.scene.add.graphics().setDepth(11);
        this.obstacleGraphics = this.scene.add.graphics().setDepth(12);
        this.foodSprites      = [];
        this.obstacleSprites  = [];

        this.tutorialHighlightGraphics = this.scene.add.graphics().setDepth(13);
        this.tutorialHighlight = null;
        this.highlightPulse = 0.5;
        this.highlightTween = null;
        this.lastRenderedState = null;
        this.lastFoodByKey = new Map();
        this.handledFoodEffectKeys = new Set();

        // Pool de sprites por jugador: snakeSpritePools[playerIndex] = []
        this.snakeSpritePools = [[], []];
    }

    setTutorialHighlight(highlight) {
        this.tutorialHighlight = highlight ?? null;
        if (!this.tutorialHighlight) {
            this.stopTutorialHighlightAnimation();
            this.tutorialHighlightGraphics.clear();
        }
    }

    startTutorialHighlightAnimation() {
        this.stopTutorialHighlightAnimation();
        if (!this.tutorialHighlight) return;

        this.highlightTween = this.scene.tweens.addCounter({
            from: 0,
            to: 1,
            duration: 750,
            yoyo: true,
            repeat: -1,
            onUpdate: (tween) => {
                this.highlightPulse = tween.getValue();
                if (!this.lastRenderedState || !this.tutorialHighlight) return;
                this.renderFood(this.lastRenderedState.food);
                this.renderObstacles(this.lastRenderedState.obstacles);
                this.renderTutorialHighlightOverlay(this.lastRenderedState);
            },
        });
    }

    stopTutorialHighlightAnimation() {
        if (this.highlightTween) {
            this.highlightTween.stop();
            this.highlightTween = null;
        }
        this.highlightPulse = 0.5;
        this.tutorialHighlightGraphics.clear();
    }

    hasTutorialHighlight() {
        return this.tutorialHighlight != null;
    }

    isFoodHighlighted(food) {
        const highlight = this.tutorialHighlight;
        if (!highlight || !food) return false;
        if (highlight.type === 'fruit') return food.type === highlight.fruitType;
        if (highlight.type === 'fruits-and-obstacles') return true;
        return false;
    }

    isObstacleHighlighted() {
        const highlight = this.tutorialHighlight;
        if (!highlight) return false;
        return highlight.type === 'obstacles' || highlight.type === 'fruits-and-obstacles';
    }

    getTutorialDimAlpha(isHighlighted) {
        if (!this.tutorialHighlight) return 1;
        return isHighlighted ? 1 : 0.22;
    }

    getHighlightColorForFood(food) {
        if (this.tutorialHighlight?.type === 'fruit') {
            return TUTORIAL_FRUIT_HIGHLIGHT_COLORS[food.type] ?? 0xFDE68A;
        }
        return TUTORIAL_MIXED_FRUIT_HIGHLIGHT_COLOR;
    }

    setMapId(mapId) {
        const nextMap = getMapAsset(mapId) || { id: null, theme: {}, floor: {}, border: {}, obstacle: {} };
        if (nextMap.id === this.activeMapId) return;

        this.mapAsset = nextMap;
        this.activeMapId = nextMap.id ?? null;
        if (nextMap?.theme?.backgroundColor != null) {
            this.scene.cameras.main.setBackgroundColor(nextMap.theme.backgroundColor);
        }

        if (this.floorTileSprite && this.scene.textures.exists(nextMap.floor.key)) {
            this.floorTileSprite.setTexture(nextMap.floor.key);
        } else if (!this.floorTileSprite && this.scene.textures.exists(nextMap.floor.key)) {
            this.floorTileSprite = this.scene.add.tileSprite(0, 0, 1, 1, nextMap.floor.key)
                .setOrigin(0)
                .setAlpha(0.96)
                .setDepth(-15);
        }

        this.obstacleSprites.forEach((sprite) => sprite.setVisible(false));
        this.ensureBoardBorderSprites();
        this.updateFloorTileLayer();
        this.updateBoardBorderSprites();
        this.drawBoardFrame();
        this.drawGrid();
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
        sidePanelWidthLeft  = 0,
        sidePanelWidthRight = 0,
    }) {
        const availableWidth  = Math.max(320, viewportWidth  - safePadding * 2 - sidePanelWidthLeft - sidePanelWidthRight - sideGap * 2);
        const availableHeight = Math.max(240, viewportHeight - topGap - safePadding);

        this.cellSize    = Math.max(12, Math.floor(Math.min(availableWidth / this.gridCols, availableHeight / this.gridRows)));
        this.boardWidth  = this.cellSize * this.gridCols;
        this.boardHeight = this.cellSize * this.gridRows;

        this.boardOffsetX = Math.floor((viewportWidth  - this.boardWidth)  * 0.5);
        this.boardOffsetY = Math.floor(topGap + (availableHeight - this.boardHeight) * 0.5);

        this.backgroundImage
            .setPosition(viewportWidth * 0.5, viewportHeight * 0.5)
            .setDisplaySize(viewportWidth, viewportHeight);

        this.updateFloorTileLayer();
        this.updateBoardBorderSprites();

        [this.gridGraphics, this.territoryGraphics, this.identityGraphics, this.snakeGraphics, this.foodGraphics, this.obstacleGraphics].forEach((layer) => {
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
            boardWidth:   this.boardWidth,
            boardHeight:  this.boardHeight,
            cellSize:     this.cellSize,
        };
    }

    updateFloorTileLayer() {
        const floorKey = this.mapAsset?.floor?.key;
        if (!floorKey) {
            if (this.floorTileSprite) this.floorTileSprite.setVisible(false);
            return;
        }

        if (!this.scene.textures.exists(floorKey)) {
            if (this.floorTileSprite) this.floorTileSprite.setVisible(false);
            return;
        }

        const tex = this.scene.textures.get(floorKey);
        if (!tex || typeof tex.get !== 'function') {
            if (this.floorTileSprite) this.floorTileSprite.setVisible(false);
            return;
        }

        const textureFrame = tex.get();
        if (!textureFrame || !textureFrame.realWidth || !textureFrame.realHeight) {
            if (this.floorTileSprite) this.floorTileSprite.setVisible(false);
            return;
        }

        if (!this.floorTileSprite) {
            this.floorTileSprite = this.scene.add.tileSprite(0, 0, 1, 1, floorKey)
                .setOrigin(0).setAlpha(0.96).setDepth(-15);
        } else if (this.floorTileSprite.texture.key !== floorKey) {
            this.floorTileSprite.setTexture(floorKey);
        }

        const scaleX = this.cellSize / textureFrame.realWidth;
        const scaleY = this.cellSize / textureFrame.realHeight;
        this.floorTileSprite
            .setPosition(this.boardOffsetX, this.boardOffsetY)
            .setSize(this.boardWidth, this.boardHeight)
            .setVisible(true);
        this.floorTileSprite.tilePositionX = 0;
        this.floorTileSprite.tilePositionY = 0;
        this.floorTileSprite.tileScaleX    = scaleX;
        this.floorTileSprite.tileScaleY    = scaleY;
    }

    ensureBoardBorderSprites() {
        const borderKey = this.mapAsset.border?.key;
        if (!borderKey || !this.scene.textures.exists(borderKey)) {
            this.boardBorderSprites.forEach((sprite) => sprite.setVisible(false));
            return false;
        }

        while (this.boardBorderSprites.length < 4) {
            this.boardBorderSprites.push(
                this.scene.add.tileSprite(0, 0, 1, 1, borderKey)
                    .setOrigin(0)
                    .setAlpha(0.96)
                    .setDepth(5)
                    .setVisible(false)
            );
        }

        this.boardBorderSprites.forEach((sprite) => {
            if (sprite.texture.key !== borderKey) {
                sprite.setTexture(borderKey);
            }
        });

        return true;
    }

    updateBoardBorderSprites() {
        const borderKey = this.mapAsset?.border?.key;
        if (!this.ensureBoardBorderSprites()) return;

        if (!borderKey || !this.scene.textures.exists(borderKey)) {
            this.boardBorderSprites.forEach((s) => s.setVisible(false));
            return;
        }

        const tex = this.scene.textures.get(borderKey);
        if (!tex || typeof tex.get !== 'function') {
            this.boardBorderSprites.forEach((s) => s.setVisible(false));
            return;
        }

        const textureFrame = tex.get();
        if (!textureFrame || !textureFrame.realWidth || !textureFrame.realHeight) {
            this.boardBorderSprites.forEach((s) => s.setVisible(false));
            return;
        }

        const borderThickness = this.outerPadding;
        const frameWidth  = this.boardWidth  + borderThickness * 2;
        const x = this.boardOffsetX - borderThickness;
        const y = this.boardOffsetY - borderThickness;
        const scaleX = borderThickness / textureFrame.realWidth;
        const scaleY = borderThickness / textureFrame.realHeight;
        const [top, bottom, left, right] = this.boardBorderSprites;

        top.setPosition(x, y).setSize(frameWidth, borderThickness);
        bottom.setPosition(x, y + borderThickness + this.boardHeight).setSize(frameWidth, borderThickness);
        left.setPosition(x, y + borderThickness).setSize(borderThickness, this.boardHeight);
        right.setPosition(x + borderThickness + this.boardWidth, y + borderThickness).setSize(borderThickness, this.boardHeight);

        this.boardBorderSprites.forEach((sprite) => {
            sprite.tilePositionX = 0;
            sprite.tilePositionY = 0;
            sprite.tileScaleX = scaleX;
            sprite.tileScaleY = scaleY;
            sprite.setVisible(true);
        });
    }

    // ─────────────────────────────────────────────────────────────────
    //  RENDER PRINCIPAL
    // ─────────────────────────────────────────────────────────────────

    clearDynamicLayers() {
        this.territoryGraphics.clear();
        this.identityGraphics.clear();
        this.snakeGraphics.clear();
        this.foodGraphics.clear();
        this.obstacleGraphics.clear();
        this.hideFoodSprites();
        this.hideObstacleSprites();
        // Ocultar todos los sprites de serpientes antes de redibujar
        this.snakeSpritePools.forEach(pool => pool.forEach(s => s.setVisible(false)));
    }

    renderState(state) {
        if (state?.mapId) this.setMapId(state.mapId);
        this.emitEffectsForRemovedFood(state?.food);
        this.lastRenderedState = state;
        this.clearDynamicLayers();
        this.renderTerritory(state?.territory);
        this.renderPlayers(state?.players);
        this.renderFood(state?.food);
        this.renderObstacles(state?.obstacles);
        this.renderTutorialHighlightOverlay(state);
    }

    emitEffectsForRemovedFood(foodItems) {
        const currentFoodByKey = new Map();
        foodItems?.forEach?.((food) => {
            currentFoodByKey.set(this.getFoodEffectKey(food), food);
        });

        this.lastFoodByKey.forEach((food, key) => {
            if (currentFoodByKey.has(key)) return;
            if (this.handledFoodEffectKeys.has(key)) {
                this.handledFoodEffectKeys.delete(key);
                return;
            }
            this.playFoodConsumeEffect(food);
        });

        this.lastFoodByKey = currentFoodByKey;
    }

    playFoodConsumeEffect(food) {
        const effect = this.getSpecialFoodEffect(food);
        if (!effect) return;

        this.handledFoodEffectKeys.add(this.getFoodEffectKey(food));

        const { centerX, centerY } = this.getCellCenter(food.x, food.y);
        const particleLayer = this.scene.add.container(centerX, centerY).setDepth(30);
        const text = this.scene.add.text(centerX, centerY - this.cellSize * 0.24, food.hudEffect ?? effect.label, {
            fontFamily: 'Arial, sans-serif',
            fontSize: `${Math.max(14, Math.floor(this.cellSize * 0.58))}px`,
            fontStyle: '700',
            color: this.colorNumberToHex(effect.color),
            stroke: '#101522',
            strokeThickness: Math.max(2, Math.floor(this.cellSize * 0.08)),
        }).setOrigin(0.5).setDepth(31);

        for (let i = 0; i < FOOD_EFFECT_PARTICLE_COUNT; i++) {
            const radius = Math.max(2, this.cellSize * (0.055 + Math.random() * 0.045));
            const particle = this.scene.add.circle(0, 0, radius, effect.color, 0.92);
            const angle = Math.random() * Math.PI * 2;
            const distance = this.cellSize * (0.36 + Math.random() * 0.36);

            particleLayer.add(particle);
            this.scene.tweens.add({
                targets: particle,
                x: Math.cos(angle) * distance,
                y: Math.sin(angle) * distance,
                alpha: 0,
                scale: 0.25,
                duration: FOOD_EFFECT_DURATION_MS,
                ease: 'Cubic.easeOut',
            });
        }

        this.scene.tweens.add({
            targets: text,
            y: centerY - this.cellSize * 1.05,
            alpha: 0,
            duration: FOOD_EFFECT_DURATION_MS,
            ease: 'Cubic.easeOut',
            onComplete: () => text.destroy(),
        });

        this.scene.time.delayedCall(FOOD_EFFECT_DURATION_MS, () => {
            particleLayer.destroy(true);
        });
    }

    getSpecialFoodEffect(food) {
        if (!food || food.type === 'apple') return null;
        return SPECIAL_FOOD_EFFECTS[food.type] ?? null;
    }

    getFoodEffectKey(food) {
        return `${food?.x ?? ''}:${food?.y ?? ''}:${food?.type ?? ''}`;
    }

    renderTutorialHighlightOverlay(state) {
        const g = this.tutorialHighlightGraphics;
        g.clear();
        if (!this.tutorialHighlight || !state) return;

        const pulse = this.highlightPulse;
        const ringExpand = 2 + pulse * 4;
        const lineWidth = 2 + pulse * 2.5;
        const fillAlpha = 0.1 + pulse * 0.14;
        const strokeAlpha = 0.55 + pulse * 0.4;

        const drawCellRing = (x, y, color) => {
            const col = Math.floor(x / GRID_SIZE);
            const row = Math.floor(y / GRID_SIZE);
            const px = this.boardOffsetX + col * this.cellSize;
            const py = this.boardOffsetY + row * this.cellSize;
            const inset = -ringExpand;
            const size = this.cellSize + ringExpand * 2;
            g.fillStyle(color, fillAlpha);
            g.fillRoundedRect(px + inset, py + inset, size, size, Math.max(4, this.cellSize * 0.18));
            g.lineStyle(lineWidth, color, strokeAlpha);
            g.strokeRoundedRect(px + inset, py + inset, size, size, Math.max(4, this.cellSize * 0.18));
        };

        if (this.tutorialHighlight.type === 'fruit') {
            state.food?.forEach?.((food) => {
                if (food.type === this.tutorialHighlight.fruitType) {
                    drawCellRing(food.x, food.y, this.getHighlightColorForFood(food));
                }
            });
            return;
        }

        if (this.tutorialHighlight.type === 'obstacles') {
            state.obstacles?.forEach?.((obstacle) => {
                drawCellRing(obstacle.x, obstacle.y, TUTORIAL_OBSTACLE_HIGHLIGHT_COLOR);
            });
            return;
        }

        if (this.tutorialHighlight.type === 'fruits-and-obstacles') {
            state.food?.forEach?.((food) => {
                drawCellRing(food.x, food.y, TUTORIAL_FRUIT_HIGHLIGHT_COLORS[food.type] ?? TUTORIAL_MIXED_FRUIT_HIGHLIGHT_COLOR);
            });
            state.obstacles?.forEach?.((obstacle) => {
                drawCellRing(obstacle.x, obstacle.y, TUTORIAL_OBSTACLE_HIGHLIGHT_COLOR);
            });
        }
    }

    renderTerritory(territoryCells) {
        territoryCells?.forEach?.((cell) => {
            const alpha = 0.36;
            this.drawBoardCell(this.territoryGraphics, cell.x, cell.y, cell.ownerColor, alpha, 0.04);
        });
    }

    // ─────────────────────────────────────────────────────────────────
    //  RENDERIZADO DE SERPIENTES  (Fase 4 — sprites con fallback)
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

    /**
     * Renderiza una serpiente completa usando sprites si están disponibles,
     * o rectángulos de color como fallback si falta algún asset.
     */
    _renderPlayerSprites(player, playerIndex) {
        const segments  = player.segments;
        if (!segments || segments.length === 0) return;

        const snakeAsset = getSnakeAsset(player.skinId);
        const keys = snakeAsset.parts;
        const useSprites = this._playerHasSprites(keys);

        if (!useSprites) {
            // FALLBACK: comportamiento original con fillRect
            const snakeAlpha = this.tutorialHighlight ? this.getTutorialDimAlpha(false) : 1;
            segments.forEach((seg) => {
                this.drawBoardCell(this.snakeGraphics, seg.x, seg.y, player.color, snakeAlpha);
            });
            return;
        }

        // MODO SPRITE
        segments.forEach((seg, i) => {
            const isHead = i === 0;
            const isTail = i === segments.length - 1;
            const spriteKey = this._selectSpriteKey(keys, segments, i, isHead, isTail);
            const angle     = this._computeAngle(segments, i, isHead, isTail, player.direction, snakeAsset);

            const sprite = this._getSnakeSprite(playerIndex, i, spriteKey);
            this._drawIdentityMarker(seg, player.color, isHead);
            this._placeSprite(sprite, seg, angle);
            if (this.tutorialHighlight) {
                sprite.setAlpha(this.getTutorialDimAlpha(false));
            } else {
                sprite.setAlpha(1);
            }
        });
    }

    /** Devuelve true si todos los sprites básicos (head + body) están cargados */
    _playerHasSprites(keys) {
        return (
            this.scene.textures.exists(keys.head.key) &&
            this.scene.textures.exists(keys.body.key)
        );
    }

    /**
     * Decide qué sprite usar para el segmento i:
     *   - índice 0       → cabeza
     *   - último índice  → cola (si existe el asset, si no body)
     *   - intermedio con giro → turn (si existe, si no body)
     *   - intermedio recto   → body
     */
    _selectSpriteKey(keys, segments, i, isHead, isTail) {
        if (isHead) return keys.head.key;

        if (isTail) {
            return this.scene.textures.exists(keys.tail.key) ? keys.tail.key : keys.body.key;
        }

        // Detectar giro: el segmento anterior y el siguiente no están en la misma línea
        if (this.scene.textures.exists(keys.turn.key)) {
            const prev = segments[i - 1];
            const curr = segments[i];
            const next = segments[i + 1];
            if (prev && curr && next) {
                const currToPrev = this._directionBetween(curr, prev);
                const currToNext = this._directionBetween(curr, next);
                // Es un giro si cambia de eje (horizontal ↔ vertical)
                const isTurn = this._isTurnByDirections(currToPrev, currToNext);
                if (isTurn) return keys.turn.key;
            }
        }

        return keys.body.key;
    }

    /**
     * Calcula el ángulo de rotación del sprite en radianes.
     * Para la cabeza usa player.direction.
     * Para los demás segmentos calcula la dirección entre prev → current.
     */
    _computeAngle(segments, i, isHead, isTail, playerDirection, snakeAsset) {
        if (isHead) {
            return DIR_ANGLE[playerDirection] ?? 0;
        }

        const prev    = segments[i - 1];
        const current = segments[i];
        if (!prev || !current) return 0;

        const currentToPrev = this._directionBetween(current, prev);

        if (isTail) {
            const baseConnection = snakeAsset?.tailConnectionDirection ?? 'right';
            return (DIR_ANGLE[currentToPrev] ?? 0) - (DIR_ANGLE[baseConnection] ?? 0);
        }

        const next = segments[i + 1];
        if (!next) {
            const dir = currentToPrev;
            return DIR_ANGLE[dir] ?? 0;
        }

        const currToNext = this._directionBetween(current, next);

        if (this._isTurnByDirections(currentToPrev, currToNext)) {
            return this._turnAngleFromConnections(currentToPrev, currToNext);
        }

        return DIR_ANGLE[currentToPrev] ?? 0;
    }

    _normalizeDelta(delta, span) {
        if (delta > this.gridSize) return delta - span;
        if (delta < -this.gridSize) return delta + span;
        return delta;
    }

    _directionBetween(fromSeg, toSeg) {
        const boardWidthPx = this.gridCols * this.gridSize;
        const boardHeightPx = this.gridRows * this.gridSize;
        const dx = this._normalizeDelta(toSeg.x - fromSeg.x, boardWidthPx);
        const dy = this._normalizeDelta(toSeg.y - fromSeg.y, boardHeightPx);

        if (Math.abs(dx) >= Math.abs(dy)) {
            return dx >= 0 ? 'right' : 'left';
        }
        return dy >= 0 ? 'down' : 'up';
    }

    _isTurnByDirections(dirA, dirB) {
        const horizontalA = dirA === 'left' || dirA === 'right';
        const horizontalB = dirB === 'left' || dirB === 'right';
        return horizontalA !== horizontalB;
    }

    _turnAngleFromConnections(currToPrev, currToNext) {
        const connections = new Set([
            currToPrev,
            currToNext,
        ]);

        // Base real del asset turn.png: conecta hacia derecha y abajo.
        if (connections.has('right') && connections.has('down')) return 0;
        if (connections.has('down') && connections.has('left')) return Math.PI / 2;
        if (connections.has('left') && connections.has('up')) return Math.PI;
        if (connections.has('up') && connections.has('right')) return -Math.PI / 2;

        return 0;
    }

    _oppositeDirection(direction) {
        switch (direction) {
            case 'up': return 'down';
            case 'down': return 'up';
            case 'left': return 'right';
            case 'right': return 'left';
            default: return direction;
        }
    }

    /**
     * Obtiene (o crea) el sprite del pool para este jugador y posición en la serpiente.
     * Usa object pooling para no crear/destruir objetos en cada tick.
     */
    _getSnakeSprite(playerIndex, segmentIndex, textureKey) {
        if (!this.snakeSpritePools[playerIndex]) {
            this.snakeSpritePools[playerIndex] = [];
        }
        const pool = this.snakeSpritePools[playerIndex];

        if (pool[segmentIndex]) {
            const sprite = pool[segmentIndex];
            // Si la textura cambió (p.ej. body → turn), actualizarla
            if (sprite.texture.key !== textureKey) {
                sprite.setTexture(textureKey);
            }
            return sprite;
        }

        // Crear nuevo sprite y añadirlo al pool
        const sprite = this.scene.add.image(0, 0, textureKey)
            .setOrigin(0.5)
            .setDepth(10)
            .setVisible(false);

        pool[segmentIndex] = sprite;
        return sprite;
    }

    /**
     * Posiciona y rota un sprite en una celda del tablero.
     */
    _placeSprite(sprite, segment, angle) {
        const col     = Math.floor(segment.x / GRID_SIZE);
        const row     = Math.floor(segment.y / GRID_SIZE);
        const centerX = this.boardOffsetX + col * this.cellSize + this.cellSize * 0.5;
        const centerY = this.boardOffsetY + row * this.cellSize + this.cellSize * 0.5;

        sprite
            .setPosition(centerX, centerY)
            .setDisplaySize(this.cellSize, this.cellSize)
            .setRotation(angle)
            .setVisible(true);
    }

    _drawIdentityMarker(segment, color, isHead) {
        const col = Math.floor(segment.x / GRID_SIZE);
        const row = Math.floor(segment.y / GRID_SIZE);
        const px = this.boardOffsetX + col * this.cellSize;
        const py = this.boardOffsetY + row * this.cellSize;
        const style = getSnakeIdentityStyle(this.cellSize, isHead);
        const size = Math.max(1, this.cellSize - style.padding * 2);

        this.identityGraphics.fillStyle(color, style.alpha);
        this.identityGraphics.fillRoundedRect(
            px + style.padding,
            py + style.padding,
            size,
            size,
            style.radius,
        );
    }

    // ─────────────────────────────────────────────────────────────────
    //  COMIDA Y OBSTÁCULOS  (sin cambios respecto al original)
    // ─────────────────────────────────────────────────────────────────

    renderFood(foodItems) {
        if (!this.scene.textures.exists(ASSET_KEYS.FOOD_FRUITS_SHEET)) {
            foodItems?.forEach?.((food) => {
                this.drawBoardCell(this.foodGraphics, food.x, food.y, FOOD_COLOR);
            });
            return;
        }

        foodItems?.forEach?.((food, index) => {
            const sprite   = this.getFoodSprite(index);
            const frame    = this._getFoodFrame(food);
            const col      = Math.floor(food.x / GRID_SIZE);
            const row      = Math.floor(food.y / GRID_SIZE);
            const px       = this.boardOffsetX + col * this.cellSize;
            const py       = this.boardOffsetY + row * this.cellSize;
            const padding  = Math.max(0, Math.floor(this.cellSize * FOOD_PADDING_RATIO));

            const highlighted = this.isFoodHighlighted(food);
            const size = Math.max(1, this.cellSize - padding * 2);
            const scaleBoost = highlighted && this.tutorialHighlight ? 1 + this.highlightPulse * 0.1 : 1;

            sprite
                .setFrame(frame)
                .setPosition(px + padding, py + padding)
                .setDisplaySize(size * scaleBoost, size * scaleBoost)
                .setAlpha(this.getTutorialDimAlpha(highlighted))
                .setVisible(true);
        });
    }

    getFoodSprite(index) {
        if (this.foodSprites[index]) return this.foodSprites[index];
        const sprite = this.scene.add.image(0, 0, ASSET_KEYS.FOOD_FRUITS_SHEET, FOOD_FRAME_CYCLE[0])
            .setOrigin(0)
            .setDepth(11)
            .setVisible(false);
        this.foodSprites[index] = sprite;
        return sprite;
    }

    /*
    _getFoodFrame(food) {
        const col = Math.floor(food.x / GRID_SIZE);
        const row = Math.floor(food.y / GRID_SIZE);
        const hash = (col * 31 + row * 17) >>> 0;
        return FOOD_FRAME_CYCLE[hash % FOOD_FRAME_CYCLE.length];
    }
    */
    _getFoodFrame(food) {
        if (!(food.type in FOOD_TYPE_TO_FRAME)) {
            console.warn("Tipo de fruta desconocido:", food.type);
        }

        return FOOD_TYPE_TO_FRAME[food.type] ?? FOOD_FRAME_CYCLE[0];
    }

    hideFoodSprites() {
        this.foodSprites.forEach(s => s.setVisible(false));
    }

    renderObstacles(obstacles) {
        const obstacleKey = this.mapAsset.obstacle?.key ?? ASSET_KEYS.MAP_OBSTACLE_ROCK;
        if (!this.scene.textures.exists(obstacleKey)) {
            obstacles?.forEach?.((obstacle) => {
                this.drawBoardCell(this.obstacleGraphics, obstacle.x, obstacle.y, OBSTACLE_COLOR);
            });
            return;
        }

        obstacles?.forEach?.((obstacle, index) => {
            const sprite   = this.getObstacleSprite(index);
            const col      = Math.floor(obstacle.x / GRID_SIZE);
            const row      = Math.floor(obstacle.y / GRID_SIZE);
            const px       = this.boardOffsetX + col * this.cellSize;
            const py       = this.boardOffsetY + row * this.cellSize;
            const padding  = Math.max(1, Math.floor(this.cellSize * 0.04));

            if (sprite.texture.key !== obstacleKey) {
                sprite.setTexture(obstacleKey);
            }

            const highlighted = this.isObstacleHighlighted();
            const size = Math.max(1, this.cellSize - padding * 2);
            const scaleBoost = highlighted && this.tutorialHighlight ? 1 + this.highlightPulse * 0.08 : 1;

            sprite
                .setPosition(px + padding, py + padding)
                .setDisplaySize(size * scaleBoost, size * scaleBoost)
                .setAlpha(this.getTutorialDimAlpha(highlighted))
                .setVisible(true);
        });
    }

    getObstacleSprite(index) {
        if (this.obstacleSprites[index]) return this.obstacleSprites[index];
        const sprite = this.scene.add.image(0, 0, this.mapAsset.obstacle?.key ?? ASSET_KEYS.MAP_OBSTACLE_ROCK)
            .setOrigin(0).setDepth(12).setVisible(false);
        this.obstacleSprites[index] = sprite;
        return sprite;
    }

    hideObstacleSprites() {
        this.obstacleSprites.forEach(s => s.setVisible(false));
    }

    // ─────────────────────────────────────────────────────────────────
    //  TABLERO  (sin cambios respecto al original)
    // ─────────────────────────────────────────────────────────────────

    drawBoardFrame() {
        this.boardBackgroundGraphics.clear();
        this.boardBackgroundGraphics.fillStyle(this.mapAsset.theme.boardColor, 0.86);
        this.boardBackgroundGraphics.fillRoundedRect(
            this.boardOffsetX - this.outerPadding,
            this.boardOffsetY - this.outerPadding,
            this.boardWidth  + this.outerPadding * 2,
            this.boardHeight + this.outerPadding * 2,
            18
        );
        if (!this.boardBorderSprites.some((sprite) => sprite.visible)) {
            this.boardBackgroundGraphics.lineStyle(3, this.mapAsset.theme.borderColor, 0.72);
            this.boardBackgroundGraphics.strokeRoundedRect(
                this.boardOffsetX - this.outerPadding,
                this.boardOffsetY - this.outerPadding,
                this.boardWidth  + this.outerPadding * 2,
                this.boardHeight + this.outerPadding * 2,
                18
            );
        }
    }

    drawGrid() {
        this.gridGraphics.clear();
        this.gridGraphics.lineStyle(1, this.mapAsset.theme.gridColor, 0.1);
        for (let col = 0; col <= this.gridCols; col++) {
            const x = this.boardOffsetX + col * this.cellSize;
            this.gridGraphics.beginPath();
            this.gridGraphics.moveTo(x, this.boardOffsetY);
            this.gridGraphics.lineTo(x, this.boardOffsetY + this.boardHeight);
            this.gridGraphics.strokePath();
        }
        for (let row = 0; row <= this.gridRows; row++) {
            const y = this.boardOffsetY + row * this.cellSize;
            this.gridGraphics.beginPath();
            this.gridGraphics.moveTo(this.boardOffsetX, y);
            this.gridGraphics.lineTo(this.boardOffsetX + this.boardWidth, y);
            this.gridGraphics.strokePath();
        }
    }

    drawBoardCell(layer, x, y, color, alpha = 1, paddingRatio = 0.08) {
        const col     = Math.floor(x / GRID_SIZE);
        const row     = Math.floor(y / GRID_SIZE);
        const px      = this.boardOffsetX + col * this.cellSize;
        const py      = this.boardOffsetY + row * this.cellSize;
        const padding = Math.max(1, Math.floor(this.cellSize * paddingRatio));
        layer.fillStyle(color, alpha);
        layer.fillRect(px + padding, py + padding,
            Math.max(1, this.cellSize - padding * 2),
            Math.max(1, this.cellSize - padding * 2)
        );
    }

    getCellCenter(x, y) {
        const col = Math.floor(x / GRID_SIZE);
        const row = Math.floor(y / GRID_SIZE);
        return {
            centerX: this.boardOffsetX + col * this.cellSize + this.cellSize * 0.5,
            centerY: this.boardOffsetY + row * this.cellSize + this.cellSize * 0.5,
        };
    }

    colorNumberToHex(color) {
        return `#${Number(color).toString(16).padStart(6, '0').slice(-6)}`;
    }
}
