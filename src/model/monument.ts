import { GameText, GameInput, TextPartEntity, IGameTextEntity } from "./types";
import { GameState, GameStatePlayable } from "./gameState";

// Pearlbrook Monuments
export class Monument implements GameStatePlayable, IGameTextEntity {
  readonly description: GameText;
  readonly baseVP: number;

  constructor({
    baseVP,
    description,
  }: {
    baseVP: number;
    description: GameText;
  }) {
    this.baseVP = baseVP;
    this.description = description;
  }

  getGameTextPart(): TextPartEntity {
    throw new Error("Not Implemented");
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    return !this.canPlayCheck(gameState, gameInput);
  }

  canPlayCheck(gameState: GameState, gameInput: GameInput): string | null {
    return "Not Implemented";
  }

  play(gameState: GameState, gameInput: GameInput): void {
    throw new Error("Not Implemented");
  }

  getPoints(gameState: GameState, playerId: string): number {
    return 0;
  }
}
