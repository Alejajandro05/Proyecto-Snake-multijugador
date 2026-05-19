/**
 * shared/src/domain/TeamState.ts
 *
 * Defines the shared interface for a game team.
 */
export interface ITeamState {
    teamId: string;
    name: string;
    color: string; // Hex color string, e.g., "#FF0000"
    score: number;
    playerIds: string[]; // Array of player session IDs
    // Add mode-specific state here if needed, e.g., flag status in CTF
}
