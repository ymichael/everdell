import {
  AdornmentName,
  GameText,
  GameInput,
  GameInputType,
  TextPartEntity,
  IGameTextEntity,
  ResourceType,
} from "./types";
import {
  GameState,
  GameStateCountPointsFn,
  GameStatePlayFn,
  GameStatePlayable,
} from "./gameState";
import { toGameText } from "./gameText";

// Pearlbrook Adornment
export class Adornment implements GameStatePlayable, IGameTextEntity {
  readonly name: AdornmentName;
  readonly description: GameText;
  readonly baseVP: number;
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
    return {
      type: "entity",
      entityType: "adornment",
      adornment: this.name,
    };
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    return !this.canPlayCheck(gameState, gameInput);
  }

  canPlayCheck(gameState: GameState, gameInput: GameInput): string | null {
    const player = gameState.getActivePlayer();

    if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
      const adornment = gameInput.clientOptions.adornment;

      if (!adornment) {
        return "Invalid adornment selected";
      }

      const adornmentsInHand = player.adornmentsInHand;
      let idx = adornmentsInHand.indexOf(adornment);
      if (idx === -1) {
        return "May only play adornments that are in your hand";
      }

      const playedAdornments = player.playedAdornments;
      idx = playedAdornments.indexOf(adornment);
      if (idx !== -1) {
        return "Cannot play an adornment that's already been played";
      }

      const numPearls = player.getNumResourcesByType(ResourceType.PEARL);
      if (numPearls < 1) {
        return "Must be able to pay 1 PEARL to play an adornment";
      }

      return null;
    }

    return "Not playable";
  }

  play(gameState: GameState, gameInput: GameInput): void {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.PLAY_ADORNMENT) {
      this.playInner(gameState, gameInput);

      // mark as claimed
      const idx = player.adornmentsInHand.indexOf(this.name);
      if (idx === -1) {
        throw new Error(`${this.name} isn't in player's hand`);
      } else {
        player.adornmentsInHand.splice(idx, 1);
      }

      player.playedAdornments.push(this.name);
    } else if (
      // TODO: add other input types
      gameInput.inputType === GameInputType.SELECT_CARDS ||
      gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS ||
      gameInput.inputType === GameInputType.SELECT_RESOURCES
    ) {
      if (gameInput.adornmentContext === this.name) {
        this.playInner(gameState, gameInput);
      } else {
        throw new Error("Unexpected adornmentContext");
      }
    } else {
      this.playInner(gameState, gameInput);
    }
  }

  getPoints(gameState: GameState, playerId: string): number {
    return (
      this.baseVP +
      (this.pointsInner ? this.pointsInner(gameState, playerId) : 0)
    );
  }

  static fromName(name: AdornmentName): Adornment {
    return ADORNMENT_REGISTRY[name];
  }
}

const ADORNMENT_REGISTRY: Record<AdornmentName, Adornment> = {
  [AdornmentName.BELL]: new Adornment({
    name: AdornmentName.BELL,
    description: toGameText([
      "Gain 3 BERRY. Also draw 1 CARD for every Critter in your city.",
      { type: "HR" },
      "1 VP for every 2 Critters in your city.",
    ]),
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      const numPlayedCritters = player.getNumPlayedCritters();
      return numPlayedCritters / 2;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      player.gainResources({ [ResourceType.BERRY]: 3 });
      const numPlayedCritters = player.getNumPlayedCritters();
      player.drawCards(gameState, numPlayedCritters);
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
