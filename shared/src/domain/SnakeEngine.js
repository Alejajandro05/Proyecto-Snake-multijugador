import { PLAYER_COLORS, resolveGameRuntimeConfig, } from './GameConfig.js';
const OPPOSITE = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
};
/**
 * Pure game engine – no Phaser, no Colyseus dependencies.
 * All game logic (movement, collision detection, food spawning, respawn) lives here.
 */
export class SnakeEngine {
    config;
    players = new Map();
    inputQueues = new Map();
    food = [];
    obstacles = [];
    respawnQueue = new Map(); // playerId → respawn tick
    tickCount = 0;
    respawnTicks;
    constructor(initialFoodOrConfig, configOverrides) {
        const configInput = typeof initialFoodOrConfig === 'number'
            ? { ...configOverrides, foodCount: initialFoodOrConfig }
            : initialFoodOrConfig;
        this.config = resolveGameRuntimeConfig(configInput);
        this.respawnTicks = Math.max(1, Math.round(this.config.respawnDelayMs / this.config.tickMs));
        this.generateObstacles();
        for (let i = 0; i < this.config.foodCount; i++) {
            this.food.push(this.randomFood());
        }
    }
    getConfig() {
        return { ...this.config };
    }
    addPlayer(id, options) {
        const colorIndex = this.players.size;
        const color = options?.color ?? PLAYER_COLORS[colorIndex % PLAYER_COLORS.length];
        const skinId = options?.skinId?.trim() || `skin-${colorIndex + 1}`;
        const startCol = options?.startCol ?? (colorIndex * 6 + 5) % this.config.gridCols;
        const startRow = options?.startRow ?? Math.floor(this.config.gridRows / 2);
        const segments = [];
        for (let i = 0; i < this.config.initialSnakeLength; i++) {
            segments.push({ x: (startCol - i) * this.config.gridSize, y: startRow * this.config.gridSize });
        }
        const player = {
            id,
            skinId,
            color,
            direction: 'right',
            nextDirection: 'right',
            alive: true,
            lives: this.config.maxLives,
            score: 0,
            segments,
        };
        this.players.set(id, player);
        this.inputQueues.set(id, []);
        return player;
    }
    removePlayer(id) {
        this.players.delete(id);
        this.inputQueues.delete(id);
        this.respawnQueue.delete(id);
    }
    setNextDirection(playerId, direction) {
        const player = this.players.get(playerId);
        if (!player || !player.alive)
            return;
        const queue = this.inputQueues.get(playerId) ?? [];
        const lastPlannedDirection = queue[queue.length - 1] ?? player.nextDirection ?? player.direction;
        if (direction === lastPlannedDirection || OPPOSITE[lastPlannedDirection] === direction) {
            return;
        }
        if (queue.length >= 3) {
            return;
        }
        queue.push(direction);
        this.inputQueues.set(playerId, queue);
        player.nextDirection = queue[0] ?? player.direction;
    }
    /** Advance the simulation by one step and return the resulting game state. */
    tick() {
        this.tickCount++;
        this.respawnQueue.forEach((respawnAt, id) => {
            if (this.tickCount >= respawnAt) {
                this.respawnQueue.delete(id);
                this.doRespawn(id);
            }
        });
        for (const player of this.players.values()) {
            if (player.alive) {
                this.movePlayer(player);
            }
        }
        return this.getState();
    }
    getState() {
        return {
            players: new Map(this.players),
            food: [...this.food],
            obstacles: [...this.obstacles],
        };
    }
    // ─── Private helpers ──────────────────────────────────────────────────────
    movePlayer(player) {
        player.direction = this.consumePlannedDirection(player);
        const head = player.segments[0];
        let newX = head.x;
        let newY = head.y;
        switch (player.direction) {
            case 'left':
                newX -= this.config.gridSize;
                break;
            case 'right':
                newX += this.config.gridSize;
                break;
            case 'up':
                newY -= this.config.gridSize;
                break;
            case 'down':
                newY += this.config.gridSize;
                break;
        }
        // Wrap around walls (toroidal board)
        if (newX < 0)
            newX = (this.config.gridCols - 1) * this.config.gridSize;
        else if (newX >= this.config.gridCols * this.config.gridSize)
            newX = 0;
        if (newY < 0)
            newY = (this.config.gridRows - 1) * this.config.gridSize;
        else if (newY >= this.config.gridRows * this.config.gridSize)
            newY = 0;
        // Self collision
        for (const seg of player.segments) {
            if (seg.x === newX && seg.y === newY) {
                this.killPlayer(player);
                return;
            }
        }
        // Collision with other players
        for (const other of this.players.values()) {
            if (other.id === player.id || !other.alive)
                continue;
            for (let i = 0; i < other.segments.length; i++) {
                const seg = other.segments[i];
                if (seg.x === newX && seg.y === newY) {
                    if (i === 0) {
                        // Head-to-head collision: larger snake survives
                        if (player.segments.length > other.segments.length) {
                            this.killPlayer(other);
                        }
                        else if (player.segments.length < other.segments.length) {
                            this.killPlayer(player);
                            return;
                        }
                        else {
                            // Same size, both die
                            this.killPlayer(player);
                            this.killPlayer(other);
                            return;
                        }
                    }
                    else {
                        // Hit body, die
                        this.killPlayer(player);
                        return;
                    }
                }
            }
        }
        const hitObstacle = this.obstacles.some(o => o.x === newX && o.y === newY);
        if (hitObstacle) {
            this.killPlayer(player);
            return;
        }
        if (!player.alive)
            return;
        // Food collision
        let ate = false;
        const foodIdx = this.food.findIndex(f => f.x === newX && f.y === newY);
        if (foodIdx !== -1) {
            this.food.splice(foodIdx, 1);
            this.food.push(this.randomFood());
            player.score += 1;
            ate = true;
        }
        // Move snake: prepend new head, remove tail if not eating
        player.segments.unshift({ x: newX, y: newY });
        if (!ate) {
            player.segments.pop();
        }
    }
    killPlayer(player) {
        player.alive = false;
        player.lives -= 1;
        this.inputQueues.set(player.id, []);
        player.nextDirection = player.direction;
        if (player.lives > 0) {
            this.respawnQueue.set(player.id, this.tickCount + this.respawnTicks);
        }
    }
    doRespawn(id) {
        const player = this.players.get(id);
        if (!player)
            return;
        const margin = this.config.initialSnakeLength + 1;
        let col;
        let row;
        let attempts = 0;
        do {
            col = Math.floor(Math.random() * (this.config.gridCols - margin * 2) + margin);
            row = Math.floor(Math.random() * (this.config.gridRows - margin * 2) + margin);
            attempts++;
        } while (!this.isSafeSpawn(col, row) && attempts < 50);
        player.segments = [];
        for (let i = 0; i < this.config.initialSnakeLength; i++) {
            player.segments.push({ x: (col - i) * this.config.gridSize, y: row * this.config.gridSize });
        }
        player.direction = 'right';
        player.nextDirection = 'right';
        this.inputQueues.set(id, []);
        player.alive = true;
    }
    consumePlannedDirection(player) {
        const queue = this.inputQueues.get(player.id);
        if (!queue || queue.length === 0) {
            player.nextDirection = player.direction;
            return player.direction;
        }
        const nextDirection = queue.shift();
        player.nextDirection = queue[0] ?? nextDirection;
        return nextDirection;
    }
    getSnakesPosition() {
        let playerSegments = [];
        this.players.forEach(p => p.segments.forEach(s => playerSegments.push(s)));
        return playerSegments;
    }
    randomFood() {
        let playerSegments = this.getSnakesPosition();
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * this.config.gridCols) * this.config.gridSize,
                y: Math.floor(Math.random() * this.config.gridRows) * this.config.gridSize,
            };
        } while (playerSegments.some(s => s.x === pos.x && s.y === pos.y) ||
            this.obstacles.some(o => o.x === pos.x && o.y === pos.y));
        return pos;
    }
    randomObstacleInQuadrant(quadrant) {
        const midCol = Math.floor(this.config.gridCols / 2);
        const midRow = Math.floor(this.config.gridRows / 2);
        // por defecto TL
        let colMin = 0, colMax = midCol - 1;
        let rowMin = 0, rowMax = midRow - 1;
        switch (quadrant) {
            case 'TR':
                colMin = midCol;
                colMax = this.config.gridCols - 1;
                break;
            case 'BL':
                rowMin = midRow;
                rowMax = this.config.gridRows - 1;
                break;
            case 'BR':
                colMin = midCol;
                colMax = this.config.gridCols - 1;
                rowMin = midRow;
                rowMax = this.config.gridRows - 1;
                break;
        }
        let playerSegments = this.getSnakesPosition();
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * (colMax - colMin + 1) + colMin) * this.config.gridSize,
                y: Math.floor(Math.random() * (rowMax - rowMin + 1) + rowMin) * this.config.gridSize
            };
        } while (playerSegments.some(s => s.x === pos.x && s.y === pos.y));
        return pos;
    }
    generateObstacles() {
        const quadrants = ['TL', 'TR', 'BL', 'BR'];
        quadrants.forEach(q => {
            for (let i = 0; i < this.config.obstaclesPerQuadrant; i++) {
                const obs = this.randomObstacleInQuadrant(q);
                this.obstacles.push(obs);
            }
        });
    }
    isSafeSpawn(col, row) {
        return this.obstacles.every(ob => {
            const obCol = ob.x / this.config.gridSize;
            const obRow = ob.y / this.config.gridSize;
            return Math.abs(obCol - col) > this.config.safeMargin || Math.abs(obRow - row) > this.config.safeMargin;
        });
    }
}
