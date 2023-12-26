import shuffle from "lodash/shuffle";
import isEqual from "lodash/isEqual";
import omit from "lodash/omit";
import {
  CardName,
  CardType,
  ExpansionType,
  GameInput,
  GameInputType,
  GameOptions,
  GameText,
  IGameTextEntity,
  LocationName,
  LocationNameToPlayerIds,
  LocationOccupancy,
  LocationType,
  ProductionResourceMap,
  ResourceType,
  Season,
  TextPartEntity,
} from "./types";
import {
  sumResources,
  GainAnyResource,
  GainMoreThan1AnyResource,
} from "./gameStatePlayHelpers";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayCheckFn,
} from "./gameState";
import { Card } from "./card";
import { TrainCarTile } from "./trainCarTile";
import { Player } from "./player";
import { onlyRelevantProductionCards } from "./cardHelpers";
import { toGameText, cardListToGameText } from "./gameText";
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

  getPoints(player: Player, gameState: GameState): number {
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
    const playerId = player.playerId;
    const workersOnLocation = gameState.locationsMap[this.name];
    if (!workersOnLocation) {
      return `Cannot find location ${this.name} in game`;
    }
    const numPlayers = gameState.players.length;
    switch (this.occupancy) {
      case LocationOccupancy.EXCLUSIVE:
        if (workersOnLocation.length !== 0) {
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
        if (workersOnLocation.length === 0) {
          break;
        }
        if (numPlayers >= 4 && workersOnLocation.length === 1) {
          if (playerId === workersOnLocation[0]) {
            return `Cannot visit the same forest location twice.\nLocation ${
              this.name
            } is occupied. \nGame Locations: ${JSON.stringify(
              gameState.locationsMap,
              null,
              2
            )}`;
          }
          break;
        }
        return `Location ${
          this.name
        } is fully occupied. \nGame Locations: ${JSON.stringify(
          gameState.locationsMap,
          null,
          2
        )}`;
        break;
      case LocationOccupancy.UNLIMITED_MAX_ONE:
        if (workersOnLocation.includes(playerId)) {
          return `Cannot visit the ${this.name} twice.`;
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
    gameInputFromCaller: GameInput | null = null
  ): void {
    const gameInput: GameInput = gameInputFromCaller || {
      inputType: GameInputType.PLACE_WORKER,
      clientOptions: {
        location: this.name,
      },
    };

    if (!gameInputFromCaller) {
      gameState.addPlayedGameInput(gameInput);
    }

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
      player.gainResources(gameState, omit(this.resourcesToGain, ["CARD"]));
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
      const gainAnyHelper = new GainMoreThan1AnyResource({
        locationContext: LocationName.HAVEN,
      });
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        if (player.numCardsInHand < 1) {
          throw new Error("must have cards to discard");
        }

        // ask player how many cards to discard
        gameState.pendingGameInputs.push({
          inputType: GameInputType.DISCARD_CARDS,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.HAVEN,
          minCards: 0,
          maxCards: player.numCardsInHand,
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
          player.removeCardFromHand(gameState, cardName);
        });

        const numDiscarded = cardsToDiscard.length;

        // Ask player which resources they want to get
        gameState.pendingGameInputs.push(
          gainAnyHelper.getGameInput(Math.floor(numDiscarded / 2), {
            prevInputType: GameInputType.DISCARD_CARDS,
          })
        );
        gameState.addGameLogFromLocation(LocationName.HAVEN, [
          player,
          ` discarded ${numDiscarded} CARD.`,
        ]);
      } else if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
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
      const gainAnyHelper = new GainMoreThan1AnyResource({
        locationContext: LocationName.FOREST_TWO_WILD,
      });
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        // ask the player what resources they want to gain
        gameState.pendingGameInputs.push(
          gainAnyHelper.getGameInput(2, {
            prevInputType: GameInputType.PLACE_WORKER,
          })
        );
      } else if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
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
        if (player.numCardsInHand < 1) {
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
          player.removeCardFromHand(gameState, cardName);
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
      const gainAnyHelper = new GainAnyResource({
        locationContext: LocationName.FOREST_TWO_CARDS_ONE_WILD,
      });

      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        player.drawCards(gameState, 2);

        gameState.addGameLogFromLocation(
          LocationName.FOREST_TWO_CARDS_ONE_WILD,
          [player, " drew 2 CARD."]
        );

        // Ask the player what resource they want to gain
        gameState.pendingGameInputs.push(
          gainAnyHelper.getGameInput({
            prevInputType: GameInputType.PLACE_WORKER,
          })
        );
      } else if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
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
        const gainAnyHelper = new GainMoreThan1AnyResource({
          locationContext:
            LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
        });

        if (gameInput.inputType === GameInputType.PLACE_WORKER) {
          if (player.numCardsInHand < 1) {
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

          // Ask the player what resource they want to gain
          gameState.pendingGameInputs.push(
            gainAnyHelper.getGameInput(cardsToDiscard.length, {
              prevInputType: GameInputType.DISCARD_CARDS,
            })
          );

          // Discard the cards
          cardsToDiscard.forEach((cardName) => {
            player.removeCardFromHand(gameState, cardName);
          });

          gameState.addGameLogFromLocation(
            LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
            [
              player,
              ` discarded ${cardsToDiscard.length} CARD to gain ${cardsToDiscard.length} ANY.`,
            ]
          );
        } else if (gainAnyHelper.matchesGameInput(gameInput)) {
          gainAnyHelper.play(gameState, gameInput);
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
        const card = Card.fromName(cardName);
        return (
          player.canAffordCard(cardName, null, "ANY 1") &&
          card.canPlayIgnoreCostAndSource(gameState)
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
          const card = Card.fromName(cardName);
          return (
            player.canAffordCard(cardName, null, "ANY 1") &&
            card.canPlayIgnoreCostAndSource(gameState)
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
            " selected ",
            ...cardListToGameText(cardOptions),
            " from the Meadow.",
          ]
        );

        // Player should choose a card to play
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          prevInput: gameInput,
          label: "Select CARD to play for one less ANY",
          cardOptions: cardOptions.filter((cardName) => {
            const cardOption = Card.fromName(cardName);
            return isCardPlayable(cardOption.name);
          }),
          maxToSelect: 1,
          minToSelect: 1,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          cardOptionsUnfiltered: cardOptions,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.prevInputType === GameInputType.SELECT_CARDS &&
        gameInput.locationContext ===
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS &&
        gameInput.cardOptionsUnfiltered
      ) {
        // make sure they could play card if discounted
        const cardOptions = gameInput.cardOptions;
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (!selectedCards) {
          throw new Error("Must select card to play.");
        }
        if (selectedCards.length !== 1) {
          throw new Error("Must select exactly 1 card to play");
        }
        const selectedCardName = selectedCards[0];
        if (cardOptions.indexOf(selectedCardName) === -1) {
          throw new Error("Please select one of the options");
        }

        const selectedCard = Card.fromName(selectedCardName);
        const canAffordCard = player.canAffordCard(
          selectedCardName,
          null,
          "ANY 1"
        );
        if (!canAffordCard) {
          throw new Error("Cannot afford this card, even with discount.");
        }

        const keptedCardName =
          gameInput.cardOptionsUnfiltered[0] === selectedCardName
            ? gameInput.cardOptionsUnfiltered[1]
            : gameInput.cardOptionsUnfiltered[0];

        // Remove the cards from meadow + replenish
        gameState.removeCardFromMeadow(gameInput.cardOptionsUnfiltered[0]);
        gameState.removeCardFromMeadow(gameInput.cardOptionsUnfiltered[1]);

        // Add kept card to player's hand
        player.addCardToHand(gameState, keptedCardName);

        if (sumResources(selectedCard.baseCost) <= 1) {
          gameState.addGameLogFromLocation(
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
            [player, " played ", selectedCard, " for 1 less."]
          );
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
        card.addToCityAndPlay(gameState, gameInput);
      } else {
        throw new Error(`Unexpected input type ${gameInput.inputType}`);
      }
    },
  }),

  // pearlbrook
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
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: gameInput.inputType,
          locationContext: LocationName.FOREST_RESIN_PEBBLE_OR_FOUR_CARDS,
          label: "Choose one",
          options: ["1 RESIN & 1 PEBBLE", "4 CARD"],
          clientOptions: {
            selectedOption: null,
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
        gameInput.locationContext ===
          LocationName.FOREST_RESIN_PEBBLE_OR_FOUR_CARDS
      ) {
        const selectedOption = gameInput.clientOptions.selectedOption;
        if (
          !selectedOption ||
          gameInput.options.indexOf(selectedOption) === -1
        ) {
          throw new Error("Please selected an option");
        }
        if (selectedOption === "4 CARD") {
          gameState.addGameLogFromLocation(
            LocationName.FOREST_RESIN_PEBBLE_OR_FOUR_CARDS,
            [player, ` drew 4 CARD.`]
          );
          player.drawCards(gameState, 4);
        } else if (selectedOption === "1 RESIN & 1 PEBBLE") {
          player.gainResources(gameState, {
            [ResourceType.PEBBLE]: 1,
            [ResourceType.RESIN]: 1,
          });
          gameState.addGameLogFromLocation(
            LocationName.FOREST_RESIN_PEBBLE_OR_FOUR_CARDS,
            [player, ` gained 1 RESIN & 1 PEBBLE.`]
          );
        }
      }
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
      const player = gameState.getActivePlayer();
      const name = LocationName.FOREST_DISCARD_2_MEADOW_DRAW_2_MEADOW_GAIN_ANY;
      const gainAnyHelper = new GainAnyResource({ locationContext: name });
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          label: "Discard 2 CARD from the Meadow",
          cardOptions: gameState.meadowCards,
          maxToSelect: 2,
          minToSelect: 2,
          locationContext: name,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.locationContext === name &&
        gameInput.prevInputType === GameInputType.PLACE_WORKER
      ) {
        // Discard the cards from the meadow + replenish
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length !== gameInput.minToSelect) {
          throw new Error(
            "Must choose exactly 2 cards to remove from the Meadow."
          );
        }
        gameState.addGameLogFromLocation(name, [
          player,
          " discarded ",
          ...cardListToGameText(selectedCards),
          " from the Meadow.",
        ]);

        selectedCards.forEach((cardName) => {
          gameState.removeCardFromMeadow(cardName);
          gameState.discardPile.addToStack(cardName);
        });

        gameState.replenishMeadow();

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          label: "Select 2 CARD from the Meadow to keep",
          cardOptions: gameState.meadowCards,
          maxToSelect: 2,
          minToSelect: 2,
          locationContext: name,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.locationContext === name &&
        gameInput.prevInputType === GameInputType.SELECT_CARDS
      ) {
        // Add selected cards to player's hand + replenish meadow
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length !== 2) {
          throw new Error("May only choose 2 card from the Meadow");
        }
        selectedCards.forEach((card) => {
          gameState.removeCardFromMeadow(card);
          player.addCardToHand(gameState, card);
        });

        gameState.addGameLogFromLocation(name, [
          player,
          " selected ",
          ...cardListToGameText(selectedCards),
          " from the Meadow.",
        ]);

        gameState.pendingGameInputs.push(
          gainAnyHelper.getGameInput({ prevInputType: gameInput.inputType })
        );
      } else if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
      }
    },
  }),

  // newleaf
  [LocationName.FOREST_FOUR_TWIG]: new Location({
    name: LocationName.FOREST_FOUR_TWIG,
    type: LocationType.FOREST,
    shortName: toGameText(["TWIG", "TWIG", "TWIG", "TWIG"]),
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    expansion: ExpansionType.NEWLEAF,
    resourcesToGain: {
      [ResourceType.TWIG]: 4,
    },
  }),
  [LocationName.FOREST_TWO_TWIG_ONE_RESIN]: new Location({
    name: LocationName.FOREST_TWO_TWIG_ONE_RESIN,
    shortName: toGameText(["TWIG", "TWIG", "RESIN"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    expansion: ExpansionType.NEWLEAF,
    resourcesToGain: {
      [ResourceType.TWIG]: 2,
      [ResourceType.RESIN]: 1,
    },
  }),
  [LocationName.FOREST_COPY_ANY_FOREST_LOCATION]: new Location({
    name: LocationName.FOREST_COPY_ANY_FOREST_LOCATION,
    shortName: toGameText(["Copy 1 Forest location"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    expansion: ExpansionType.NEWLEAF,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        // Ask player which location they want to copy
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: GameInputType.PLACE_WORKER,
          label: "Select basic location to copy",
          locationContext: LocationName.FOREST_COPY_ANY_FOREST_LOCATION,
          locationOptions: Location.byType(LocationType.FOREST).filter(
            // filter out this location
            (loc) => loc != LocationName.FOREST_COPY_ANY_FOREST_LOCATION
          ),
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
        if (location.type !== LocationType.FOREST) {
          throw new Error("can only copy a forest location");
        }

        gameState.addGameLogFromLocation(
          LocationName.FOREST_COPY_ANY_FOREST_LOCATION,
          [player, " copied ", location, "."]
        );

        location.triggerLocation(gameState);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [LocationName.KNOLL]: new Location({
    name: LocationName.KNOLL,
    description: toGameText([
      "Discard 3 CARD from the Meadow / Station. Replenish and draw 3 CARD",
    ]),
    shortName: toGameText(["Knoll"]),
    type: LocationType.KNOLL,
    occupancy: LocationOccupancy.UNLIMITED_MAX_ONE,
    expansion: ExpansionType.NEWLEAF,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS_WITH_SOURCE,
          prevInputType: gameInput.inputType,
          locationContext: LocationName.KNOLL,
          label: "Select 3 CARD to discard from the Meadow / Station",
          cardOptions: gameState.getCardsWithSource(false, false),
          maxToSelect: 3,
          minToSelect: 3,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS_WITH_SOURCE
      ) {
        if (gameInput.prevInputType === GameInputType.PLACE_WORKER) {
          const selectedCards = gameInput.clientOptions.selectedCards;
          const meadowCards: CardName[] = [];
          const stationCards: CardName[] = [];
          selectedCards.forEach((cardWithSource) => {
            if (cardWithSource === "FROM_DECK") {
              throw new Error(`Invalid card selected`);
            }
            const { card, source, sourceIdx } = cardWithSource;

            if (source === "MEADOW") {
              meadowCards.push(card);
              gameState.removeCardFromMeadow(card);
            } else if (source === "STATION") {
              stationCards.push(card);
              gameState.removeCardFromStation(card, sourceIdx!);
            } else {
              throw new Error(`Invalid card selected`);
            }
          });
          gameState.addGameLogFromLocation(LocationName.KNOLL, [
            player,
            " discarded ",
            ...cardListToGameText([...meadowCards, ...stationCards]),
            " from the ",
            meadowCards.length === 0
              ? "Station"
              : stationCards.length === 0
              ? "Meadow"
              : "Meadow & Station",
            ".",
          ]);

          // Replenish the meadow and station.
          gameState.replenishMeadow();
          gameState.replenishStation();

          // only allow players to draw up to their max hand size
          if (
            player.numCardsInHand < player.maxHandSize &&
            player.maxHandSize - player.numCardsInHand > 0
          ) {
            const cardsToTake = Math.min(
              player.maxHandSize - player.numCardsInHand,
              3
            );

            gameState.pendingGameInputs.push({
              inputType: GameInputType.SELECT_CARDS_WITH_SOURCE,
              prevInputType: gameInput.inputType,
              locationContext: LocationName.KNOLL,
              label: `Select ${cardsToTake} CARD to keep from the Meadow / Station.`,
              cardOptions: gameState.getCardsWithSource(false, false),
              maxToSelect: cardsToTake,
              minToSelect: cardsToTake,
              clientOptions: {
                selectedCards: [],
              },
            });
          } else {
            gameState.addGameLogFromLocation(LocationName.KNOLL, [
              player,
              " did not select any cards from the Meadow or Station because",
              " they do not have space in their hand.",
            ]);
          }
        } else {
          const selectedCards = gameInput.clientOptions.selectedCards;
          const meadowCards: CardName[] = [];
          const stationCards: CardName[] = [];
          selectedCards.forEach((cardWithSource) => {
            if (cardWithSource === "FROM_DECK") {
              throw new Error(`Invalid card selected`);
            }
            const { card, source, sourceIdx } = cardWithSource;

            player.addCardToHand(gameState, card);
            if (source === "MEADOW") {
              meadowCards.push(card);
              gameState.removeCardFromMeadow(card);
            } else if (source === "STATION") {
              stationCards.push(card);
              gameState.removeCardFromStation(card, sourceIdx!);
            } else {
              throw new Error(`Invalid card selected`);
            }
          });

          gameState.addGameLogFromLocation(LocationName.KNOLL, [
            player,
            " drew ",
            ...cardListToGameText([...meadowCards, ...stationCards]),
            " from the ",
            meadowCards.length === 0
              ? "Station"
              : stationCards.length === 0
              ? "Meadow"
              : "Meadow & Station",
            ".",
          ]);

          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_TRAIN_CAR_TILE,
            prevInputType: gameInput.inputType,
            locationContext: LocationName.KNOLL,
            label: "Select 1 Train Car Tile",
            options: gameState.trainCarTileStack!.getRevealedTiles(),
            clientOptions: {
              trainCarTileIdx: -1,
            },
          });
        }
      } else if (gameInput.inputType === GameInputType.SELECT_TRAIN_CAR_TILE) {
        const selectedIdx = gameInput.clientOptions.trainCarTileIdx;
        const selectedTile = gameInput.options[selectedIdx];
        if (
          !selectedTile ||
          gameState.trainCarTileStack?.peekAt(selectedIdx) !== selectedTile
        ) {
          throw new Error("Invalid train car tile selected");
        }
        TrainCarTile.fromName(selectedTile).playTile(gameState, gameInput);
        gameState.trainCarTileStack!.replaceAt(selectedIdx);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [LocationName.STATION]: new Location({
    name: LocationName.STATION,
    description: toGameText([
      "Discard 1 Visitor at the station, then gain 1 visitor and 1 train car tile",
    ]),
    shortName: toGameText(["Station"]),
    type: LocationType.STATION,
    occupancy: LocationOccupancy.UNLIMITED_MAX_ONE,
    expansion: ExpansionType.NEWLEAF,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        // if visit location, choose a visitor to discard
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_VISITOR,
          prevInputType: gameInput.inputType,
          label: `Select a VISITOR to discard`,
          visitorOptions: gameState.visitorStack!.getRevealedVisitors(),
          locationContext: LocationName.STATION,
          clientOptions: {
            selectedVisitor: null,
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_VISITOR &&
        gameInput.prevInputType === GameInputType.PLACE_WORKER
      ) {
        const selectedVisitor = gameInput.clientOptions.selectedVisitor;

        if (!selectedVisitor) {
          throw new Error("Selected visitor does not exist");
        }

        const visitorToDiscardIndex =
          gameState.visitorStack?.peekAt(0) === selectedVisitor ? 0 : 1;

        // discard this visitor and replace it with a different one
        gameState.visitorStack?.replaceAt(visitorToDiscardIndex, true);

        gameState.addGameLogFromLocation(LocationName.STATION, [
          player,
          " discarded ",
          { type: "entity", entityType: "visitor", visitor: selectedVisitor },
          ".",
        ]);

        // after discarding, select the one to keep
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_VISITOR,
          prevInputType: gameInput.inputType,
          label: `Select a VISITOR to keep`,
          visitorOptions: gameState.visitorStack!.getRevealedVisitors(),
          locationContext: LocationName.STATION,
          clientOptions: {
            selectedVisitor: null,
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_VISITOR &&
        gameInput.prevInputType === GameInputType.SELECT_VISITOR
      ) {
        const selectedVisitor = gameInput.clientOptions.selectedVisitor;

        if (!selectedVisitor) {
          throw new Error("Selected visitor does not exist");
        }

        const visitorToKeepIndex =
          gameState.visitorStack?.peekAt(0) === selectedVisitor ? 0 : 1;

        // remove visitor from stack and don't put it back in rotation
        gameState.visitorStack?.replaceAt(visitorToKeepIndex, false);

        gameState.addGameLogFromLocation(LocationName.STATION, [
          player,
          " claimed ",
          { type: "entity", entityType: "visitor", visitor: selectedVisitor },
          ".",
        ]);

        player.claimedVisitors.push(selectedVisitor);

        //then, select train tile to keep
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_TRAIN_CAR_TILE,
          prevInputType: gameInput.inputType,
          locationContext: LocationName.STATION,
          label: "Select 1 Train Car Tile",
          options: gameState.trainCarTileStack!.getRevealedTiles(),
          clientOptions: {
            trainCarTileIdx: -1,
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_TRAIN_CAR_TILE) {
        const selectedIdx = gameInput.clientOptions.trainCarTileIdx;
        const selectedTile = gameInput.options[selectedIdx];
        if (
          !selectedTile ||
          gameState.trainCarTileStack?.peekAt(selectedIdx) !== selectedTile
        ) {
          throw new Error("Invalid train car tile selected");
        }
        TrainCarTile.fromName(selectedTile).playTile(gameState, gameInput);
        gameState.trainCarTileStack!.replaceAt(selectedIdx);
      } else {
        throw new Error(`Unexpected input type ${gameInput.inputType}`);
      }
    },
  }),

  // bellfaire
  [LocationName.FOREST_ACTIVATE_2_PRODUCTION]: new Location({
    name: LocationName.FOREST_ACTIVATE_2_PRODUCTION,
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    shortName: toGameText("Activate 2 PRODUCTION in your city"),
    resourcesToGain: {},
    expansion: ExpansionType.BELLFAIRE,
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        const productionCards = onlyRelevantProductionCards(
          gameState,
          player.getAllPlayedCardsByType(CardType.PRODUCTION)
        );
        if (productionCards.length === 0) {
          return "No useful production cards to activate.";
        }
      }
      return null;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        const productionCards = onlyRelevantProductionCards(
          gameState,
          player.getAllPlayedCardsByType(CardType.PRODUCTION)
        );
        const numToActivate = Math.min(productionCards.length, 2);
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: gameInput.inputType,
          label: `Select ${numToActivate} PRODUCTION to activate`,
          cardOptions: productionCards,
          locationContext: LocationName.FOREST_ACTIVATE_2_PRODUCTION,
          maxToSelect: numToActivate,
          minToSelect: numToActivate,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS &&
        gameInput.locationContext === LocationName.FOREST_ACTIVATE_2_PRODUCTION
      ) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (!selectedCards || selectedCards.length !== gameInput.minToSelect) {
          throw new Error(`Please select ${gameInput.minToSelect} cards`);
        }
        gameState.addGameLogFromLocation(
          LocationName.FOREST_ACTIVATE_2_PRODUCTION,
          [
            player,
            " activated PRODUCTION on ",
            ...cardListToGameText(
              selectedCards.map(({ cardName }) => cardName)
            ),
            ".",
          ]
        );
        selectedCards.forEach((selectedCard) => {
          if (!gameInput.cardOptions.find((x) => isEqual(x, selectedCard))) {
            throw new Error("Could not find selected card.");
          }
          Card.fromName(selectedCard.cardName).reactivateCard(
            gameState,
            gameInput,
            gameState.getPlayer(selectedCard.cardOwnerId),
            selectedCard
          );
        });
      }
    },
  }),
  [LocationName.FOREST_THREE_RESIN]: new Location({
    name: LocationName.FOREST_THREE_RESIN,
    shortName: toGameText(["RESIN", "RESIN", "RESIN"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    expansion: ExpansionType.BELLFAIRE,
    resourcesToGain: {
      [ResourceType.RESIN]: 3,
    },
  }),
  [LocationName.FOREST_TWO_RESIN_OR_TWO_BERRY]: new Location({
    name: LocationName.FOREST_TWO_RESIN_OR_TWO_BERRY,
    shortName: toGameText(["2 RESIN or 2 BERRY"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    expansion: ExpansionType.BELLFAIRE,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: gameInput.inputType,
          locationContext: LocationName.FOREST_TWO_RESIN_OR_TWO_BERRY,
          label: "Choose one",
          options: ["2 RESIN", "2 BERRY"],
          clientOptions: {
            selectedOption: null,
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
        gameInput.locationContext === LocationName.FOREST_TWO_RESIN_OR_TWO_BERRY
      ) {
        const selectedOption = gameInput.clientOptions.selectedOption;
        if (
          !selectedOption ||
          gameInput.options.indexOf(selectedOption) === -1
        ) {
          throw new Error("Please selected an option");
        }
        if (selectedOption === "2 RESIN") {
          gameState.addGameLogFromLocation(
            LocationName.FOREST_TWO_RESIN_OR_TWO_BERRY,
            [player, ` gained 2 RESIN.`]
          );
          player.gainResources(gameState, { [ResourceType.RESIN]: 2 });
        } else if (selectedOption === "2 BERRY") {
          player.gainResources(gameState, {
            [ResourceType.BERRY]: 2,
          });
          gameState.addGameLogFromLocation(
            LocationName.FOREST_TWO_RESIN_OR_TWO_BERRY,
            [player, ` gained 2 BERRY.`]
          );
        }
      }
    },
  }),
  [LocationName.FOREST_PAY_THREE_TWIG_GAIN_THREE_ANY]: new Location({
    name: LocationName.FOREST_PAY_THREE_TWIG_GAIN_THREE_ANY,
    shortName: toGameText(["Pay 3 TWIG to gain 3 ANY"]),
    type: LocationType.FOREST,
    occupancy: LocationOccupancy.EXCLUSIVE_FOUR,
    expansion: ExpansionType.BELLFAIRE,
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        if (player.getNumResourcesByType(ResourceType.TWIG) < 3) {
          return "Must be able to play 3 TWIG to visit this location";
        }
      }
      return null;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      const gainAnyHelper = new GainMoreThan1AnyResource({
        locationContext: LocationName.FOREST_PAY_THREE_TWIG_GAIN_THREE_ANY,
      });
      if (gameInput.inputType === GameInputType.PLACE_WORKER) {
        player.spendResources({ [ResourceType.TWIG]: 3 });
        // ask the player what resources they want to gain
        gameState.pendingGameInputs.push(
          gainAnyHelper.getGameInput(3, {
            prevInputType: GameInputType.PLACE_WORKER,
          })
        );
      } else if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
};

export const initialLocationsMap = (
  numPlayers: number,
  opt: GameOptions
): LocationNameToPlayerIds => {
  const forestLocations = Location.byType(LocationType.FOREST).filter(
    (locationName) => {
      const location = Location.fromName(locationName);
      switch (location.expansion) {
        case ExpansionType.NEWLEAF:
          return opt.newleaf?.forestLocations;
        case ExpansionType.BELLFAIRE:
          return opt.bellfaire?.forestLocations;

        case ExpansionType.SPIRECREST:
        case ExpansionType.MISTWOOD:
          return false;
        case ExpansionType.PEARLBROOK:
          return opt.pearlbrook;
        default:
          return true;
      }
    }
  );
  const forestLocationsToPlay = shuffle(forestLocations).slice(
    0,
    numPlayers == 2 ? 3 : 4
  );

  const ret: LocationNameToPlayerIds = {};
  [
    ...Location.byType(LocationType.BASIC),
    ...forestLocationsToPlay,
    ...(opt.newleaf?.knoll ? Location.byType(LocationType.KNOLL) : []),
    ...(opt.newleaf?.visitors ? Location.byType(LocationType.STATION) : []),
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
        player.removeCardFromHand(gameState, card);
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
    if (player.numCardsInHand < numPoints) {
      return `Not enough cards to discard for the Journey.\n cardsInHand: ${JSON.stringify(
        player.getCardsInHand(),
        null,
        2
      )}, Required: ${numPoints}`;
    }
    return null;
  };
}
