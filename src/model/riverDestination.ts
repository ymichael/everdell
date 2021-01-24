import shuffle from "lodash/shuffle";
import cloneDeep from "lodash/cloneDeep";
import mapValues from "lodash/mapValues";

import {
  CardType,
  RiverDestinationSpot,
  RiverDestinationMapSpots,
  RiverDestinationType,
  RiverDestinationName,
  ResourceType,
  GameText,
  GameInput,
  GameInputType,
  TextPartEntity,
  IGameTextEntity,
} from "./types";
import { RiverDestinationMapJSON } from "./jsonTypes";
import { toGameText, cardListToGameText } from "./gameText";
import { Card } from "./card";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayCheckFn,
} from "./gameState";
import { assertUnreachable } from "../utils";

// Pearlbrook River Destination
export class RiverDestination implements GameStatePlayable, IGameTextEntity {
  readonly name: RiverDestinationName;
  readonly isExclusive: boolean;
  readonly type: RiverDestinationType;
  readonly description: GameText;
  readonly shortName: GameText;
  readonly playInner: GameStatePlayFn | undefined;
  readonly canPlayCheckInner: GameStateCanPlayCheckFn | undefined;

  constructor({
    name,
    shortName,
    type,
    isExclusive = true,
    description,
    playInner,
    canPlayCheckInner,
  }: {
    name: RiverDestinationName;
    shortName: GameText;
    isExclusive?: boolean;
    type: RiverDestinationType;
    description: GameText;
    playInner?: GameStatePlayFn;
    canPlayCheckInner?: GameStateCanPlayCheckFn;
  }) {
    this.name = name;
    this.shortName = shortName;
    this.type = type;
    this.description = description;
    this.isExclusive = isExclusive;
    this.playInner = playInner;
    this.canPlayCheckInner = canPlayCheckInner;
  }

  getGameTextPart(): TextPartEntity {
    return {
      type: "entity",
      entityType: "riverDestination",
      riverDestination: this.name,
    };
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    return !this.canPlayCheck(gameState, gameInput);
  }

  canPlayCheck(gameState: GameState, gameInput: GameInput): string | null {
    if (this.canPlayCheckInner) {
      return this.canPlayCheckInner(gameState, gameInput);
    }
    return null;
  }

  play(gameState: GameState, gameInput: GameInput): void {
    if (this.playInner) {
      this.playInner(gameState, gameInput);
    }
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
    spotName: RiverDestinationSpot
  ): string | null {
    const player = gameState.getActivePlayer();
    if (!gameState.gameOptions.pearlbrook) {
      return "Not playing with the Pearlbrook expansion";
    }
    if (!player.hasUnusedAmbassador()) {
      return "Ambassador already placed somewhere else.";
    }

    // Check if spot is already occupied.
    if (spotName !== RiverDestinationSpot.SHOAL) {
      const spot = this.spots[spotName];
      if (spot.ambassadors.length !== 0) {
        return `${spot} is already occupied.`;
      }
    }

    // Check if player fulfills the criteria of the spot!
    switch (spotName) {
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
        assertUnreachable(spotName, spotName);
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
    shortName: [{ type: "em", text: "Shoal" }],
    description: toGameText("Pay 2 ANY and discard 2 CARD to gain 1 PEARL."),
  }),
  [RiverDestinationName.GUS_THE_GARDENER]: new RiverDestination({
    name: RiverDestinationName.GUS_THE_GARDENER,
    type: RiverDestinationType.CITIZEN,
    shortName: toGameText("Discard 3 PRODUCTION, Gain VP and PEARL"),
    description: toGameText(
      "Reveal and discard 3 PRODUCTION from your hand to gain 1 VP and 1 PEARL."
    ),
    playInner: discardCardTypeToGainVPAndPearl({
      name: RiverDestinationName.GUS_THE_GARDENER,
      cardType: CardType.PRODUCTION,
      numToDiscard: 3,
    }),
  }),
  [RiverDestinationName.BOSLEY_THE_ARTIST]: new RiverDestination({
    name: RiverDestinationName.BOSLEY_THE_ARTIST,
    type: RiverDestinationType.CITIZEN,
    shortName: toGameText(
      "Discard 3 different colored CARD, Gain VP and PEARL"
    ),
    description: toGameText(
      "Reveal and discard 3 different colored CARD from your hand to gain 1 VP and 1 PEARL."
    ),
  }),
  [RiverDestinationName.CRUSTINA_THE_CONSTABLE]: new RiverDestination({
    name: RiverDestinationName.CRUSTINA_THE_CONSTABLE,
    type: RiverDestinationType.CITIZEN,
    shortName: toGameText("Discard 2 GOVERNANCE CARD, Gain VP and PEARL"),
    description: toGameText(
      "Reveal and discard 2 GOVERNANCE from your hand to gain 1 VP and 1 PEARL."
    ),
    playInner: discardCardTypeToGainVPAndPearl({
      name: RiverDestinationName.CRUSTINA_THE_CONSTABLE,
      cardType: CardType.GOVERNANCE,
      numToDiscard: 2,
    }),
  }),
  [RiverDestinationName.ILUMINOR_THE_INVENTOR]: new RiverDestination({
    name: RiverDestinationName.ILUMINOR_THE_INVENTOR,
    type: RiverDestinationType.CITIZEN,
    shortName: toGameText("Discard 2 TRAVELER CARD, Gain VP and PEARL"),
    description: toGameText(
      "Reveal and discard 2 TRAVELER from your hand to gain 1 VP and 1 PEARL."
    ),
    playInner: discardCardTypeToGainVPAndPearl({
      name: RiverDestinationName.ILUMINOR_THE_INVENTOR,
      cardType: CardType.TRAVELER,
      numToDiscard: 2,
    }),
  }),
  [RiverDestinationName.SNOUT_THE_EXPLORER]: new RiverDestination({
    name: RiverDestinationName.SNOUT_THE_EXPLORER,
    type: RiverDestinationType.CITIZEN,
    shortName: toGameText("Discard 2 DESTINATION CARD, Gain VP and PEARL"),
    description: toGameText(
      "Reveal and discard 2 DESTINATION from your hand to gain 1 VP and 1 PEARL."
    ),
    playInner: discardCardTypeToGainVPAndPearl({
      name: RiverDestinationName.SNOUT_THE_EXPLORER,
      cardType: CardType.DESTINATION,
      numToDiscard: 2,
    }),
  }),
  [RiverDestinationName.OMICRON_THE_ELDER]: new RiverDestination({
    name: RiverDestinationName.OMICRON_THE_ELDER,
    type: RiverDestinationType.CITIZEN,
    shortName: toGameText("Discard 1 PROSPERITY CARD, Gain VP and PEARL"),
    description: toGameText(
      "Reveal and discard 1 PROSPERITY from your hand to gain 1 VP and 1 PEARL."
    ),
    playInner: discardCardTypeToGainVPAndPearl({
      name: RiverDestinationName.OMICRON_THE_ELDER,
      cardType: CardType.PROSPERITY,
      numToDiscard: 1,
    }),
  }),
  [RiverDestinationName.BALLROOM]: new RiverDestination({
    name: RiverDestinationName.BALLROOM,
    type: RiverDestinationType.LOCATION,
    shortName: toGameText("Pay VP & RESIN, Gain 3 CARD & 1 PEARL"),
    description: toGameText(
      "Pay 1 VP and 1 RESIN to draw 3 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.WATERMILL]: new RiverDestination({
    name: RiverDestinationName.WATERMILL,
    type: RiverDestinationType.LOCATION,
    shortName: toGameText("Pay VP & TWIG, Gain 2 CARD & 1 PEARL"),
    description: toGameText(
      "Pay 1 VP and 1 TWIG to draw 2 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.OBSERVATORY]: new RiverDestination({
    name: RiverDestinationName.OBSERVATORY,
    type: RiverDestinationType.LOCATION,
    shortName: toGameText("Pay VP & ANY, Gain 2 Meadow CARD & 1 PEARL"),
    description: toGameText(
      "Pay 1 VP and 1 ANY to draw 2 CARD from the Meadow and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.MARKET]: new RiverDestination({
    name: RiverDestinationName.MARKET,
    type: RiverDestinationType.LOCATION,
    shortName: toGameText("Pay VP & ANY, Gain 3 CARD & 1 PEARL"),
    description: toGameText(
      "Pay 1 VP and 1 ANY to draw 3 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.GREAT_HALL]: new RiverDestination({
    name: RiverDestinationName.GREAT_HALL,
    type: RiverDestinationType.LOCATION,
    shortName: toGameText("Pay VP & PEBBLE, Gain 4 CARD & 1 PEARL"),
    description: toGameText(
      "Pay 1 VP and 1 PEBBLE to draw 4 CARD and gain 1 PEARL."
    ),
  }),
  [RiverDestinationName.GARDENS]: new RiverDestination({
    name: RiverDestinationName.GARDENS,
    type: RiverDestinationType.LOCATION,
    shortName: toGameText("Pay VP & BERRY, Gain 3 CARD & 1 PEARL"),
    description: toGameText(
      "Pay 1 VP and 1 BERRY to draw 3 CARD and gain 1 PEARL."
    ),
  }),
};

function discardCardTypeToGainVPAndPearl({
  name,
  cardType,
  numToDiscard,
}: {
  name: RiverDestinationName;
  cardType: CardType;
  numToDiscard: number;
}): GameStatePlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.VISIT_RIVER_DESTINATION) {
      const cardOptions = player.cardsInHand.filter((cardName) => {
        return Card.fromName(cardName).cardType === cardType;
      });
      if (cardOptions.length < numToDiscard) {
        return;
      }
      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_CARDS,
        prevInputType: gameInput.inputType,
        label: `Select 3 ${CardType} CARD to discard to gain 1 VP and 1 PEARL (or none to skip action)`,
        cardOptions,
        maxToSelect: numToDiscard,
        minToSelect: 0,
        riverDestinationContext: name,
        clientOptions: {
          selectedCards: [],
        },
      });
    } else if (
      gameInput.inputType === GameInputType.SELECT_CARDS &&
      gameInput.prevInputType === GameInputType.VISIT_RIVER_DESTINATION &&
      gameInput.riverDestinationContext === name
    ) {
      const selectedCards = gameInput.clientOptions.selectedCards;
      if (selectedCards.length === 0) {
        gameState.addGameLogFromRiverDestination(name, [
          player,
          " declined to discard any CARD.",
        ]);
        return;
      }
      if (
        selectedCards.length !== 3 ||
        selectedCards.filter((cardName) => {
          return Card.fromName(cardName).cardType === cardType;
        }).length !== 3
      ) {
        throw new Error(`Please select 3 ${cardType} cards to discard`);
      }
      gameState.addGameLogFromRiverDestination(name, [
        player,
        ` discarded 3 ${cardType} cards from their hand (`,
        ...cardListToGameText(selectedCards),
        ") to gain 1 VP and 1 PEARL.",
      ]);
      selectedCards.forEach((cardName) => {
        player.removeCardFromHand(cardName);
        gameState.discardPile.addToStack(cardName);
      });
      player.gainResources({ [ResourceType.PEARL]: 1, [ResourceType.VP]: 1 });
    }
  };
}
