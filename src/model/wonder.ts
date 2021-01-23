import {
  WonderName,
  GameText,
  GameInput,
  TextPartEntity,
  IGameTextEntity,
  ResourceType,
  WonderCost,
} from "./types";
import { GameState, GameStatePlayable } from "./gameState";
import {
  toGameText,
  cardListToGameText,
  resourceMapToGameText,
  workerPlacementToGameText,
} from "./gameText";

// Pearlbrook Wonders
export class Wonder implements GameStatePlayable, IGameTextEntity {
  readonly name: WonderName;
  readonly description: GameText;
  readonly baseVP: number;
  readonly baseCost: WonderCost;
  readonly cardCost: number;

  constructor({
    name,
    description,
    baseVP,
    baseCost,
    cardCost,
  }: {
    name: WonderName;
    description: GameText;
    baseVP: number;
    baseCost: WonderCost;
    cardCost: number;
  }) {
    this.name = name;
    this.description = description;
    this.baseVP = baseVP;
    this.baseCost = baseCost;
    this.cardCost = cardCost;
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

  WONDER_REGISTRY: Record<WonderName, Wonder> = {
    [WonderName.SUNBLAZE_BRIDGE]: new Wonder({
      name: WonderName.SUNBLAZE_BRIDGE,
      description: toGameText([
        "Pay 2 TWIG, 2 RESIN, 2 PEBBLE, 3 PEARL, and discard 3 CARD.",
      ]),
      baseVP: 10,
      baseCost: {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 3,
      },
      cardCost: 3,
    }),
    [WonderName.STARFALLS_FLAME]: new Wonder({
      name: WonderName.STARFALLS_FLAME,
      description: toGameText([
        "Pay 3 TWIG, 3 RESIN, 3 PEBBLE, 3 PEARL, and discard 3 CARD.",
      ]),
      baseVP: 15,
      baseCost: {
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 3,
        [ResourceType.PEBBLE]: 3,
        [ResourceType.PEARL]: 3,
      },
      cardCost: 3,
    }),
    [WonderName.HOPEWATCH_GATE]: new Wonder({
      name: WonderName.HOPEWATCH_GATE,
      description: toGameText([
        "Pay 1 TWIG, 1 RESIN, 1 PEBBLE, 2 PEARL, and discard 2 CARD.",
      ]),
      baseVP: 20,
      baseCost: {
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 1,
        [ResourceType.PEARL]: 2,
      },
      cardCost: 2,
    }),
    [WonderName.MISTRISE_FOUNTAIN]: new Wonder({
      name: WonderName.MISTRISE_FOUNTAIN,
      description: toGameText([
        "Pay 2 TWIG, 2 RESIN, 2 PEBBLE, 2 PEARL, and discard 2 CARD.",
      ]),
      baseVP: 25,
      baseCost: {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 2,
      },
      cardCost: 2,
    }),
  };
}
