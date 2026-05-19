/**
 * shared/src/domain/gameModes/GameModeLogic.ts
 *
 * Abstract base class for game mode-specific logic.
 */
import { IGameState, PlayerState, SnakeSegmentState, FoodState, ObstacleState, Position } from "../types";
import { ITeamState } from "../TeamState";
import { IGameMode } from "./IGameMode";

export abstract class GameModeLogic {
    protected gameModeConfig: IGameMode; // Stores configuration for the specific game mode

    constructor(gameModeConfig: IGameMode) {
        this.gameModeConfig = gameModeConfig;
    }

    // Initializes the game state for the specific mode
    abstract initialize(state: IGameState, options: any): void;

    // Updates the game state for the specific mode
    abstract update(deltaTime: number, state: IGameState): void;

    // Handles collision between two snakes (or snake and environment/objects)
    abstract handleSnakeCollision(snake1: PlayerState, snake2: PlayerState, state: IGameState): void;

    // Handles collision between a snake head and food
    abstract handleFoodCollision(snake: PlayerState, food: FoodState, foodIndex: number, state: IGameState): void;

    // Handles collision between a snake head and an obstacle
    abstract handleObstacleCollision(snake: PlayerState, obstacle: ObstacleState, state: IGameState): void;

    // Checks if the win condition for the mode is met
    abstract checkWinCondition(state: IGameState): ITeamState | PlayerState | null;

    // Spawns initial food/items based on the game mode
    abstract spawnInitialItems(state: IGameState): void;

    // Spawns periodic food/items during the game
    abstract spawnPeriodicItems(state: IGameState): void;
}
