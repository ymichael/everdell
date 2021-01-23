import {
  RiverDestinationType,
  RiverDestinationName,
  GameText,
  GameInput,
  TextPartEntity,
  IGameTextEntity,
} from "./types";
import { GameState, GameStatePlayable } from "./gameState";

// Pearlbrook River Destination
export class RiverDesination implements GameStatePlayable, IGameTextEntity {
  readonly name: RiverDestinationName;
  readonly type: RiverDestinationType;
  readonly description: GameText;

  constructor({
    name,
    type,
    description,
  }: {
    name: RiverDestinationName;
    type: RiverDestinationType;
    description: GameText;
  }) {
    this.name = name;
    this.type = type;
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
