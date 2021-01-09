import {
  CardName,
  ResourceType,
  LocationName,
  LocationType,
  LocationOccupancy,
  LocationNameToPlayerIds,
  GameInput,
  GameInputType,
  Season,
  ProductionResourceMap,
  GameText,
} from "./types";
import { sumResources } from "./gameStatePlayHelpers";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayCheckFn,
} from "./gameState";
import shuffle from "lodash/shuffle";
import { assertUnreachable, strToGameText } from "../utils";

export class Location implements GameStatePlayable {
  readonly name: LocationName;
  readonly shortName: GameText | undefined;
  readonly type: LocationType;
  readonly description: GameText | undefined;
  readonly resourcesToGain: ProductionResourceMap;
  readonly occupancy: LocationOccupancy;
  readonly playInner: GameStatePlayFn | undefined;
  readonly canPlayCheckInner: GameStateCanPlayCheckFn | undefined;

  constructor({
    name,
    type,
    occupancy,
    shortName,
    description,
    resourcesToGain,
    playInner,
    canPlayCheckInner,
  }: {
    name: LocationName;
    type: LocationType;
    occupancy: LocationOccupancy;
    shortName?: GameText | undefined;
    playInner?: GameStatePlayFn;
    resourcesToGain?: ProductionResourceMap;
    canPlayCheckInner?: GameStateCanPlayCheckFn;
    description?: GameText | undefined;
  }) {
    this.name = name;
    this.type = type;
    this.occupancy = occupancy;
    this.playInner = playInner;
    this.canPlayCheckInner = canPlayCheckInner;
    this.resourcesToGain = resourcesToGain || {};
    this.description = description;
    this.shortName = shortName;
  }

  getShortName(): GameText {
    if (this.shortName) {
      return this.shortName;
    }
    return [{ type: "text", text: this.name }];
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    return !this.canPlayCheck(gameState, gameInput);
  }

  canPlayCheck(gameState: GameState, gameInput: GameInput): string | null {
    if (!(this.name in gameState.locationsMap)) {
      return `Location ${
        this.name
      } is not part of the current game. \nGame Locations: ${JSON.stringify(
        gameState.locationsMap,
        null,
        2
      )}`;
    }
    if (gameInput.inputType === GameInputType.PLACE_WORKER) {
      const player = gameState.getActivePlayer();
      if (player.numAvailableWorkers <= 0) {
        return `Active player (${player.playerId}) doesn't have any workers to place.`;
      }
      switch (this.occupancy) {
        case LocationOccupancy.EXCLUSIVE:
          if (gameState.locationsMap[this.name]!.length !== 0) {
            return `Location ${
              this.name
            } is occupied. \nGame Locations: ${JSON.stringify(
              gameState.locationsMap,
              null,
              2
            )}`;
          }
          break;
        case LocationOccupancy.EXCLUSIVE_FOUR:
          if (
            !(
              gameState.locationsMap[this.name]!.length <
              (gameState.players.length < 4 ? 1 : 2)
            )
          ) {
            return `Location ${
              this.name
            } is occupied. \nGame Locations: ${JSON.stringify(
              gameState.locationsMap,
              null,
              2
            )}`;
          }
          break;
        case LocationOccupancy.UNLIMITED:
          break;
        default:
          assertUnreachable(
            this.occupancy,
            `Unexpected occupancy: ${this.occupancy}`
          );
      }
    }
    if (this.canPlayCheckInner) {
      const errorMsg = this.canPlayCheckInner(gameState, gameInput);
      if (errorMsg) {
        return errorMsg;
      }
    }
    return null;
  }

  play(gameState: GameState, gameInput: GameInput): void {
    const canPlayError = this.canPlayCheck(gameState, gameInput);
    if (canPlayError) {
      throw new Error(canPlayError);
    }
    if (this.playInner) {
      this.playInner(gameState, gameInput);
    }
    if (this.resourcesToGain) {
      const player = gameState.getActivePlayer();
      player.gainResources(this.resourcesToGain);
      if (this.resourcesToGain.CARD) {
        player.drawCards(gameState, this.resourcesToGain.CARD);
      }
    }
  }

  static fromName(name: LocationName): Location {
    if (!LOCATION_REGISTRY[name]) {
      throw new Error(`Invalid Location name: ${name}`);
    }
    return LOCATION_REGISTRY[name];
  }

  static byType(type: LocationType): LocationName[] {
    return ((Object.entries(LOCATION_REGISTRY) as unknown) as [
      LocationName,
      Location
    ][])
      .filter(([_, loc]) => {
        return loc.type === type;
      })
      .map(([name, _]) => {
        return name;
      });
  }
}

const LOCATION_REGISTRY: Record<LocationName, Location> = {
  [LocationName.HAVEN]: new Location({
    name: LocationName.HAVEN,
    shortName: strToGameText("Haven"),
    type: LocationType.HAVEN,
    occupancy: LocationOccupancy.UNLIMITED,
    description: strToGameText([
      "May discard any CARD from your hand. ",
      "For every 2 CARD you discard, gain 1 ANY.",
    ]),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        if (player.cardsInHand.length < 1) {
          throw new Error("must have cards to discard");
        }

        // ask player how many cards to discard
        gameState.pendingGameInputs.push({
          inputType: GameInputType.DISCARD_CARDS,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.HAVEN,
          minCards: 0,
          maxCards: player.cardsInHand.length,
          clientOptions: {
            cardsToDiscard: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.DISCARD_CARDS) {
        const cardsToDiscard = gameInput.clientOptions.cardsToDiscard;

        if (!cardsToDiscard) {
          throw new Error("invalid list of cards to discard");
        }

        // remove cards from hand + put them on the discard pile
        cardsToDiscard.forEach((cardName) => {
          player.removeCardFromHand(cardName);
          gameState.discardPile.addToStack(cardName);
        });

        // ask player which resources they want to get
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.DISCARD_CARDS,
          locationContext: LocationName.HAVEN,
          minResources: Math.floor(cardsToDiscard.length / 2),
          maxResources: Math.floor(cardsToDiscard.length / 2),
          clientOptions: {
            resources: {},
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        const resources = gameInput.clientOptions.resources;

        const numResources = sumResources(resources);

        if (numResources > gameInput.maxResources) {
          throw new Error("Can only gain 1 resource per 2 cards discarded");
        } else if (numResources !== gameInput.maxResources) {
          throw new Error(`Must gain ${gameInput.maxResources} resource`);
        }

        player.gainResources(resources);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [LocationName.JOURNEY_FIVE]: new Location({
    name: LocationName.JOURNEY_FIVE,
    shortName: strToGameText("Journey 5"),
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    description: strToGameText("Discard 5 CARD"),
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_FIVE, 5),
    canPlayCheckInner: canPlayCheckInnerJourneyFactory(5),
  }),
  [LocationName.JOURNEY_FOUR]: new Location({
    name: LocationName.JOURNEY_FOUR,
    shortName: strToGameText("Journey 4"),
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    description: strToGameText("Discard 4 CARD"),
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_FOUR, 4),
    canPlayCheckInner: canPlayCheckInnerJourneyFactory(4),
  }),
  [LocationName.JOURNEY_THREE]: new Location({
    name: LocationName.JOURNEY_THREE,
    shortName: strToGameText("Journey 3"),
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    description: strToGameText("Discard 3 CARD"),
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_THREE, 3),
    canPlayCheckInner: canPlayCheckInnerJourneyFactory(3),
  }),
  [LocationName.JOURNEY_TWO]: new Location({
    name: LocationName.JOURNEY_TWO,
    shortName: strToGameText("Journey 2"),
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.UNLIMITED,
    description: strToGameText("Discard 2 CARD"),
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_TWO, 2),
    canPlayCheckInner: canPlayCheckInnerJourneyFactory(2),
  }),
  [LocationName.BASIC_ONE_BERRY]: new Location({
    name: LocationName.BASIC_ONE_BERRY,
    shortName: strToGameText("BERRY"),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      [ResourceType.BERRY]: 1,
    },
  }),
  [LocationName.BASIC_ONE_BERRY_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_BERRY_AND_ONE_CARD,
    shortName: strToGameText(["BERRY", "CARD"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.BERRY]: 1,
      CARD: 1,
    },
  }),
  [LocationName.BASIC_ONE_RESIN_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_RESIN_AND_ONE_CARD,
    shortName: strToGameText(["RESIN", "CARD"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      [ResourceType.RESIN]: 1,
      CARD: 1,
    },
  }),
  [LocationName.BASIC_ONE_STONE]: new Location({
    name: LocationName.BASIC_ONE_STONE,
    shortName: strToGameText(["PEBBLE"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.PEBBLE]: 1,
    },
  }),
  [LocationName.BASIC_THREE_TWIGS]: new Location({
    name: LocationName.BASIC_THREE_TWIGS,
    shortName: strToGameText(["TWIG", "TWIG", "TWIG"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.TWIG]: 3,
    },
  }),
  [LocationName.BASIC_TWO_CARDS_AND_ONE_VP]: new Location({
    name: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    shortName: strToGameText(["CARD", "CARD", "VP"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      CARD: 2,
      [ResourceType.VP]: 1,
    },
  }),
  [LocationName.BASIC_TWO_RESIN]: new Location({
    name: LocationName.BASIC_TWO_RESIN,
    shortName: strToGameText(["RESIN", "RESIN"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.RESIN]: 2,
    },
  }),
  [LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD,
    shortName: strToGameText(["TWIG", "TWIG", "CARD"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      [ResourceType.TWIG]: 2,
      CARD: 1,
    },
  }),
  [LocationName.FOREST_TWO_BERRY_ONE_CARD]: new Location({
    name: LocationName.FOREST_TWO_BERRY_ONE_CARD,
    shortName: strToGameText(["BERRY", "BERRY", "CARD"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.BERRY]: 2,
      CARD: 1,
    },
  }),
  [LocationName.FOREST_TWO_WILD]: new Location({
    name: LocationName.FOREST_TWO_WILD,
    shortName: strToGameText(["ANY", "ANY"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    description: strToGameText("ANY ANY"),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        // ask the player what resources they want to gain
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_TWO_WILD,
          maxResources: 2,
          minResources: 2,
          clientOptions: {
            resources: {},
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        const resources = gameInput.clientOptions.resources;
        if (!resources) {
          throw new Error("invalid input");
        }
        // count total number of resources
        const numResources = sumResources(resources);
        if (numResources > 2) {
          throw new Error("Can't gain more than 2 resources");
        } else if (numResources !== 2) {
          throw new Error("Need to gain 2 resources");
        }
        // Gain requested resources
        player.gainResources(resources);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  // discard any number of cards and then draw 2 cards per card discarded
  [LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD]: new Location({
    name: LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD,
    shortName: strToGameText(["-X CARD, +2X CARD"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    description: strToGameText(
      "Discard any, then draw 2 for every CARD discarded."
    ),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        if (player.cardsInHand.length < 1) {
          throw new Error("must have cards to discard");
        }

        // ask player how many cards to discard
        gameState.pendingGameInputs.push({
          inputType: GameInputType.DISCARD_CARDS,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext:
            LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD,
          minCards: 0,
          maxCards: 8,
          clientOptions: {
            cardsToDiscard: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.DISCARD_CARDS) {
        const cardsToDiscard = gameInput.clientOptions.cardsToDiscard;

        if (!cardsToDiscard) {
          throw new Error("invalid list of cards to discard");
        }

        // discard the cards
        cardsToDiscard.forEach((cardName) => {
          player.removeCardFromHand(cardName);
        });

        // draw 2 cards per card discarded
        player.drawCards(gameState, cardsToDiscard.length * 2);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  // copy one basic location and draw one card
  [LocationName.FOREST_COPY_BASIC_ONE_CARD]: new Location({
    name: LocationName.FOREST_COPY_BASIC_ONE_CARD,
    shortName: strToGameText(["Copy 1 Basic Location & CARD"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    description: strToGameText("Copy any Basic location and draw 1 CARD"),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        player.drawCards(gameState, 1);

        // ask player which location they want to copy
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_COPY_BASIC_ONE_CARD,
          locationOptions: Location.byType(LocationType.BASIC),
          clientOptions: {
            selectedLocation: null,
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_LOCATION) {
        const selectedLocation = gameInput.clientOptions.selectedLocation;

        if (!selectedLocation) {
          throw new Error("Invalid location selected");
        }

        const location = Location.fromName(selectedLocation);

        if (location.type !== LocationType.BASIC) {
          throw new Error("can only copy a basic location");
        }

        location.play(gameState, gameInput);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [LocationName.FOREST_ONE_PEBBLE_THREE_CARD]: new Location({
    name: LocationName.FOREST_ONE_PEBBLE_THREE_CARD,
    shortName: strToGameText(["PEBBLE", "CARD", "CARD", "CARD"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.PEBBLE]: 1,
      CARD: 3,
    },
  }),
  [LocationName.FOREST_ONE_TWIG_RESIN_BERRY]: new Location({
    name: LocationName.FOREST_ONE_TWIG_RESIN_BERRY,
    shortName: strToGameText(["TWIG", "RESIN", "BERRY"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.TWIG]: 1,
      [ResourceType.RESIN]: 1,
      [ResourceType.BERRY]: 1,
    },
  }),
  [LocationName.FOREST_THREE_BERRY]: new Location({
    name: LocationName.FOREST_THREE_BERRY,
    shortName: strToGameText(["BERRY", "BERRY", "BERRY"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.BERRY]: 3,
    },
  }),
  [LocationName.FOREST_TWO_RESIN_ONE_TWIG]: new Location({
    name: LocationName.FOREST_TWO_RESIN_ONE_TWIG,
    shortName: strToGameText(["RESIN", "RESIN", "TWIG"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.RESIN]: 2,
      [ResourceType.TWIG]: 1,
    },
  }),
  [LocationName.FOREST_TWO_CARDS_ONE_WILD]: new Location({
    name: LocationName.FOREST_TWO_CARDS_ONE_WILD,
    shortName: strToGameText(["CARD", "CARD", "ANY"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    description: strToGameText("CARD CARD ANY"),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        player.drawCards(gameState, 2);

        // ask the player what resource they want to gain
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_TWO_CARDS_ONE_WILD,
          maxResources: 1,
          minResources: 1,
          clientOptions: {
            resources: {},
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        const resources = gameInput.clientOptions.resources;
        if (!resources) {
          throw new Error("invalid input");
        }
        const numResources = sumResources(resources);
        if (numResources > 1) {
          throw new Error("Can't gain more than 1 resource");
        } else if (numResources !== 1) {
          throw new Error("Must gain 1 resource");
        }
        player.gainResources(resources);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD]: new Location(
    {
      name: LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
      shortName: strToGameText(["-3 CARD, +3 ANY"]),
      type: LocationType.FOREST,
      occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
      description: strToGameText(
        "Discard up to 3 CARD & gain 1 ANY for each CARD."
      ),
      playInner: (gameState: GameState, gameInput: GameInput) => {
        const player = gameState.getActivePlayer();
        if (gameInput.inputType === GameInputType.PLACE_WORKER) {
          if (player.cardsInHand.length < 1) {
            throw new Error("must have cards to discard");
          }

          // ask player how many cards to discard
          gameState.pendingGameInputs.push({
            inputType: GameInputType.DISCARD_CARDS,
            prevInputType: GameInputType.PLACE_WORKER,
            locationContext:
              LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
            minCards: 0,
            maxCards: 3,
            clientOptions: {
              cardsToDiscard: [],
            },
          });
        } else if (gameInput.inputType === GameInputType.DISCARD_CARDS) {
          const cardsToDiscard = gameInput.clientOptions.cardsToDiscard;

          if (!cardsToDiscard) {
            throw new Error("invalid list of cards to discard");
          }

          // ask the player what resource they want to gain
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_RESOURCES,
            prevInputType: GameInputType.DISCARD_CARDS,
            locationContext:
              LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
            maxResources: cardsToDiscard.length,
            minResources: 0,
            clientOptions: {
              resources: {},
            },
          });

          // discard the cards
          cardsToDiscard.forEach((cardName) => {
            player.removeCardFromHand(cardName);
          });
        } else if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
          const resources = gameInput.clientOptions.resources;
          if (!resources) {
            throw new Error("invalid input");
          }

          const numResources = sumResources(resources);
          if (numResources > gameInput.maxResources) {
            throw new Error(
              "Can't gain more resources than the number of cards discarded"
            );
          } else if (numResources !== gameInput.maxResources) {
            throw new Error(`Must gain ${gameInput.maxResources} resources`);
          }

          player.gainResources(resources);
        } else {
          throw new Error(`Invalid input type ${gameInput.inputType}`);
        }
      },
    }
  ),
  [LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS]: new Location({
    name: LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
    shortName: strToGameText("Draw 2 Meadow CARD and play 1 for -1 ANY."),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    description: strToGameText("Draw 2 Meadow CARD and play 1 for -1 ANY."),
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
};

export const initialLocationsMap = (
  numPlayers: number
): LocationNameToPlayerIds => {
  const forestLocations = shuffle(Location.byType(LocationType.FOREST));

  if (forestLocations.length < 4 || forestLocations.length < 3) {
    throw new Error("Not enough Special Events available");
  }
  const forestLocationsToPlay = forestLocations.slice(
    0,
    numPlayers == 2 ? 3 : 4
  );

  const ret: LocationNameToPlayerIds = {};
  [
    ...Location.byType(LocationType.BASIC),
    ...forestLocationsToPlay,
    ...Location.byType(LocationType.HAVEN),
    ...Location.byType(LocationType.JOURNEY),
  ].forEach((ty) => {
    ret[ty] = [];
  });
  return ret;
};

/**
 * Helpers
 */
function playInnerJourneyFactory(
  location: LocationName,
  numPoints: number
): GameStatePlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    if (gameInput.inputType === GameInputType.PLACE_WORKER) {
      gameState.pendingGameInputs.push({
        inputType: GameInputType.DISCARD_CARDS,
        prevInputType: GameInputType.PLACE_WORKER,
        locationContext: location,
        minCards: numPoints,
        maxCards: numPoints,
        clientOptions: {
          cardsToDiscard: [],
        },
      });
    } else if (gameInput.inputType === GameInputType.DISCARD_CARDS) {
      const cardsToDiscard = gameInput.clientOptions?.cardsToDiscard;
      if (!cardsToDiscard) {
        throw new Error("invalid input");
      }
      if (cardsToDiscard.length !== numPoints) {
        throw new Error("Discarded incorrect number of cards");
      }
      const player = gameState.getActivePlayer();
      cardsToDiscard.forEach((card: CardName) => {
        player.removeCardFromHand(card);
        gameState.discardPile.addToStack(card);
      });
      player.gainResources({
        [ResourceType.VP]: numPoints,
      });
    } else {
      throw new Error(`Invalid inputType: ${gameInput.inputType}`);
    }
  };
}

function canPlayCheckInnerJourneyFactory(
  numPoints: number
): GameStateCanPlayCheckFn {
  return (gameState: GameState, gameInput: GameInput): string | null => {
    const player = gameState.getActivePlayer();
    if (player.currentSeason !== Season.AUTUMN) {
      return `Cannot visit the Journey in ${player.currentSeason}`;
    }
    if (player.cardsInHand.length < numPoints) {
      return `Not enough cards to discard for the Journey.\n cardsInHand: ${JSON.stringify(
        player.cardsInHand,
        null,
        2
      )}, Required: ${numPoints}`;
    }
    return null;
  };
}
