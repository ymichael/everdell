import { Card } from "./card";
import {
  GameOptions,
  CardName,
  ExpansionType,
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
  TextPartEntity,
  IGameTextEntity,
} from "./types";
import { sumResources } from "./gameStatePlayHelpers";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayCheckFn,
} from "./gameState";
import shuffle from "lodash/shuffle";
import {
  toGameText,
  resourceMapToGameText,
  cardListToGameText,
} from "./gameText";
import { assertUnreachable } from "../utils";

export class Location implements GameStatePlayable, IGameTextEntity {
  readonly name: LocationName;
  readonly shortName: GameText;
  readonly type: LocationType;
  readonly expansion: ExpansionType | null;
  readonly description: GameText | undefined;
  readonly resourcesToGain: ProductionResourceMap;
  readonly occupancy: LocationOccupancy;
  readonly playInner: GameStatePlayFn | undefined;
  readonly canPlayCheckInner: GameStateCanPlayCheckFn | undefined;
  private baseVP: number;

  constructor({
    name,
    type,
    occupancy,
    shortName,
    description,
    resourcesToGain,
    playInner,
    canPlayCheckInner,
    baseVP = 0,
    expansion = null,
  }: {
    name: LocationName;
    type: LocationType;
    occupancy: LocationOccupancy;
    expansion?: ExpansionType | null;
    shortName: GameText;
    playInner?: GameStatePlayFn;
    resourcesToGain?: ProductionResourceMap;
    canPlayCheckInner?: GameStateCanPlayCheckFn;
    description?: GameText | undefined;
    baseVP?: number;
  }) {
    this.name = name;
    this.type = type;
    this.expansion = expansion;
    this.occupancy = occupancy;
    this.playInner = playInner;
    this.canPlayCheckInner = canPlayCheckInner;
    this.resourcesToGain = resourcesToGain || {};
    this.description = description;
    this.shortName = shortName;
    this.baseVP = baseVP;
  }

  getGameTextPart(): TextPartEntity {
    return {
      type: "entity",
      entityType: "location",
      location: this.name,
    };
  }

  getPoints(gameState: GameState, playerId: string): number {
    return this.baseVP;
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    if (gameInput.inputType === GameInputType.PLACE_WORKER) {
      const canPlaceWorkerCheckErr = this.canPlaceWorkerCheck(
        gameState,
        gameInput
      );
      if (canPlaceWorkerCheckErr) {
        return false;
      }
    }
    return !this.canPlayCheck(gameState, gameInput);
  }

  canPlaceWorkerCheck(
    gameState: GameState,
    gameInput: GameInput
  ): string | null {
    const player = gameState.getActivePlayer();
    if (player.numAvailableWorkers <= 0) {
      return `Active player (${player.name}) doesn't have any workers to place.`;
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
    return null;
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
    this.triggerLocation(gameState, gameInput);
  }

  triggerLocation(
    gameState: GameState,
    gameInput: GameInput = {
      inputType: GameInputType.PLACE_WORKER,
      clientOptions: {
        location: this.name,
      },
    }
  ): void {
    if (this.playInner) {
      if (this.canPlayCheckInner) {
        const errorMsg = this.canPlayCheckInner(gameState, gameInput);
        if (errorMsg) {
          throw new Error(errorMsg);
        }
      }
      this.playInner(gameState, gameInput);
    }
    if (this.resourcesToGain && sumResources(this.resourcesToGain)) {
      const player = gameState.getActivePlayer();
      player.gainResources(this.resourcesToGain);
      if (this.resourcesToGain.CARD) {
        player.drawCards(gameState, this.resourcesToGain.CARD);
      }
      // TODO: commenting out because this is quite noisy.
      // if (sumResources(this.resourcesToGain) === this.resourcesToGain.CARD) {
      //   gameState.addGameLogFromLocation(this.name, [
      //     player,
      //     ` drew ${this.resourcesToGain.CARD} CARD.`,
      //   ]);
      // } else {
      //   gameState.addGameLogFromLocation(this.name, [
      //     player,
      //     " gained ",
      //     ...resourceMapToGameText(this.resourcesToGain),
      //     ".",
      //   ]);
      // }
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
    shortName: toGameText("Haven"),
    type: LocationType.HAVEN,
    occupancy: LocationOccupancy.UNLIMITED,
    description: toGameText([
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

        const numDiscarded = cardsToDiscard.length;

        // ask player which resources they want to get
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          label: `Gain ${Math.floor(numDiscarded / 2)} ANY`,
          toSpend: false,
          prevInputType: GameInputType.DISCARD_CARDS,
          locationContext: LocationName.HAVEN,
          minResources: Math.floor(numDiscarded / 2),
          maxResources: Math.floor(numDiscarded / 2),
          clientOptions: {
            resources: {},
          },
        });

        gameState.addGameLogFromLocation(LocationName.HAVEN, [
          player,
          ` discarded ${numDiscarded} CARD.`,
        ]);
      } else if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        const resources = gameInput.clientOptions.resources;

        const numResources = sumResources(resources);

        if (numResources > gameInput.maxResources) {
          throw new Error("Can only gain 1 resource per 2 cards discarded");
        } else if (numResources !== gameInput.maxResources) {
          throw new Error(`Must gain ${gameInput.maxResources} resource`);
        }

        player.gainResources(resources);
        gameState.addGameLogFromLocation(LocationName.HAVEN, [
          player,
          " gained ",
          ...resourceMapToGameText(resources),
          ".",
        ]);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [LocationName.JOURNEY_FIVE]: new Location({
    name: LocationName.JOURNEY_FIVE,
    shortName: toGameText("Journey 5"),
    baseVP: 5,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    description: toGameText("Discard 5 CARD"),
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_FIVE, 5),
    canPlayCheckInner: canPlayCheckInnerJourneyFactory(5),
  }),
  [LocationName.JOURNEY_FOUR]: new Location({
    name: LocationName.JOURNEY_FOUR,
    shortName: toGameText("Journey 4"),
    baseVP: 4,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    description: toGameText("Discard 4 CARD"),
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_FOUR, 4),
    canPlayCheckInner: canPlayCheckInnerJourneyFactory(4),
  }),
  [LocationName.JOURNEY_THREE]: new Location({
    name: LocationName.JOURNEY_THREE,
    shortName: toGameText("Journey 3"),
    baseVP: 3,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    description: toGameText("Discard 3 CARD"),
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_THREE, 3),
    canPlayCheckInner: canPlayCheckInnerJourneyFactory(3),
  }),
  [LocationName.JOURNEY_TWO]: new Location({
    name: LocationName.JOURNEY_TWO,
    shortName: toGameText("Journey 2"),
    baseVP: 2,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.UNLIMITED,
    description: toGameText("Discard 2 CARD"),
    playInner: playInnerJourneyFactory(LocationName.JOURNEY_TWO, 2),
    canPlayCheckInner: canPlayCheckInnerJourneyFactory(2),
  }),
  [LocationName.BASIC_ONE_BERRY]: new Location({
    name: LocationName.BASIC_ONE_BERRY,
    shortName: toGameText("BERRY"),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      [ResourceType.BERRY]: 1,
    },
  }),
  [LocationName.BASIC_ONE_BERRY_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_BERRY_AND_ONE_CARD,
    shortName: toGameText(["BERRY", "CARD"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.BERRY]: 1,
      CARD: 1,
    },
  }),
  [LocationName.BASIC_ONE_RESIN_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_RESIN_AND_ONE_CARD,
    shortName: toGameText(["RESIN", "CARD"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      [ResourceType.RESIN]: 1,
      CARD: 1,
    },
  }),
  [LocationName.BASIC_ONE_STONE]: new Location({
    name: LocationName.BASIC_ONE_STONE,
    shortName: toGameText(["PEBBLE"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.PEBBLE]: 1,
    },
  }),
  [LocationName.BASIC_THREE_TWIGS]: new Location({
    name: LocationName.BASIC_THREE_TWIGS,
    shortName: toGameText(["TWIG", "TWIG", "TWIG"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.TWIG]: 3,
    },
  }),
  [LocationName.BASIC_TWO_CARDS_AND_ONE_VP]: new Location({
    name: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    shortName: toGameText(["CARD", "CARD", "VP"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      CARD: 2,
      [ResourceType.VP]: 1,
    },
  }),
  [LocationName.BASIC_TWO_RESIN]: new Location({
    name: LocationName.BASIC_TWO_RESIN,
    shortName: toGameText(["RESIN", "RESIN"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    resourcesToGain: {
      [ResourceType.RESIN]: 2,
    },
  }),
  [LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD,
    shortName: toGameText(["TWIG", "TWIG", "CARD"]),
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    resourcesToGain: {
      [ResourceType.TWIG]: 2,
      CARD: 1,
    },
  }),
  [LocationName.FOREST_TWO_BERRY_ONE_CARD]: new Location({
    name: LocationName.FOREST_TWO_BERRY_ONE_CARD,
    shortName: toGameText(["BERRY", "BERRY", "CARD"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.BERRY]: 2,
      CARD: 1,
    },
  }),
  [LocationName.FOREST_TWO_WILD]: new Location({
    name: LocationName.FOREST_TWO_WILD,
    shortName: toGameText(["ANY", "ANY"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    description: toGameText("ANY ANY"),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        // ask the player what resources they want to gain
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          label: "Gain 2 ANY",
          toSpend: false,
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
        gameState.addGameLogFromLocation(LocationName.FOREST_TWO_WILD, [
          player,
          " gained ",
          ...resourceMapToGameText(resources),
          ".",
        ]);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  // discard any number of cards and then draw 2 cards per card discarded
  [LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD]: new Location({
    name: LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD,
    shortName: toGameText(["-X CARD, +2X CARD"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    description: toGameText(
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
          label: "Select CARD to discard",
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

        gameState.addGameLogFromLocation(
          LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD,
          [
            player,
            ` discarded ${cardsToDiscard.length} CARD and drew ${
              cardsToDiscard.length * 2
            } CARD.`,
          ]
        );
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  // copy one basic location and draw one card
  [LocationName.FOREST_COPY_BASIC_ONE_CARD]: new Location({
    name: LocationName.FOREST_COPY_BASIC_ONE_CARD,
    shortName: toGameText(["Copy 1 Basic Location & CARD"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    description: toGameText("Copy any Basic location and draw 1 CARD"),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        player.drawCards(gameState, 1);

        // Ask player which location they want to copy
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: GameInputType.PLACE_WORKER,
          label: "Select basic location to copy",
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

        gameState.addGameLogFromLocation(
          LocationName.FOREST_COPY_BASIC_ONE_CARD,
          [player, " copied ", location, "."]
        );

        location.triggerLocation(gameState);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [LocationName.FOREST_ONE_PEBBLE_THREE_CARD]: new Location({
    name: LocationName.FOREST_ONE_PEBBLE_THREE_CARD,
    shortName: toGameText(["PEBBLE", "CARD", "CARD", "CARD"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.PEBBLE]: 1,
      CARD: 3,
    },
  }),
  [LocationName.FOREST_ONE_TWIG_RESIN_BERRY]: new Location({
    name: LocationName.FOREST_ONE_TWIG_RESIN_BERRY,
    shortName: toGameText(["TWIG", "RESIN", "BERRY"]),
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
    shortName: toGameText(["BERRY", "BERRY", "BERRY"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.BERRY]: 3,
    },
  }),
  [LocationName.FOREST_TWO_RESIN_ONE_TWIG]: new Location({
    name: LocationName.FOREST_TWO_RESIN_ONE_TWIG,
    shortName: toGameText(["RESIN", "RESIN", "TWIG"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    resourcesToGain: {
      [ResourceType.RESIN]: 2,
      [ResourceType.TWIG]: 1,
    },
  }),
  [LocationName.FOREST_TWO_CARDS_ONE_WILD]: new Location({
    name: LocationName.FOREST_TWO_CARDS_ONE_WILD,
    shortName: toGameText(["CARD", "CARD", "ANY"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    description: toGameText("CARD CARD ANY"),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        player.drawCards(gameState, 2);

        gameState.addGameLogFromLocation(
          LocationName.FOREST_TWO_CARDS_ONE_WILD,
          [player, " drew 2 CARD."]
        );

        // ask the player what resource they want to gain
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          label: "Gain 1 ANY",
          toSpend: false,
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
        gameState.addGameLogFromLocation(
          LocationName.FOREST_TWO_CARDS_ONE_WILD,
          [player, " gained ", ...resourceMapToGameText(resources), "."]
        );
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD]: new Location(
    {
      name: LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
      shortName: toGameText(["-3 CARD +3 ANY"]),
      type: LocationType.FOREST,
      occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
      description: toGameText(
        "Discard up to 3 CARD & gain 1 ANY for each CARD."
      ),
      playInner: (gameState: GameState, gameInput: GameInput) => {
        const player = gameState.getActivePlayer();
        if (gameInput.inputType === GameInputType.PLACE_WORKER) {
          if (player.cardsInHand.length < 1) {
            throw new Error("Must have cards to discard");
          }

          // ask player how many cards to discard
          gameState.pendingGameInputs.push({
            inputType: GameInputType.DISCARD_CARDS,
            prevInputType: GameInputType.PLACE_WORKER,
            label: "Discard up to 3 CARD & gain 1 ANY for each CARD",
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
            throw new Error("Invalid list of cards to discard");
          }

          // ask the player what resource they want to gain
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_RESOURCES,
            toSpend: false,
            label: `Gain ${cardsToDiscard.length} ANY`,
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

          gameState.addGameLogFromLocation(
            LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
            [player, ` discarded ${cardsToDiscard.length} CARD.`]
          );
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
          gameState.addGameLogFromLocation(
            LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
            [player, " gained ", ...resourceMapToGameText(resources), "."]
          );
        } else {
          throw new Error(`Invalid input type ${gameInput.inputType}`);
        }
      },
    }
  ),
  [LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS]: new Location({
    name: LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
    shortName: toGameText("Draw 2 Meadow CARD and play 1 for -1 ANY"),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    description: toGameText("Draw 2 Meadow CARD and play 1 for -1 ANY."),
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.PLACE_WORKER) {
        return null;
      }
      const player = gameState.getActivePlayer();

      const hasPlayableCard = gameState.meadowCards.some((cardName) => {
        return (
          player.canAffordCard(cardName, false, "ANY 1") &&
          player.canAddToCity(
            cardName,
            true /* strict because we won't use other card effects */
          )
        );
      });
      if (!hasPlayableCard) {
        return `Cannot play any meadow cards even after discounts`;
      }
      return null;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          label: "Draw 2 CARD from the Meadow",
          cardOptions: gameState.meadowCards,
          maxToSelect: 2,
          minToSelect: 2,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.prevInputType === GameInputType.PLACE_WORKER
      ) {
        const cardOptions = gameInput.clientOptions.selectedCards;
        if (!cardOptions) {
          throw new Error("Invalid list of cards chosen from meadow provided.");
        }

        if (cardOptions.length != 2) {
          throw new Error("Must choose exactly 2 cards from the meadow");
        }

        const isCardPlayable = (cardName: CardName): boolean => {
          return (
            player.canAffordCard(cardName, false, "ANY 1") &&
            player.canAddToCity(
              cardName,
              true /* strict because we won't use other card effects */
            )
          );
        };

        // Make sure player can play at least one of the chosen cards
        const canPlayAtLeastOne =
          isCardPlayable(cardOptions[0]) || isCardPlayable(cardOptions[1]);

        if (!canPlayAtLeastOne) {
          throw new Error(
            "Must choose at least 1 card that can be played with 1 ANY discount"
          );
        }

        gameState.addGameLogFromLocation(
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          [
            player,
            " took ",
            ...cardListToGameText(cardOptions),
            " from the Meadow.",
          ]
        );

        // add cards to player's hand
        player.addCardToHand(gameState, cardOptions[0]);
        player.addCardToHand(gameState, cardOptions[1]);

        // remove the cards from meadow + replenish
        gameState.removeCardFromMeadow(cardOptions[0]);
        gameState.removeCardFromMeadow(cardOptions[1]);
        gameState.replenishMeadow();

        // player should choose a card to play
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          label: "Select CARD to play for one less ANY",
          cardOptions: cardOptions,
          maxToSelect: 1,
          minToSelect: 1,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.prevInputType === GameInputType.SELECT_CARDS &&
        gameInput.locationContext ===
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ) {
        // make sure they could play card if discounted
        const cardOptions = gameInput.clientOptions.selectedCards;
        if (!cardOptions) {
          throw new Error("Must select card to play.");
        }

        if (cardOptions.length !== 1) {
          throw new Error("Must select exactly 1 card to play");
        }

        const selectedCardName = cardOptions[0];
        const selectedCard = Card.fromName(selectedCardName);
        const canAffordCard = player.canAffordCard(
          selectedCardName,
          false,
          "ANY 1"
        );

        if (!canAffordCard) {
          throw new Error("Cannot afford this card, even with discount.");
        }

        if (sumResources(selectedCard.baseCost) <= 1) {
          gameState.addGameLogFromLocation(
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
            [player, " played ", selectedCard, " for 1 less."]
          );
          player.removeCardFromHand(selectedCardName);
          selectedCard.addToCityAndPlay(gameState, gameInput);
          return;
        }

        // Card cost more than 1, ask player how they're paying:
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PAYMENT_FOR_CARD,
          prevInputType: gameInput.inputType,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          card: selectedCardName,
          clientOptions: {
            card: selectedCardName,
            paymentOptions: { resources: {} },
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_PAYMENT_FOR_CARD &&
        gameInput.prevInputType === GameInputType.SELECT_CARDS &&
        gameInput.locationContext ===
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ) {
        if (!gameInput.clientOptions?.paymentOptions?.resources) {
          throw new Error(
            "Invalid input: clientOptions.paymentOptions.resources missing"
          );
        }

        const card = Card.fromName(gameInput.card);
        const paymentError = player.validatePaidResources(
          gameInput.clientOptions.paymentOptions.resources,
          card.baseCost,
          "ANY 1"
        );
        if (paymentError) {
          throw new Error(paymentError);
        }

        gameState.addGameLogFromLocation(
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          [player, " played ", card, " for 1 less."]
        );

        player.payForCard(gameState, gameInput);
        player.removeCardFromHand(card.name);
        card.addToCityAndPlay(gameState, gameInput);
      } else {
        throw new Error(
          "Unexpected input type ${gameInput.inputType} with previous input type ${gameInput.prevInputType}"
        );
      }
    },
  }),

  [LocationName.FOREST_TWO_PEBBLE_ONE_CARD]: new Location({
    name: LocationName.FOREST_TWO_PEBBLE_ONE_CARD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    shortName: toGameText(["PEBBLE", "PEBBLE", "CARD"]),
    resourcesToGain: {
      [ResourceType.PEBBLE]: 2,
      CARD: 1,
    },
    expansion: ExpansionType.PEARLBROOK,
  }),
  [LocationName.FOREST_RESIN_PEBBLE_OR_FOUR_CARDS]: new Location({
    name: LocationName.FOREST_RESIN_PEBBLE_OR_FOUR_CARDS,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    shortName: toGameText(["RESIN", "PEBBLE or 4 CARD"]),
    description: toGameText(["1 RESIN & 1 PEBBLE or 4 CARD"]),
    resourcesToGain: {},
    expansion: ExpansionType.PEARLBROOK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
  }),
  [LocationName.FOREST_ACTIVATE_2_PRODUCTION]: new Location({
    name: LocationName.FOREST_ACTIVATE_2_PRODUCTION,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    shortName: toGameText("Activate 2 PRODUCTION in your city"),
    resourcesToGain: {},
    expansion: ExpansionType.PEARLBROOK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
  }),
  [LocationName.FOREST_BERRY_PEBBLE_CARD]: new Location({
    name: LocationName.FOREST_BERRY_PEBBLE_CARD,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    shortName: toGameText(["BERRY", "PEBBLE", "CARD"]),
    resourcesToGain: {
      [ResourceType.BERRY]: 1,
      [ResourceType.PEBBLE]: 1,
      CARD: 1,
    },
    expansion: ExpansionType.PEARLBROOK,
  }),
  [LocationName.FOREST_DISCARD_2_MEADOW_DRAW_2_MEADOW_GAIN_ANY]: new Location({
    name: LocationName.FOREST_DISCARD_2_MEADOW_DRAW_2_MEADOW_GAIN_ANY,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    shortName: toGameText(["-2, then +2 Meadow CARD, +1 ANY"]),
    description: toGameText([
      "Discard 2 Meadow cards, replenish, then draw 2 Meadow cards.",
      { type: "BR" },
      "Also gain 1 ANY",
    ]),
    resourcesToGain: {},
    expansion: ExpansionType.PEARLBROOK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
  }),
};

const baseGameForestLocations: LocationName[] = [
  LocationName.FOREST_TWO_BERRY_ONE_CARD,
  LocationName.FOREST_TWO_WILD,
  LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD,
  LocationName.FOREST_COPY_BASIC_ONE_CARD,
  LocationName.FOREST_ONE_PEBBLE_THREE_CARD,
  LocationName.FOREST_ONE_TWIG_RESIN_BERRY,
  LocationName.FOREST_THREE_BERRY,
  LocationName.FOREST_TWO_RESIN_ONE_TWIG,
  LocationName.FOREST_TWO_CARDS_ONE_WILD,
  LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
  LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
];

const pearlbrookForestLocations: LocationName[] = [
  LocationName.FOREST_TWO_PEBBLE_ONE_CARD,
  LocationName.FOREST_RESIN_PEBBLE_OR_FOUR_CARDS,
  LocationName.FOREST_ACTIVATE_2_PRODUCTION,
  LocationName.FOREST_BERRY_PEBBLE_CARD,
  LocationName.FOREST_DISCARD_2_MEADOW_DRAW_2_MEADOW_GAIN_ANY,
];

export const initialLocationsMap = (
  numPlayers: number,
  { pearlbrook }: Pick<GameOptions, "pearlbrook">
): LocationNameToPlayerIds => {
  const forestLocationsToChooseFrom = [...baseGameForestLocations];
  if (pearlbrook) {
    forestLocationsToChooseFrom.push(...pearlbrookForestLocations);
  }
  const forestLocationsToPlay = shuffle(forestLocationsToChooseFrom).slice(
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
        throw new Error("Invalid input");
      }
      if (cardsToDiscard.length !== numPoints) {
        throw new Error("Discarded incorrect number of cards");
      }
      const player = gameState.getActivePlayer();
      cardsToDiscard.forEach((card: CardName) => {
        player.removeCardFromHand(card);
        gameState.discardPile.addToStack(card);
      });
      gameState.addGameLogFromLocation(location, [
        player,
        ` discarded ${numPoints} CARD.`,
      ]);
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
