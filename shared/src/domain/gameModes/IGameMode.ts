/**
 * shared/src/domain/gameModes/IGameMode.ts
 *
 * Defines the shared interface for a generic game mode.
 */
export interface IGameMode {
    id: string;
    name: string;
    description: string;
    minPlayers: number;
    maxPlayers: number;
    minTeams: number;
    maxTeams: number;
    // Potentially other common mode settings
}
