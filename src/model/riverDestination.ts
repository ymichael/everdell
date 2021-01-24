import shuffle from "lodash/shuffle";
import cloneDeep from "lodash/cloneDeep";
import mapValues from "lodash/mapValues";

import {
  CardType,
  RiverDestinationSpot,
  RiverDestinationMapSpots,
  RiverDestinationType,
  RiverDestinationName,
  GameText,
  GameInput,
  TextPartEntity,
  IGameTextEntity,
} from "./types";
import { RiverDestinationMapJSON } from "./jsonTypes";
import { toGameText } from "./gameText";
import { GameState, GameStatePlayable } from "./gameState";
import { assertUnreachable } from "../utils";

// Pearlbrook River Destination
export class RiverDestination implements GameStatePlayable, IGameTextEntity {
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

  static byType(type: RiverDestinationType): RiverDestinationName[] {
    return ((Object.entries(REGISTRY) as unknown) as [
      RiverDestinationName,
      RiverDestination
    ][])
      .filter(([_, r]) => {
        return r.type === type;
      })
      .map(([name, _]) => {
        return name;
      });
  }

  static fromName(name: RiverDestinationName): RiverDestination {
    if (!REGISTRY[name]) {
      throw new Error(`Invalid RiverDestination name: ${name}`);
    }
    return REGISTRY[name];
  }
}

export class RiverDestinationMap {
  readonly spots: RiverDestinationMapSpots;

  constructor({ spots }: { spots: RiverDestinationMapSpots }) {
    this.spots = spots;
  }

  canVisitSpotCheck(
    gameState: GameState,
    spot: RiverDestinationSpot
  ): string | null {
    const player = gameState.getActivePlayer();
    if (!gameState.gameOptions.pearlbrook) {
      return "Not playing with the Pearlbrook expansion";
    }
    if (!player.hasUnusedAmbassador()) {
      return "Ambassador already placed somewhere else.";
    }

    // Check if player fulfills the criteria of the spot!
    switch (spot) {
      case RiverDestinationSpot.THREE_PRODUCTION:
        if (player.getPlayedCardNamesByType(CardType.PRODUCTION).length < 3) {
          return "Must have 3 PRODUCTION cards in your city";
        }
        break;
      case RiverDestinationSpot.TWO_DESTINATION:
        if (player.getPlayedCardNamesByType(CardType.DESTINATION).length < 2) {
          return "Must have 2 DESTINATION cards in your city";
        }
        break;
      case RiverDestinationSpot.TWO_GOVERNANCE:
        if (player.getPlayedCardNamesByType(CardType.GOVERNANCE).length < 2) {
          return "Must have 2 GOVERNANCE cards in your city";
        }
        break;
      case RiverDestinationSpot.TWO_TRAVELER:
        if (player.getPlayedCardNamesByType(CardType.TRAVELER).length < 2) {
          return "Must have 2 TRAVELER cards in your city";
        }
        break;
      case RiverDestinationSpot.SHOAL:
        break;
      default:
        assertUnreachable(spot, spot);
    }

    return null;
  }

  static fromJSON(json: RiverDestinationMapJSON): RiverDestinationMap {
    return new RiverDestinationMap(json);
  }

  toJSON(includePrivate: boolean): RiverDestinationMapJSON {
    return cloneDeep({
      spots: mapValues(this.spots, (spot) => {
        if (includePrivate) {
          return spot;
        }
        if (spot.revealed) {
          return spot;
        }
        return {
          ...spot,
          name: null,
        };
      }),
    });
  }
}

export const initialRiverDestinationMap = (): RiverDestinationMap => {
  // Choose 2 random CITIZEN, 2 random LOCATION, shuffle, place them.
  const [a, b, ...restCitizen] = shuffle(
    RiverDestination.byType(RiverDestinationType.CITIZEN)
  );
  const [c, d, ...restLocation] = shuffle(
    RiverDestination.byType(RiverDestinationType.LOCATION)
  );
  const chosenRiverDestinations = shuffle([a, b, c, d]);
  return new RiverDestinationMap({
    spots: {
      SHOAL: {
        name: RiverDestinationName.SHOAL,
        ambassadors: [],
        revealed: true,
      },
      THREE_PRODUCTION: {
        name: chosenRiverDestinations[0],
        ambassadors: [],
        revealed: false,
      },
      TWO_DESTINATION: {
        name: chosenRiverDestinations[1],
        ambassadors: [],
        revealed: false,
      },
      TWO_GOVERNANCE: {
        name: chosenRiverDestinations[2],
        ambassadors: [],
        revealed: false,
      },
      TWO_TRAVELER: {
        name: chosenRiverDestinations[3],
        ambassadors: [],
        revealed: false,
      },
    },
  });
};

const REGISTRY: Record<RiverDestinationName, RiverDestination> = {
  [RiverDestinationName.SHOAL]: new RiverDestination({
    name: RiverDestinationName.SHOAL,
    type: RiverDestinationType.SHOAL,
    isExclusive: false,
    description: toGameText("Pay 2 ANY and discard 2 CARD to gain 1 PEARL."),
  }),
  [RiverDestinationName.GUS_THE_GARDENER]: new RiverDestination({
    name: RiverDestinationName.GUS_THE_GARDENER,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 3 PRODUCTION from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.BOSLEY_THE_ARTIST]: new RiverDestination({
    name: RiverDestinationName.BOSLEY_THE_ARTIST,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 3 different colored CARD from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.CRUSTINA_THE_CONSTABLE]: new RiverDestination({
    name: RiverDestinationName.CRUSTINA_THE_CONSTABLE,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 2 GOVERNANCE from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.ILUMINOR_THE_INVENTOR]: new RiverDestination({
    name: RiverDestinationName.ILUMINOR_THE_INVENTOR,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 2 TRAVELER from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.SNOUT_THE_EXPLORER]: new RiverDestination({
    name: RiverDestinationName.SNOUT_THE_EXPLORER,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 2 DESTINATION from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.OMICRON_THE_ELDER]: new RiverDestination({
    name: RiverDestinationName.OMICRON_THE_ELDER,
    type: RiverDestinationType.CITIZEN,
    description: toGameText(
      "Reveal and discard 1 PROSPERITY from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.BALLROOM]: new RiverDestination({
    name: RiverDestinationName.BALLROOM,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 RESIN to draw 3 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.WATERMILL]: new RiverDestination({
    name: RiverDestinationName.WATERMILL,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 TWIG to draw 2 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.OBSERVATORY]: new RiverDestination({
    name: RiverDestinationName.OBSERVATORY,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 ANY to draw 2 CARD from the Meadow and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.MARKET]: new RiverDestination({
    name: RiverDestinationName.MARKET,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 ANY to draw 3 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.GREAT_HALL]: new RiverDestination({
    name: RiverDestinationName.GREAT_HALL,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 PEBBLE to draw 4 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.GARDENS]: new RiverDestination({
    name: RiverDestinationName.GARDENS,
    type: RiverDestinationType.LOCATION,
    description: toGameText(
      "Pay 1 VP and 1 BERRY to draw 3 CARD and gain 1 PEARL."
    ),
  }),
};
