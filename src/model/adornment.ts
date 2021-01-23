import {
  AdornmentName,
  GameText,
  GameInput,
  TextPartEntity,
  IGameTextEntity,
} from "./types";
import { GameState, GameStatePlayable } from "./gameState";

// Pearlbrook Adornment
export class Adornment implements GameStatePlayable, IGameTextEntity {
  readonly name: AdornmentName;
  readonly description: GameText;

  constructor({
    name,
    description,
  }: {
    name: AdornmentName;
    description: GameText;
  }) {
    this.name = name;
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
