import {
  AdornmentName,
  GameText,
  GameInput,
  TextPartEntity,
  IGameTextEntity,
} from "./types";
import {
  GameState,
  GameStateCountPointsFn,
  GameStatePlayFn,
  GameStatePlayable,
} from "./gameState";
import {
  toGameText,
  cardListToGameText,
  resourceMapToGameText,
  workerPlacementToGameText,
} from "./gameText";

// Pearlbrook Adornment
export class Adornment implements GameStatePlayable, IGameTextEntity {
  readonly name: AdornmentName;
  readonly description: GameText;
  readonly baseVP?: number;
  readonly playInner: GameStatePlayFn;
  readonly pointsInner: GameStateCountPointsFn | undefined;

  constructor({
    name,
    description,
    baseVP = 0,
    pointsInner,
    playInner,
  }: {
    name: AdornmentName;
    description: GameText;
    baseVP?: number;
    pointsInner?: GameStateCountPointsFn;
    playInner: GameStatePlayFn;
  }) {
    this.name = name;
    this.description = description;
    this.baseVP = baseVP;
    this.pointsInner = pointsInner;
    this.playInner = playInner;
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

  ADORNMENT_REGISTRY: Record<AdornmentName, Adornment> = {
    [AdornmentName.BELL]: new Adornment({
      name: AdornmentName.BELL,
      description: toGameText([
        "Gain 3 BERRY. Also draw 1 CARD for every Critter in your city.",
        { type: "HR" },
        "1 VP for every 2 Critters in your city.",
      ]),
      pointsInner: (gameState: GameState, playerId: string) => {
        throw new Error("not implemented");
      },
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
    [AdornmentName.COMPASS]: new Adornment({
      name: AdornmentName.COMPASS,
      description: toGameText([
        "You may reactivate 2 TRAVELLER in your city.",
        { type: "HR" },
        "1 VP for each TRAVELER in your city.",
      ]),
      pointsInner: (gameState: GameState, playerId: string) => {
        throw new Error("not implemented");
      },
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
    [AdornmentName.GILDED_BOOK]: new Adornment({
      name: AdornmentName.GILDED_BOOK,
      description: toGameText([
        "Gain resources equal to the cost of any GOVERNANCE in your city.",
        { type: "HR" },
        "1 VP for each GOVERNANCE in your city.",
      ]),
      pointsInner: (gameState: GameState, playerId: string) => {
        throw new Error("not implemented");
      },
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
    [AdornmentName.HOURGLASS]: new Adornment({
      name: AdornmentName.HOURGLASS,
      description: toGameText([
        "You may take the action of any 1 Forest location, and gain 1 ANY.",
        { type: "HR" },
        "1 VP for each DESTINATION in your city.",
      ]),
      pointsInner: (gameState: GameState, playerId: string) => {
        throw new Error("not implemented");
      },
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
    [AdornmentName.KEY_TO_THE_CITY]: new Adornment({
      name: AdornmentName.KEY_TO_THE_CITY,
      description: toGameText([
        "Gain 2 ANY. Also draw 1 CARD for every Construction in your city.",
        { type: "HR" },
        "1 VP for every 2 Constructions in your city.",
      ]),
      pointsInner: (gameState: GameState, playerId: string) => {
        throw new Error("not implemented");
      },
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
    [AdornmentName.MASQUE]: new Adornment({
      name: AdornmentName.MASQUE,
      description: toGameText([
        "You may place 1 CARD worth up to 3 VP for free.",
        { type: "HR" },
        "Worth 1 for every 3 VP tokens you have.",
      ]),
      pointsInner: (gameState: GameState, playerId: string) => {
        throw new Error("not implemented");
      },
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
    [AdornmentName.MIRROR]: new Adornment({
      name: AdornmentName.MIRROR,
      description: toGameText([
        "You may copy any ability from an Adornment played by an opponent.",
        { type: "HR" },
        "1 VP for each unique colored CARD in your city.",
      ]),
      pointsInner: (gameState: GameState, playerId: string) => {
        throw new Error("not implemented");
      },
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
    [AdornmentName.SCALES]: new Adornment({
      name: AdornmentName.SCALES,
      description: toGameText([
        "You may discard up to 4 CARD to gain 1 ANY for each",
        { type: "HR" },
        "1 VP for every CARD in your hand, up to 5.",
      ]),
      pointsInner: (gameState: GameState, playerId: string) => {
        throw new Error("not implemented");
      },
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
    [AdornmentName.SEAGLASS_AMULET]: new Adornment({
      name: AdornmentName.SEAGLASS_AMULET,
      description: toGameText([
        "Gain 3 ANY. Draw 2 CARD. Gain 1 VP.",
        { type: "HR" },
        "3 VP",
      ]),
      baseVP: 3,
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
    [AdornmentName.SPYGLASS]: new Adornment({
      name: AdornmentName.SPYGLASS,
      description: toGameText([
        "Gain 1 ANY. Draw 1 CARD. Gain 1 PEARL.",
        { type: "HR" },
        "3 VP for each Wonder you built",
      ]),
      pointsInner: (gameState: GameState, playerId: string) => {
        throw new Error("not implemented");
      },
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
    [AdornmentName.SUNDIAL]: new Adornment({
      name: AdornmentName.SUNDIAL,
      description: toGameText([
        "You may activate Production for up to 3 PRODUCTION in your city.",
        { type: "HR" },
        "1 VP for every 2 PRODUCTION in your city.",
      ]),
      pointsInner: (gameState: GameState, playerId: string) => {
        throw new Error("not implemented");
      },
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
    [AdornmentName.TIARA]: new Adornment({
      name: AdornmentName.TIARA,
      description: toGameText([
        "Gain 1 ANY for each PROSPERITY in your city.",
        { type: "HR" },
        "1 VP for each PROSPERITY in your city.",
      ]),
      pointsInner: (gameState: GameState, playerId: string) => {
        throw new Error("not implemented");
      },
      playInner: (gameState: GameState, gameInput: GameInput) => {
        throw new Error("not implemented");
      },
    }),
  };
}
