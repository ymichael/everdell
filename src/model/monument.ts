import {
  MonumentName,
  GameText,
  GameInput,
  TextPartEntity,
  IGameTextEntity,
} from "./types";
import { GameState, GameStatePlayable } from "./gameState";

// Pearlbrook Monuments
export class Monument implements GameStatePlayable, IGameTextEntity {
  readonly name: MonumentName;
  readonly description: GameText;
  readonly baseVP: number;

  constructor({
    name,
    baseVP,
    description,
  }: {
    name: MonumentName;
    baseVP: number;
    description: GameText;
  }) {
    this.name = name;
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
