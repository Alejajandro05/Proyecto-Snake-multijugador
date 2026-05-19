/**
 * shared/src/domain/gameModes/CaptureTheFlagMode.ts
 *
 * Defines the specific interface for the Capture The Flag game mode.
 */
import { ITeamGameMode } from "./ITeamGameMode";
import { Position } from "../types";

export interface ICaptureTheFlagMode extends ITeamGameMode {
    flagSpawnPoints: Position[];
    capturePoints: { teamId: string; position: Position; }[];
    scoreToWin: number;
    flagReturnTimeMs: number; // Time until a dropped flag returns to base
}
