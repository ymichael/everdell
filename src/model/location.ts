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
  CardCost,
} from "./types";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayFn,
} from "./gameState";
import shuffle from "lodash/shuffle";

export class Location implements GameStatePlayable {
  readonly name: LocationName;
  readonly type: LocationType;
  readonly resourcesToGain: ProductionResourceMap;
  readonly occupancy: LocationOccupancy;
  readonly playInner: GameStatePlayFn | undefined;
  readonly canPlayInner: GameStateCanPlayFn | undefined;

  constructor({
    name,
    type,
    occupancy,
    resourcesToGain,
    playInner,
    canPlayInner,
  }: {
    name: LocationName;
    type: LocationType;
    occupancy: LocationOccupancy;
    playInner?: GameStatePlayFn;
    resourcesToGain?: ProductionResourceMap;
    canPlayInner?: GameStateCanPlayFn;
  }) {
    this.name = name;
    this.type = type;
    this.occupancy = occupancy;
    this.playInner = playInner;
    this.canPlayInner = canPlayInner;
    this.resourcesToGain = resourcesToGain || {};
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    if (!(this.name in gameState.locationsMap)) {
      return false;
    }
    if (gameInput.inputType === GameInputType.PLACE_WORKER) {
      if (gameState.getActivePlayer().numAvailableWorkers <= 0) {
        return false;
      }
      if (this.occupancy === LocationOccupancy.EXCLUSIVE) {
        if (gameState.locationsMap[this.name]!.length !== 0) {
          return false;
        }
      } else if (this.occupancy === LocationOccupancy.EXCLUSIVE_FOUR) {
        if (
          !(
            gameState.locationsMap[this.name]!.length <
            (gameState.players.length < 4 ? 1 : 2)
          )
        ) {
          return false;
        }
      } else if (this.occupancy === LocationOccupancy.UNLIMITED) {
        // Do nothing
      } else {
        throw new Error(`Unexpected occupancy: ${this.occupancy}`);
      }
    }
    if (this.canPlayInner && !this.canPlayInner(gameState, gameInput)) {
      return false;
    }
    return true;
  }

  play(gameState: GameState, gameInput: GameInput): void {
    if (!this.canPlay(gameState, gameInput)) {
      throw new Error(`Unable to visit location ${this.name}`);
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
    type: LocationType.HAVEN,
    occupancy: LocationOccupancy.UNLIMITED,
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
        // ask player how many cards to discard
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.DISCARD_CARDS,
          locationContext: LocationName.HAVEN,
          minResources: 0,
          maxResources: cardsToDiscard.length / 2,
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

        const numResources =
          (resources[ResourceType.BERRY] || 0) +
          (resources[ResourceType.TWIG] || 0) +
          (resources[ResourceType.RESIN] || 0) +
          (resources[ResourceType.PEBBLE] || 0);

        if (numResources > gameInput.maxResources) {
          throw new Error("Can only gain 1 resource per 2 cards discarded");
        }

        // gain requested resources
        player.gainResources(resources);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [LocationName.JOURNEY_FIVE]: new Location({
    name: LocationName.JOURNEY_FIVE,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_FIVE, 5),
    canPlayInner: canPlayInnerJourneyFactory(5),
  }),
  [LocationName.JOURNEY_FOUR]: new Location({
    name: LocationName.JOURNEY_FOUR,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_FOUR, 4),
    canPlayInner: canPlayInnerJourneyFactory(4),
  }),
  [LocationName.JOURNEY_THREE]: new Location({
    name: LocationName.JOURNEY_THREE,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_THREE, 3),
    canPlayInner: canPlayInnerJourneyFactory(3),
  }),
  [LocationName.JOURNEY_TWO]: new Location({
    name: LocationName.JOURNEY_TWO,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.UNLIMITED,
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_TWO, 2),
    canPlayInner: canPlayInnerJourneyFactory(2),
  }),
  [LocationName.BASIC_ONE_BERRY]: new Location({
    name: LocationName.BASIC_ONE_BERRY,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      [ResourceType.BERRY]: 1,
    },
  }),
  [LocationName.BASIC_ONE_BERRY_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_BERRY_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.BERRY]: 1,
      CARD: 1,
    },
  }),
  [LocationName.BASIC_ONE_RESIN_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_RESIN_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      [ResourceType.RESIN]: 1,
      CARD: 1,
    },
  }),
  [LocationName.BASIC_ONE_STONE]: new Location({
    name: LocationName.BASIC_ONE_STONE,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.PEBBLE]: 1,
    },
  }),
  [LocationName.BASIC_THREE_TWIGS]: new Location({
    name: LocationName.BASIC_THREE_TWIGS,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.TWIG]: 3,
    },
  }),
  [LocationName.BASIC_TWO_CARDS_AND_ONE_VP]: new Location({
    name: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      CARD: 2,
      [ResourceType.VP]: 1,
    },
  }),
  [LocationName.BASIC_TWO_RESIN]: new Location({
    name: LocationName.BASIC_TWO_RESIN,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.RESIN]: 2,
    },
  }),
  [LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      [ResourceType.TWIG]: 2,
      CARD: 1,
    },
  }),
  [LocationName.FOREST_TWO_BERRY_ONE_CARD]: new Location({
    name: LocationName.FOREST_TWO_BERRY_ONE_CARD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.BERRY]: 2,
      CARD: 1,
    },
  }),
  [LocationName.FOREST_TWO_WILD]: new Location({
    name: LocationName.FOREST_TWO_WILD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        // ask the player what resources they want to gain
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_TWO_WILD,
          maxResources: 2,
          minResources: 0,
          clientOptions: {
            resources: {},
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        // check to make sure they're not gaining more than 2
        // have player gain resource

        const resources = gameInput.clientOptions.resources;
        if (!resources) {
          throw new Error("invalid input");
        }
        // count total number of resources

        const numResources =
          (resources[ResourceType.BERRY] || 0) +
          (resources[ResourceType.TWIG] || 0) +
          (resources[ResourceType.RESIN] || 0) +
          (resources[ResourceType.PEBBLE] || 0);

        if (numResources > 2) {
          throw new Error("Can't gain more than 2 resources");
        }

        // gain requested resources
        player.gainResources(resources);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  // discard any number of cards and then draw 2 cards per card discarded
  [LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD]: new Location({
    name: LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
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
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
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
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.PEBBLE]: 1,
      CARD: 3,
    },
  }),
  [LocationName.FOREST_ONE_TWIG_RESIN_BERRY]: new Location({
    name: LocationName.FOREST_ONE_TWIG_RESIN_BERRY,
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
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.BERRY]: 3,
    },
  }),
  [LocationName.FOREST_TWO_RESIN_ONE_TWIG]: new Location({
    name: LocationName.FOREST_TWO_RESIN_ONE_TWIG,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.RESIN]: 2,
      [ResourceType.TWIG]: 1,
    },
  }),
  [LocationName.FOREST_TWO_CARDS_ONE_WILD]: new Location({
    name: LocationName.FOREST_TWO_CARDS_ONE_WILD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
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
          minResources: 0,
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
        const numResources =
          (resources[ResourceType.BERRY] || 0) +
          (resources[ResourceType.TWIG] || 0) +
          (resources[ResourceType.RESIN] || 0) +
          (resources[ResourceType.PEBBLE] || 0);

        if (numResources > 1) {
          throw new Error("Can't gain more than 1 resource");
        }

        // gain requested resources
        player.gainResources(resources);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD]: new Location(
    {
      name: LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
      type: LocationType.FOREST,
      occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
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

          // count total number of resources
          const numResources =
            (resources[ResourceType.BERRY] || 0) +
            (resources[ResourceType.TWIG] || 0) +
            (resources[ResourceType.RESIN] || 0) +
            (resources[ResourceType.PEBBLE] || 0);

          if (numResources > gameInput.maxResources) {
            throw new Error(
              "Can't gain more resources than the number of cards discarded"
            );
          }

          // gain requested resources
          player.gainResources(resources);
        } else {
          throw new Error(`Invalid input type ${gameInput.inputType}`);
        }
      },
    }
  ),
  [LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS]: new Location({
    name: LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
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

function canPlayInnerJourneyFactory(numPoints: number): GameStateCanPlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    if (player.currentSeason !== Season.AUTUMN) {
      return false;
    }
    if (player.cardsInHand.length < numPoints) {
      return false;
    }
    return true;
  };
}
