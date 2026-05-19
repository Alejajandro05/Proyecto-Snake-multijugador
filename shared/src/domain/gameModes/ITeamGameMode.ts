/**
 * shared/src/domain/gameModes/ITeamGameMode.ts
 *
 * Defines the shared interface for a team-based game mode, extending IGameMode.
 */
import { IGameMode } from "./IGameMode";

export interface ITeamGameMode extends IGameMode {
    minTeamSize: number;
    maxTeamSize: number;
    // Specific rules for team modes, e.g., friendly fire settings
}
