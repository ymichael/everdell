import {
  RiverDestinationType,
  RiverDestinationName,
  GameText,
  GameInput,
  TextPartEntity,
  IGameTextEntity,
} from "./types";
import { toGameText } from "./gameText";
import { GameState, GameStatePlayable } from "./gameState";

// Pearlbrook River Destination
export class RiverDesination implements GameStatePlayable, IGameTextEntity {
  readonly name: RiverDestinationName;
  readonly isExclusive: boolean;
  readonly type: RiverDestinationType;
  readonly description: GameText;

  constructor({
    name,
    type,
    isExclusive = true,
    description,
  }: {
    name: RiverDestinationName;
    isExclusive?: boolean;
    type: RiverDestinationType;
    description: GameText;
  }) {
    this.name = name;
    this.type = type;
    this.description = description;
    this.isExclusive = isExclusive;
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

  static fromName(name: RiverDestinationName): RiverDesination {
    if (!REGISTRY[name]) {
      throw new Error(`Invalid RiverDesination name: ${name}`);
    }
    return REGISTRY[name];
  }
}

const REGISTRY: Record<RiverDestinationName, RiverDesination> = {
  [RiverDestinationName.SHOAL]: new RiverDesination({
    name: RiverDestinationName.SHOAL,
    type: RiverDestinationType.SHOAL,
    isExclusive: false,
    description: toGameText("Pay 2 ANY and discard 2 CARD to gain 1 PEARL."),
  }),
  [RiverDestinationName.GUS_THE_GARDENER]: new RiverDesination({
    name: RiverDestinationName.GUS_THE_GARDENER,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 3 PRODUCTION from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.BOSLEY_THE_ARTIST]: new RiverDesination({
    name: RiverDestinationName.BOSLEY_THE_ARTIST,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 3 different colored CARD from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.CRUSTINA_THE_CONSTABLE]: new RiverDesination({
    name: RiverDestinationName.CRUSTINA_THE_CONSTABLE,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 2 GOVERNANCE from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.ILUMINOR_THE_INVENTOR]: new RiverDesination({
    name: RiverDestinationName.ILUMINOR_THE_INVENTOR,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 2 TRAVELER from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.SNOUT_THE_EXPLORER]: new RiverDesination({
    name: RiverDestinationName.SNOUT_THE_EXPLORER,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 2 DESTINATION from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.OMICRON_THE_ELDER]: new RiverDesination({
    name: RiverDestinationName.OMICRON_THE_ELDER,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 1 PROSPERITY from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.BALLROOM]: new RiverDesination({
    name: RiverDestinationName.BALLROOM,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 RESIN to draw 3 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.WATERMILL]: new RiverDesination({
    name: RiverDestinationName.WATERMILL,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 TWIG to draw 2 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.OBSERVATORY]: new RiverDesination({
    name: RiverDestinationName.OBSERVATORY,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 ANY to draw 2 CARD from the Meadow and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.MARKET]: new RiverDesination({
    name: RiverDestinationName.MARKET,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 ANY to draw 3 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.GREAT_HALL]: new RiverDesination({
    name: RiverDestinationName.GREAT_HALL,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 PEBBLE to draw 4 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.GARDENS]: new RiverDesination({
    name: RiverDestinationName.GARDENS,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 BERRY to draw 3 CARD and gain 1 PEARL."
    ),
  }),
};
