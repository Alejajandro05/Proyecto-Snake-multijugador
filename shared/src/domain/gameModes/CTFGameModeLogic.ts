/**
 * shared/src/domain/gameModes/CTFGameModeLogic.ts
 *
 * Implements the Capture The Flag game mode logic.
 */
import { GameModeLogic } from "./GameModeLogic";
import { ICaptureTheFlagMode } from "./CaptureTheFlagMode";
import { IGameState, PlayerState, FoodState, ObstacleState, Position, SnakeSegmentState } from "../types";
import { ITeamState } from "../TeamState";
import { GameConfig } from "../GameConfig";
import { SNAKE_INITIAL_LENGTH } from '../../../../backend/src/constants'; // Assuming this constant location for snake length

// Temporary simple CTF flag state for simulation
interface CTFFlagState {
    id: string;
    position: Position;
    carriedBy: string | null; // PlayerState.id carrying the flag
    teamId: string; // The team that owns this flag (its base)
    droppedTime: number | null; // Timestamp when dropped for return logic
}

export class CTFGameModeLogic extends GameModeLogic {
    private ctfConfig: ICaptureTheFlagMode;
    private flags: Map<string, CTFFlagState> = new Map(); // Map<flagId, CTFFlagState>

    constructor(gameModeConfig: ICaptureTheFlagMode) {
        super(gameModeConfig);
        this.ctfConfig = gameModeConfig;
    }

    initialize(state: IGameState, options: any): void {
        console.log("CTFGameModeLogic: Initializing game state for CTF.", this.ctfConfig);

        // Initialize players based on team assignments from options if any
        // (This part will be handled more robustly by SnakeRoom options)
        for (const player of state.players.values()) {
            player.segments = [];
            // Assign initial position based on team, for now just random
            const startX = Math.floor(Math.random() * GameConfig.GRID_SIZE);
            const startY = Math.floor(Math.random() * GameConfig.GRID_SIZE);
            player.segments.push({ x: startX, y: startY });
            for (let i = 1; i < SNAKE_INITIAL_LENGTH; i++) {
                player.segments.push({ x: startX - i, y: startY }); // Example: horizontal snake
            }
            player.alive = true;
            player.score = 0;
            player.lives = 1; // Or more, depending on mode
            player.speed = GameConfig.SNAKE_SPEED;
            player.moveCounter = 0;
            player.speedEffectRemaining = 0;
            player.direction = 'right'; // Default direction
            player.nextDirection = 'right';
        }

        this.spawnInitialItems(state);

        // Initialize team scores to 0
        for (const teamId in state.teams) {
            if (state.teams.hasOwnProperty(teamId)) {
                state.teams[teamId].score = 0;
            }
        }
    }

    update(deltaTime: number, state: IGameState): void {
        // CTF-specific update logic (e.g., flag return timer)
        const now = Date.now();
        for (const [flagId, flag] of this.flags.entries()) {
            if (flag.droppedTime && (now - flag.droppedTime > this.ctfConfig.flagReturnTimeMs)) {
                // Return flag to base
                const originalFlagBase = this.ctfConfig.flagSpawnPoints.find(p => p === flag.position); // Simplified for now
                // Find the team's capture point that corresponds to this flag's team
                const teamCapturePoint = this.ctfConfig.capturePoints.find(cp => cp.teamId === flag.teamId);
                if (teamCapturePoint) {
                    flag.position = { ...teamCapturePoint.position }; // Move flag to team's base
                }
                flag.carriedBy = null;
                flag.droppedTime = null;
                console.log(`Flag ${flagId} returned to base.`);
                // Potentially emit an event: FLAG_RETURNED
            }
        }

        this.spawnPeriodicItems(state);
    }

    handleSnakeCollision(snake1: PlayerState, snake2: PlayerState, state: IGameState): void {
        // CTF-specific collision rules:
        // - Friendly fire (if enabled, not yet implemented)
        // - Colliding with opponent carrying flag

        if (snake1.teamId === snake2.teamId) {
            // Friendly collision: maybe no harm or friendly fire enabled
            // For now, no effect for friendly collisions
            return;
        }

        // Standard snake collision logic (death for one or both)
        // For simplicity, if two snakes collide, both die for now, if not same team
        snake1.alive = false;
        snake2.alive = false;
        console.log(`Collision between ${snake1.id} and ${snake2.id}. Both died.`);

        // Check if snake2 was carrying a flag
        const flagCarriedBySnake2 = Array.from(this.flags.values()).find(flag => flag.carriedBy === snake2.id);
        if (flagCarriedBySnake2) {
            flagCarriedBySnake2.carriedBy = null;
            flagCarriedBySnake2.position = { ...snake2.segments[0] }; // Drop flag at snake2's head position
            flagCarriedBySnake2.droppedTime = Date.now();
            console.log(`Flag ${flagCarriedBySnake2.id} dropped by ${snake2.id} at ${flagCarriedBySnake2.position.x},${flagCarriedBySnake2.position.y}.`);
            // Potentially emit an event: FLAG_DROPPED
        }
    }

    handleFoodCollision(snake: PlayerState, food: FoodState, foodIndex: number, state: IGameState): void {
        // Standard food handling, or CTF-specific food effects
        // For CTF, food might be less important or give team buffs
        console.log(`Snake ${snake.id} ate food ${food.type}.`);
        // Remove food from state
        state.food.splice(foodIndex, 1);
        // Grow snake and update score (standard logic for now)
        const head = snake.segments[0];
        snake.segments.unshift({ ...head }); // Add new head segment
        snake.score += food.score;

        // Check for flag pickup
        const collidedFlag = Array.from(this.flags.values()).find(flag =>
            flag.position.x === head.x && flag.position.y === head.y && flag.carriedBy === null && flag.teamId !== snake.teamId
        );

        if (collidedFlag) {
            collidedFlag.carriedBy = snake.id;
            collidedFlag.position = { ...head }; // Flag moves with snake
            collidedFlag.droppedTime = null;
            console.log(`Snake ${snake.id} picked up flag ${collidedFlag.id}.`);
            // Potentially emit an event: FLAG_PICKED_UP
        }

        // Check for flag capture (if carrying opponent's flag and at own base)
        const carryingFlag = Array.from(this.flags.values()).find(flag => flag.carriedBy === snake.id);
        if (carryingFlag && carryingFlag.teamId !== snake.teamId) {
            const ownCapturePoint = this.ctfConfig.capturePoints.find(cp => cp.teamId === snake.teamId);
            if (ownCapturePoint && head.x === ownCapturePoint.position.x && head.y === ownCapturePoint.position.y) {
                // Flag captured!
                state.teams[snake.teamId].score += 1; // Increment team score
                console.log(`Team ${snake.teamId} captured flag ${carryingFlag.id}! Score: ${state.teams[snake.teamId].score}`);
                // Reset flag to its original base
                const originalFlagSpawn = this.ctfConfig.flagSpawnPoints.find(p => p === carryingFlag.position); // Simplified
                const capturedTeamCapturePoint = this.ctfConfig.capturePoints.find(cp => cp.teamId === carryingFlag.teamId);
                if (capturedTeamCapturePoint) {
                    carryingFlag.position = { ...capturedTeamCapturePoint.position };
                }
                carryingFlag.carriedBy = null;
                carryingFlag.droppedTime = null;
                // Potentially emit an event: FLAG_CAPTURED, TEAM_SCORE_UPDATED
            }
        }
    }

    handleObstacleCollision(snake: PlayerState, obstacle: ObstacleState, state: IGameState): void {
        console.log(`Snake ${snake.id} hit an obstacle at ${obstacle.x},${obstacle.y}.`);
        snake.alive = false; // Snake dies on obstacle collision

        // Check if snake was carrying a flag
        const flagCarriedBySnake = Array.from(this.flags.values()).find(flag => flag.carriedBy === snake.id);
        if (flagCarriedBySnake) {
            flagCarriedBySnake.carriedBy = null;
            flagCarriedBySnake.position = { ...snake.segments[0] }; // Drop flag at snake's head position
            flagCarriedBySnake.droppedTime = Date.now();
            console.log(`Flag ${flagCarriedBySnake.id} dropped by ${snake.id} at ${flagCarriedBySnake.position.x},${flagCarriedBySnake.position.y}.`);
            // Potentially emit an event: FLAG_DROPPED
        }
    }

    checkWinCondition(state: IGameState): ITeamState | PlayerState | null {
        for (const teamId in state.teams) {
            if (state.teams.hasOwnProperty(teamId)) {
                const team = state.teams[teamId];
                if (team.score >= this.ctfConfig.scoreToWin) {
                    return team; // This team wins
                }
            }
        }

        // Check if only one team is left with alive players (alternative win condition?)
        const aliveTeams = new Set<string>();
        for (const player of state.players.values()) {
            if (player.alive) {
                aliveTeams.add(player.teamId);
            }
        }

        if (aliveTeams.size <= 1 && Array.from(state.players.values()).filter(p => p.alive).length > 0) {
            // If only one team has alive players, that team wins (if there are any alive players)
            const winningTeamId = aliveTeams.values().next().value;
            return state.teams[winningTeamId];
        }

        return null; // No win condition met yet
    }

    spawnInitialItems(state: IGameState): void {
        // For CTF, spawn flags at their designated points
        this.flags.clear();
        this.ctfConfig.flagSpawnPoints.forEach((pos, index) => {
            // For CTF, each team should have a flag to defend and a base to capture to
            // For this initial setup, let's assume flagSpawnPoints are also the team bases.
            // We need to associate flags with teams for initial placement and capture logic.
            // Let's make a simplified assumption: flagSpawnPoints are also capture points for respective teams
            const teamIdForFlag = state.teams[Object.keys(state.teams)[index]] ? Object.keys(state.teams)[index] : 'unknown_team'; // Assign to a team based on index

            this.flags.set(`flag_${index}`, {
                id: `flag_${index}`,
                position: { ...pos }, // Initial position at spawn point
                carriedBy: null,
                teamId: teamIdForFlag,
                droppedTime: null,
            });
        });

        console.log("CTFGameModeLogic: Initial flags spawned:", Array.from(this.flags.values()));

        // Spawn some initial food (standard snake game element)
        // This could be customized for CTF, e.g., power-ups near bases
        state.food = []; // Clear existing food
        for (let i = 0; i < GameConfig.FOOD_INITIAL_AMOUNT; i++) {
            state.food.push(this.generateRandomFood());
        }
    }

    spawnPeriodicItems(state: IGameState): void {
        // For CTF, periodically add food or other power-ups.
        // Ensure the food count doesn't exceed a maximum.
        if (state.food.length < GameConfig.FOOD_MAX_AMOUNT) {
            state.food.push(this.generateRandomFood());
        }
    }

    private generateRandomFood(): FoodState {
        const foodTypes = Object.keys(GameConfig.FOOD_TYPES) as FoodType[];
        const randomType = foodTypes[Math.floor(Math.random() * foodTypes.length)];
        const foodConfig = GameConfig.FOOD_TYPES[randomType];

        let x, y;
        let collision = true;
        // Ensure food does not spawn on top of existing snakes, flags, or obstacles
        while (collision) {
            x = Math.floor(Math.random() * GameConfig.GRID_SIZE);
            y = Math.floor(Math.random() * GameConfig.GRID_SIZE);
            collision = false;

            // Check against snakes
            for (const player of Array.from(state.players.values())) {
                for (const segment of player.segments) {
                    if (segment.x === x && segment.y === y) {
                        collision = true;
                        break;
                    }
                }
                if (collision) break;
            }
            if (collision) continue;

            // Check against flags
            for (const flag of this.flags.values()) {
                if (flag.position.x === x && flag.position.y === y) {
                    collision = true;
                    break;
                }
            }
            if (collision) continue;

            // Check against obstacles (if any)
            for (const obstacle of state.obstacles) {
                if (obstacle.x === x && obstacle.y === y) {
                    collision = true;
                    break;
                }
            }
        }

        return {
            x: x!,
            y: y!,
            type: randomType,
            score: foodConfig.score,
        };
    }

    // Helper to get all flags in the game
    getAllFlags(): CTFFlagState[] {
        return Array.from(this.flags.values());
    }

    // Helper to get a specific flag by its ID
    getFlag(flagId: string): CTFFlagState | undefined {
        return this.flags.get(flagId);
    }
}
