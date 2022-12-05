import shuffle from "lodash/shuffle";
import cloneDeep from "lodash/cloneDeep";
import mapValues from "lodash/mapValues";
import uniq from "lodash/uniq";

import {
  CardType,
  CardName,
  RiverDestinationSpotName,
  RiverDestinationMapSpots,
  RiverDestinationSpotNameInfo,
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
import { sumResources } from "./gameStatePlayHelpers";
import {
  toGameText,
  cardListToGameText,
  resourceMapToGameText,
} from "./gameText";
import { Card } from "./card";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayCheckFn,
} from "./gameState";
import { assertUnreachable } from "../utils";

/**
 * Pearlbrook River RiverDestinations
 *
 * - RiverDestinationMap stores the game state
 *   (eg. which spots hold which destinations, which are revealed)
 * - RiverDestinationSpot class refers to the place on the board (eg. 2 TRAVELLER)
 * - RiverDestination refers to the cards that get placed on the spot.
 */

export class RiverDestination implements GameStatePlayable, IGameTextEntity {
  readonly name: RiverDestinationName;
  readonly isExclusive: boolean;
  readonly type: RiverDestinationType;
  readonly description: GameText;
  readonly shortName: GameText;
  readonly playInner: GameStatePlayFn;
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
    playInner: GameStatePlayFn;
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
    this.playInner(gameState, gameInput);
  }

  getPoints(): number {
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

export class RiverDestinationSpot implements IGameTextEntity {
  readonly name: RiverDestinationSpotName;
  readonly shortName: GameText;

  constructor({
    name,
    shortName,
  }: {
    name: RiverDestinationSpotName;
    shortName: GameText;
  }) {
    this.name = name;
    this.shortName = shortName;
  }

  getGameTextPart(): TextPartEntity {
    return {
      type: "entity",
      entityType: "riverDestinationSpot",
      spot: this.name,
    };
  }

  static fromName(name: RiverDestinationSpotName): RiverDestinationSpot {
    if (!SPOT_REGISTRY[name]) {
      throw new Error(`Invalid RiverDestinationSpot: ${name}`);
    }
    return SPOT_REGISTRY[name];
  }
}

export class RiverDestinationMap {
  readonly spots: RiverDestinationMapSpots;

  constructor({ spots }: { spots: RiverDestinationMapSpots }) {
    this.spots = spots;
  }

  canVisitSpotCheck(
    gameState: GameState,
    spotName: RiverDestinationSpotName
  ): string | null {
    const player = gameState.getActivePlayer();
    if (!gameState.gameOptions.pearlbrook) {
      return "Not playing with the Pearlbrook expansion";
    }
    if (!player.hasUnusedAmbassador()) {
      return "Ambassador already placed somewhere else.";
    }

    // Check if spot is already occupied.
    if (spotName !== RiverDestinationSpotName.SHOAL) {
      const spot = this.spots[spotName];
      if (spot.ambassadors.length !== 0) {
        return `${spot} is already occupied.`;
      }
    }

    // player cannot visit shoal if they don't have enough resources or cards
    if (spotName === RiverDestinationSpotName.SHOAL) {
      if (player.getNumCardCostResources() < 2) {
        return `Not enough resources to visit shoal.`;
      }

      if (player.numCardsInHand < 2) {
        return `Not enough cards to visit shoal.`;
      }
    }

    // Check if player fulfills the criteria of the spot!
    const adjustCountsBy = {
      [CardType.PRODUCTION]: 0,
      [CardType.DESTINATION]: 0,
      [CardType.GOVERNANCE]: 0,
      [CardType.TRAVELER]: 0,
      [CardType.PROSPERITY]: 0,
    };
    const messenger = Card.fromName(CardName.MESSENGER);
    player
      .getPlayedCardForCardName(messenger.name)
      .forEach(({ shareSpaceWith }) => {
        if (!shareSpaceWith) {
          throw new Error(
            "Messenger not sharing a space with any Construction."
          );
        }
        const card = Card.fromName(shareSpaceWith);
        adjustCountsBy[messenger.cardType] -= 1;
        adjustCountsBy[card.cardType] += 1;
      });

    const getNumByCardType = (cardType: CardType): number => {
      return (
        player.getAllPlayedCardsByType(cardType).length +
        adjustCountsBy[cardType]
      );
    };

    switch (spotName) {
      case RiverDestinationSpotName.THREE_PRODUCTION:
        if (getNumByCardType(CardType.PRODUCTION) < 3) {
          return "Must have 3 PRODUCTION cards in your city";
        }
        break;
      case RiverDestinationSpotName.TWO_DESTINATION:
        if (getNumByCardType(CardType.DESTINATION) < 2) {
          return "Must have 2 DESTINATION cards in your city";
        }
        break;
      case RiverDestinationSpotName.TWO_GOVERNANCE:
        if (getNumByCardType(CardType.GOVERNANCE) < 2) {
          return "Must have 2 GOVERNANCE cards in your city";
        }
        break;
      case RiverDestinationSpotName.TWO_TRAVELER:
        if (getNumByCardType(CardType.TRAVELER) < 2) {
          return "Must have 2 TRAVELER cards in your city";
        }
        break;
      case RiverDestinationSpotName.SHOAL:
        break;
      default:
        assertUnreachable(spotName, spotName);
    }

    return null;
  }

  revealSpot(name: RiverDestinationSpotName): void {
    const spotInfo = this.spots[name];
    // Should not happen unless we're using the public gameState object.
    if (!spotInfo.name) {
      throw new Error("Unable to reveal River Destination card.");
    }
    if (spotInfo.revealed) {
      throw new Error("Spot already revealed");
    }
    spotInfo.revealed = true;
  }

  visitSpot(
    gameState: GameState,
    gameInput: GameInput,
    spotName: RiverDestinationSpotName
  ): void {
    const player = gameState.getActivePlayer();
    const riverDestinationSpot = RiverDestinationSpot.fromName(spotName);
    const spotInfo = this.spots[spotName];
    // Should not happen unless we're using the public gameState object.
    if (!spotInfo.name) {
      throw new Error("Unable to reveal River Destination card.");
    }

    spotInfo.ambassadors.push(player.playerId);

    const riverDestination = RiverDestination.fromName(spotInfo.name);
    const canPlayRiverDestinationErr = riverDestination.canPlayCheck(
      gameState,
      gameInput
    );
    if (canPlayRiverDestinationErr) {
      throw new Error(canPlayRiverDestinationErr);
    }

    if (!spotInfo.revealed) {
      this.revealSpot(spotName);
      gameState.addGameLogFromRiverDestinationSpot(spotName, [
        player,
        ` visited `,
        riverDestinationSpot,
        ` and revealed `,
        riverDestination,
        ".",
      ]);
      gameState.addGameLogFromRiverDestinationSpot(spotName, [
        player,
        " gained 1 PEARL.",
      ]);
      player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
    } else {
      if (spotName === RiverDestinationSpotName.SHOAL) {
        gameState.addGameLogFromRiverDestinationSpot(spotName, [
          player,
          " visited ",
          riverDestination,
          `.`,
        ]);
      } else {
        gameState.addGameLogFromRiverDestinationSpot(spotName, [
          player,
          " visited ",
          riverDestination,
          ` at `,
          riverDestinationSpot,
          `.`,
        ]);
      }
    }
    riverDestination.play(gameState, gameInput);
  }

  spotEntries(): [RiverDestinationSpotName, RiverDestinationSpotNameInfo][] {
    const ret: [RiverDestinationSpotName, RiverDestinationSpotNameInfo][] = [];
    this.forEachSpot((a, b) => ret.push([a, b]));
    return ret;
  }

  forEachSpot(
    fn: (
      spot: RiverDestinationSpotName,
      spotInfo: RiverDestinationSpotNameInfo
    ) => void
  ): void {
    (Object.keys(this.spots) as RiverDestinationSpotName[]).forEach(
      (spotName) => {
        fn(spotName, this.spots[spotName]);
      }
    );
  }

  getRevealedDestinations(): RiverDestinationName[] {
    const ret: RiverDestinationName[] = [];
    this.forEachSpot((_, { name, revealed }) => {
      if (name === RiverDestinationName.SHOAL) {
        return;
      }
      if (revealed) {
        ret.push(name!);
      }
    });
    return ret;
  }

  recallAmbassadorForPlayer(playerId: string) {
    this.forEachSpot((_, spotInfo) => {
      spotInfo.ambassadors = spotInfo.ambassadors.filter((x) => x !== playerId);
    });
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
  const [a, b, ..._restCitizen] = shuffle(
    RiverDestination.byType(RiverDestinationType.CITIZEN)
  );
  const [c, d, ..._restLocation] = shuffle(
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

const SPOT_REGISTRY: Record<RiverDestinationSpotName, RiverDestinationSpot> = {
  [RiverDestinationSpotName.SHOAL]: new RiverDestinationSpot({
    name: RiverDestinationSpotName.SHOAL,
    shortName: toGameText("Shoal"),
  }),
  [RiverDestinationSpotName.THREE_PRODUCTION]: new RiverDestinationSpot({
    name: RiverDestinationSpotName.THREE_PRODUCTION,
    shortName: toGameText("3 PRODUCTION"),
  }),
  [RiverDestinationSpotName.TWO_DESTINATION]: new RiverDestinationSpot({
    name: RiverDestinationSpotName.TWO_DESTINATION,
    shortName: toGameText("2 DESTINATION"),
  }),
  [RiverDestinationSpotName.TWO_GOVERNANCE]: new RiverDestinationSpot({
    name: RiverDestinationSpotName.TWO_GOVERNANCE,
    shortName: toGameText("2 GOVERNANCE"),
  }),
  [RiverDestinationSpotName.TWO_TRAVELER]: new RiverDestinationSpot({
    name: RiverDestinationSpotName.TWO_TRAVELER,
    shortName: toGameText("2 TRAVELER"),
  }),
};

const REGISTRY: Record<RiverDestinationName, RiverDestination> = {
  [RiverDestinationName.SHOAL]: new RiverDestination({
    name: RiverDestinationName.SHOAL,
    type: RiverDestinationType.SHOAL,
    isExclusive: false,
    shortName: [{ type: "em", text: "Shoal" }],
    description: toGameText("Pay 2 ANY and discard 2 CARD to gain 1 PEARL."),
    canPlayCheckInner(gameState: GameState, gameInput: GameInput) {
      if (gameInput.inputType === GameInputType.PLACE_AMBASSADOR) {
        const player = gameState.getActivePlayer();
        if (player.getNumCardCostResources() < 2) {
          return "Not enough resources to spend.";
        }
        if (player.numCardsInHand < 2) {
          return "Not enough cards to discard.";
        }
      }

      return null;
    },
    playInner(gameState: GameState, gameInput: GameInput) {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_AMBASSADOR) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: gameInput.inputType,
          label: "Pay 2 ANY (and discard 2 CARD to gain 1 PEARL)",
          riverDestinationContext: RiverDestinationName.SHOAL,
          toSpend: true,
          minResources: 2,
          maxResources: 2,
          clientOptions: {
            resources: {},
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_RESOURCES &&
        gameInput.prevInputType === GameInputType.PLACE_AMBASSADOR &&
        gameInput.riverDestinationContext === RiverDestinationName.SHOAL
      ) {
        const selectedResources = gameInput.clientOptions.resources;
        if (sumResources(selectedResources) !== gameInput.minResources) {
          throw new Error(
            `Please select ${gameInput.minResources} resources to spend`
          );
        }
        player.spendResources(selectedResources);
        gameState.addGameLogFromRiverDestination(RiverDestinationName.SHOAL, [
          player,
          " paid ",
          ...resourceMapToGameText(selectedResources),
          ".",
        ]);
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          label: "Discard 2 CARD (to gain 1 PEARL)",
          riverDestinationContext: RiverDestinationName.SHOAL,
          cardOptions: player.cardsInHand,
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.prevInputType === GameInputType.SELECT_RESOURCES &&
        gameInput.riverDestinationContext === RiverDestinationName.SHOAL
      ) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length !== gameInput.minToSelect) {
          throw new Error(`Please select ${gameInput.minToSelect} to discard`);
        }
        selectedCards.forEach((cardName) => {
          player.removeCardFromHand(gameState, cardName);
        });
        gameState.addGameLogFromRiverDestination(RiverDestinationName.SHOAL, [
          player,
          ` discarded ${gameInput.minToSelect} CARD.`,
        ]);
        gameState.addGameLogFromRiverDestination(RiverDestinationName.SHOAL, [
          player,
          ` gained 1 PEARL.`,
        ]);
        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
      }
    },
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
    playInner(gameState: GameState, gameInput: GameInput) {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_AMBASSADOR) {
        const numCardTypesInHand = uniq(
          player.cardsInHand.map((cardName) => {
            return Card.fromName(cardName).cardType;
          })
        ).length;
        if (numCardTypesInHand < 3) {
          return;
        }
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          label: [
            "Select 3 ",
            { type: "em", text: "different colored" },
            "  CARD to discard to gain 1 VP and 1 PEARL (or none to skip action)",
          ],
          cardOptions: player.cardsInHand,
          maxToSelect: 3,
          minToSelect: 0,
          riverDestinationContext: RiverDestinationName.BOSLEY_THE_ARTIST,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.prevInputType === GameInputType.PLACE_AMBASSADOR &&
        gameInput.riverDestinationContext ===
          RiverDestinationName.BOSLEY_THE_ARTIST
      ) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length === 0) {
          gameState.addGameLogFromRiverDestination(
            RiverDestinationName.BOSLEY_THE_ARTIST,
            [player, " declined to discard any CARD."]
          );
          return;
        }
        if (
          selectedCards.length !== 3 ||
          uniq(
            selectedCards.map((cardName) => {
              return Card.fromName(cardName).cardType;
            })
          ).length !== 3
        ) {
          throw new Error(`Please select 3 different colored cards to discard`);
        }
        gameState.addGameLogFromRiverDestination(
          RiverDestinationName.BOSLEY_THE_ARTIST,
          [
            player,
            ` discarded 3 differnt colored cards from their hand (`,
            ...cardListToGameText(selectedCards),
            ") to gain 1 VP and 1 PEARL.",
          ]
        );
        selectedCards.forEach((cardName) => {
          player.removeCardFromHand(gameState, cardName);
        });
        player.gainResources(gameState, {
          [ResourceType.PEARL]: 1,
          [ResourceType.VP]: 1,
        });
      }
    },
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
    playInner: payVPResourceToDrawCardAndPearl({
      name: RiverDestinationName.BALLROOM,
      resourceType: ResourceType.RESIN,
      numCardsToDraw: 3,
    }),
  }),
  [RiverDestinationName.WATERMILL]: new RiverDestination({
    name: RiverDestinationName.WATERMILL,
    type: RiverDestinationType.LOCATION,
    shortName: toGameText("Pay VP & TWIG, Gain 2 CARD & 1 PEARL"),
    description: toGameText(
      "Pay 1 VP and 1 TWIG to draw 2 CARD and gain 1 PEARL."
    ),
    playInner: payVPResourceToDrawCardAndPearl({
      name: RiverDestinationName.WATERMILL,
      resourceType: ResourceType.TWIG,
      numCardsToDraw: 2,
    }),
  }),
  [RiverDestinationName.OBSERVATORY]: new RiverDestination({
    name: RiverDestinationName.OBSERVATORY,
    type: RiverDestinationType.LOCATION,
    shortName: toGameText("Pay VP & ANY, Gain 2 Meadow CARD & 1 PEARL"),
    description: toGameText(
      "Pay 1 VP and 1 ANY to draw 2 CARD from the Meadow and gain 1 PEARL."
    ),
    playInner(gameState: GameState, gameInput: GameInput) {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_AMBASSADOR) {
        if (
          player.getNumCardCostResources() < 1 ||
          player.getNumResourcesByType(ResourceType.VP) < 1
        ) {
          return;
        }
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: gameInput.inputType,
          label:
            "Pay 1 ANY and 1 VP to draw 2 CARD from the Meadow and gain 1 PEARL",
          riverDestinationContext: RiverDestinationName.OBSERVATORY,
          options: [
            ...[
              ResourceType.BERRY,
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.PEBBLE,
            ].filter((resourceType) => {
              return player.getNumResourcesByType(resourceType) > 0;
            }),
            "Decline",
          ],
          clientOptions: {
            selectedOption: null,
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
        gameInput.prevInputType === GameInputType.PLACE_AMBASSADOR &&
        gameInput.riverDestinationContext === RiverDestinationName.OBSERVATORY
      ) {
        const selectedOption = gameInput.clientOptions.selectedOption;
        if (
          !selectedOption ||
          gameInput.options.indexOf(selectedOption) === -1
        ) {
          throw new Error(`Please select an option`);
        }
        if (selectedOption === "Decline") {
          gameState.addGameLogFromRiverDestination(
            RiverDestinationName.OBSERVATORY,
            [player, " declined to spend any resources."]
          );
          return;
        }
        player.spendResources({ [selectedOption]: 1, [ResourceType.VP]: 1 });
        gameState.addGameLogFromRiverDestination(
          RiverDestinationName.OBSERVATORY,
          [
            player,
            " spent ",
            ...resourceMapToGameText({
              [selectedOption]: 1,
              [ResourceType.VP]: 1,
            }),
            ".",
          ]
        );
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          label: "Select 2 Meadow CARD",
          riverDestinationContext: RiverDestinationName.OBSERVATORY,
          cardOptions: gameState.meadowCards,
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.prevInputType === GameInputType.SELECT_OPTION_GENERIC &&
        gameInput.riverDestinationContext === RiverDestinationName.OBSERVATORY
      ) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length !== gameInput.minToSelect) {
          throw new Error(`Please select ${gameInput.minToSelect} cards`);
        }
        selectedCards.forEach((cardName) => {
          gameState.removeCardFromMeadow(cardName);
          player.addCardToHand(gameState, cardName);
        });
        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
        gameState.addGameLogFromRiverDestination(
          RiverDestinationName.OBSERVATORY,
          [
            player,
            ` drew `,
            ...cardListToGameText(selectedCards),
            ` from the Meadow.`,
          ]
        );
        gameState.addGameLogFromRiverDestination(
          RiverDestinationName.OBSERVATORY,
          [player, ` gained 1 PEARL.`]
        );
      }
    },
  }),
  [RiverDestinationName.MARKET]: new RiverDestination({
    name: RiverDestinationName.MARKET,
    type: RiverDestinationType.LOCATION,
    shortName: toGameText("Pay VP & ANY, Gain 3 CARD & 1 PEARL"),
    description: toGameText(
      "Pay 1 VP and 1 ANY to draw 3 CARD and gain 1 PEARL."
    ),
    playInner(gameState: GameState, gameInput: GameInput) {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_AMBASSADOR) {
        if (
          player.getNumCardCostResources() < 1 ||
          player.getNumResourcesByType(ResourceType.VP) < 1
        ) {
          return;
        }
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: gameInput.inputType,
          label: "Pay 1 ANY and 1 VP to draw 3 CARD and gain 1 PEARL",
          riverDestinationContext: RiverDestinationName.MARKET,
          options: [
            ...[
              ResourceType.BERRY,
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.PEBBLE,
            ].filter((resourceType) => {
              return player.getNumResourcesByType(resourceType) > 0;
            }),
            "Decline",
          ],
          clientOptions: {
            selectedOption: null,
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
        gameInput.prevInputType === GameInputType.PLACE_AMBASSADOR &&
        gameInput.riverDestinationContext === RiverDestinationName.MARKET
      ) {
        const selectedOption = gameInput.clientOptions.selectedOption;
        if (
          !selectedOption ||
          gameInput.options.indexOf(selectedOption) === -1
        ) {
          throw new Error(`Please select an option`);
        }
        if (selectedOption === "Decline") {
          gameState.addGameLogFromRiverDestination(
            RiverDestinationName.MARKET,
            [player, " declined to spend any resources."]
          );
          return;
        }
        player.spendResources({ [selectedOption]: 1, [ResourceType.VP]: 1 });
        gameState.addGameLogFromRiverDestination(RiverDestinationName.MARKET, [
          player,
          " spent ",
          ...resourceMapToGameText({
            [selectedOption]: 1,
            [ResourceType.VP]: 1,
          }),
          ".",
        ]);

        player.drawCards(gameState, 3);
        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
        gameState.addGameLogFromRiverDestination(RiverDestinationName.MARKET, [
          player,
          ` drew 3 CARD and gained 1 PEARL.`,
        ]);
      }
    },
  }),
  [RiverDestinationName.GREAT_HALL]: new RiverDestination({
    name: RiverDestinationName.GREAT_HALL,
    type: RiverDestinationType.LOCATION,
    shortName: toGameText("Pay VP & PEBBLE, Gain 4 CARD & 1 PEARL"),
    description: toGameText(
      "Pay 1 VP and 1 PEBBLE to draw 4 CARD and gain 1 PEARL."
    ),
    playInner: payVPResourceToDrawCardAndPearl({
      name: RiverDestinationName.GREAT_HALL,
      resourceType: ResourceType.PEBBLE,
      numCardsToDraw: 4,
    }),
  }),
  [RiverDestinationName.GARDENS]: new RiverDestination({
    name: RiverDestinationName.GARDENS,
    type: RiverDestinationType.LOCATION,
    shortName: toGameText("Pay VP & BERRY, Gain 3 CARD & 1 PEARL"),
    description: toGameText(
      "Pay 1 VP and 1 BERRY to draw 3 CARD and gain 1 PEARL."
    ),
    playInner: payVPResourceToDrawCardAndPearl({
      name: RiverDestinationName.GARDENS,
      resourceType: ResourceType.BERRY,
      numCardsToDraw: 3,
    }),
  }),
};

function payVPResourceToDrawCardAndPearl({
  name,
  resourceType,
  numCardsToDraw,
}: {
  name: RiverDestinationName;
  resourceType: ResourceType;
  numCardsToDraw: number;
}): GameStatePlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.PLACE_AMBASSADOR) {
      if (
        player.getNumResourcesByType(resourceType) < 1 ||
        player.getNumResourcesByType(ResourceType.VP) < 1
      ) {
        return;
      }

      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_OPTION_GENERIC,
        prevInputType: gameInput.inputType,
        riverDestinationContext: name,
        label: `Spend 1 ${resourceType} and 1 VP to draw ${numCardsToDraw} CARD and gain 1 PEARL`,
        options: [`Ok`, `Decline`],
        clientOptions: {
          selectedOption: null,
        },
      });
    } else if (
      gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
      gameInput.prevInputType === GameInputType.PLACE_AMBASSADOR &&
      gameInput.riverDestinationContext === name
    ) {
      const selectedOption = gameInput.clientOptions.selectedOption;
      if (!selectedOption || gameInput.options.indexOf(selectedOption) === -1) {
        throw new Error("Please select an option");
      }
      if (selectedOption === "Ok") {
        gameState.addGameLogFromRiverDestination(name, [
          player,
          ` spent 1 ${resourceType} and 1 VP `,
          `to draw ${numCardsToDraw} CARD and gain 1 PEARL.`,
        ]);
        player.spendResources({ [ResourceType.VP]: 1, [resourceType]: 1 });
        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
        player.drawCards(gameState, numCardsToDraw);
      } else {
        gameState.addGameLogFromRiverDestination(name, [
          player,
          ` declined to spend ${resourceType} and VP.`,
        ]);
        return;
      }
    }
  };
}

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
    if (gameInput.inputType === GameInputType.PLACE_AMBASSADOR) {
      const cardOptions = player.cardsInHand.filter((cardName) => {
        return Card.fromName(cardName).cardType === cardType;
      });
      if (cardOptions.length < numToDiscard) {
        return;
      }
      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_CARDS,
        prevInputType: gameInput.inputType,
        label: `Select ${numToDiscard} ${cardType} CARD to discard to gain 1 VP and 1 PEARL (or none to skip action)`,
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
      gameInput.prevInputType === GameInputType.PLACE_AMBASSADOR &&
      gameInput.riverDestinationContext === name
    ) {
      const selectedCards = gameInput.clientOptions.selectedCards;
      if (selectedCards.length === 0) {
        gameState.addGameLogFromRiverDestination(name, [
          player,
          ` declined to discard any ${cardType} CARD.`,
        ]);
        return;
      }
      if (
        selectedCards.length !== numToDiscard ||
        selectedCards.filter((cardName) => {
          return Card.fromName(cardName).cardType === cardType;
        }).length !== numToDiscard
      ) {
        throw new Error(
          `Please select ${numToDiscard} ${cardType} cards to discard`
        );
      }
      gameState.addGameLogFromRiverDestination(name, [
        player,
        ` discarded ${numToDiscard} ${cardType} cards from their hand (`,
        ...cardListToGameText(selectedCards),
        ") to gain 1 VP and 1 PEARL.",
      ]);
      selectedCards.forEach((cardName) => {
        player.removeCardFromHand(gameState, cardName);
      });
      player.gainResources(gameState, {
        [ResourceType.PEARL]: 1,
        [ResourceType.VP]: 1,
      });
    }
  };
}
