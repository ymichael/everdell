import shuffle from "lodash/shuffle";
import cloneDeep from "lodash/cloneDeep";
import mapValues from "lodash/mapValues";
import uniq from "lodash/uniq";

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

// Pearlbrook River Destination
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

  static getSpotGameText(spot: RiverDestinationSpot): GameText {
    switch (spot) {
      case RiverDestinationSpot.SHOAL:
        return toGameText("Shoal");
      case RiverDestinationSpot.TWO_TRAVELER:
        return toGameText("2 TRAVELER");
      case RiverDestinationSpot.TWO_GOVERNANCE:
        return toGameText("2 GOVERNANCE");
      case RiverDestinationSpot.THREE_PRODUCTION:
        return toGameText("2 PRODUCTION");
      case RiverDestinationSpot.TWO_DESTINATION:
        return toGameText("2 DESTINATION");
      default:
        assertUnreachable(spot, spot);
    }
    return [];
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

const REGISTRY: Record<RiverDestinationName, RiverDestination> = {
  [RiverDestinationName.SHOAL]: new RiverDestination({
    name: RiverDestinationName.SHOAL,
    type: RiverDestinationType.SHOAL,
    isExclusive: false,
    shortName: [{ type: "em", text: "Shoal" }],
    description: toGameText("Pay 2 ANY and discard 2 CARD to gain 1 PEARL."),
    canPlayCheckInner(gameState: GameState, gameInput: GameInput) {
      if (gameInput.inputType === GameInputType.VISIT_RIVER_DESTINATION) {
        const player = gameState.getActivePlayer();
        if (player.getNumCardCostResources() < 2) {
          return "Not enough resources to spend.";
        }
        if (player.cardsInHand.length < 2) {
          return "Not enough cards to discard.";
        }
      }
      return null;
    },
    playInner(gameState: GameState, gameInput: GameInput) {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_RIVER_DESTINATION) {
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
        gameInput.prevInputType === GameInputType.VISIT_RIVER_DESTINATION &&
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
          player.removeCardFromHand(cardName);
          gameState.discardPile.addToStack(cardName);
        });
        gameState.addGameLogFromRiverDestination(RiverDestinationName.SHOAL, [
          player,
          ` discarded ${gameInput.minToSelect} CARD.`,
        ]);
        gameState.addGameLogFromRiverDestination(RiverDestinationName.SHOAL, [
          player,
          ` gained 1 PEARL.`,
        ]);
        player.gainResources({ [ResourceType.PEARL]: 1 });
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
      if (gameInput.inputType === GameInputType.VISIT_RIVER_DESTINATION) {
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
        gameInput.prevInputType === GameInputType.VISIT_RIVER_DESTINATION &&
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
          player.removeCardFromHand(cardName);
          gameState.discardPile.addToStack(cardName);
        });
        player.gainResources({ [ResourceType.PEARL]: 1, [ResourceType.VP]: 1 });
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
      if (gameInput.inputType === GameInputType.VISIT_RIVER_DESTINATION) {
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
        gameInput.prevInputType === GameInputType.VISIT_RIVER_DESTINATION &&
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
            " spent",
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
        gameInput.prevInputType === GameInputType.SELECT_RESOURCES &&
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
        player.gainResources({ [ResourceType.PEARL]: 1 });
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
      if (gameInput.inputType === GameInputType.VISIT_RIVER_DESTINATION) {
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
        gameInput.prevInputType === GameInputType.VISIT_RIVER_DESTINATION &&
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
          " spent",
          ...resourceMapToGameText({
            [selectedOption]: 1,
            [ResourceType.VP]: 1,
          }),
          ".",
        ]);

        player.drawCards(gameState, 3);
        player.gainResources({ [ResourceType.PEARL]: 1 });
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
      name: RiverDestinationName.MARKET,
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
    if (gameInput.inputType === GameInputType.VISIT_RIVER_DESTINATION) {
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
      gameInput.prevInputType === GameInputType.VISIT_RIVER_DESTINATION &&
      gameInput.riverDestinationContext === name
    ) {
      const selectedOption = gameInput.clientOptions.selectedOption;
      if (!selectedOption || gameInput.options.indexOf(selectedOption) === -1) {
        throw new Error("Please select an option");
      }
      if (selectedOption === "Ok") {
        gameState.addGameLogFromRiverDestination(name, [
          player,
          ` spent ${resourceType} and VP `,
          `to draw ${numCardsToDraw} CARD and gain 1 PEARL`,
        ]);
        player.spendResources({ [ResourceType.VP]: 1, [resourceType]: 1 });
        player.gainResources({ [ResourceType.PEARL]: 1 });
        player.drawCards(gameState, numCardsToDraw);
      } else {
        gameState.addGameLogFromRiverDestination(name, [
          player,
          " declined to spend ${resourceType} and VP.",
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
        label: `Select 3 ${cardType} CARD to discard to gain 1 VP and 1 PEARL (or none to skip action)`,
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
