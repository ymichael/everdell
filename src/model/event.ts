import {
  CardName,
  CardType,
  EventType,
  EventName,
  EventNameToPlayerId,
  GameInput,
  GameInputType,
  PlayedEventInfo,
  ResourceType,
  CardCost,
} from "./types";
import { Card } from "./card";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayCheckFn,
} from "./gameState";
import shuffle from "lodash/shuffle";
import pull from "lodash/pull";

export class Event implements GameStatePlayable {
  readonly playInner: GameStatePlayFn | undefined;
  readonly playedEventInfoInner: (() => PlayedEventInfo) | undefined;
  readonly pointsInner:
    | ((gameState: GameState, playerId: string) => number)
    | undefined;

  readonly name: EventName;
  readonly type: EventType;
  readonly baseVP: number;
  readonly requiredCards: CardName[] | undefined;
  // every event has requirements to play,
  // but not all events result in an action when played
  readonly canPlayCheckInner: GameStateCanPlayCheckFn;

  constructor({
    name,
    type,
    baseVP,
    requiredCards,
    playInner, // called when the card is played
    canPlayCheckInner, // called when we check canPlay function
    playedEventInfoInner, // used for cards that accumulate other cards or resources
    pointsInner, // computed if specified + added to base points
  }: {
    name: EventName;
    type: EventType;
    baseVP: number;
    requiredCards?: CardName[];
    canPlayCheckInner: GameStateCanPlayCheckFn;
    playInner?: GameStatePlayFn;
    playedEventInfoInner?: () => PlayedEventInfo;
    pointsInner?: (gameState: GameState, playerId: string) => number;
  }) {
    this.name = name;
    this.type = type;
    this.baseVP = baseVP;
    this.requiredCards = requiredCards;
    this.canPlayCheckInner = canPlayCheckInner;
    this.playInner = playInner;
    this.playedEventInfoInner = playedEventInfoInner;
    this.pointsInner = pointsInner;
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    return !this.canPlayCheck(gameState, gameInput);
  }

  canPlayCheck(gameState: GameState, gameInput: GameInput): string | null {
    // check whether the event is in the game
    if (!(this.name in gameState.eventsMap)) {
      return `Event ${
        this.name
      } is not part of the current game. \nGame Events: ${JSON.stringify(
        gameState.eventsMap,
        null,
        2
      )}`;
    }

    // check whether the event has been playedCards and we're not taking
    // a second action
    if (
      gameInput.inputType == GameInputType.CLAIM_EVENT &&
      gameState.eventsMap[this.name]
    ) {
      return `Event ${this.name} is already claimed by ${JSON.stringify(
        gameState.eventsMap[this.name],
        null,
        2
      )}`;
    }

    // check whether the active player has available workers
    const player = gameState.getActivePlayer();
    if (player.numAvailableWorkers <= 0) {
      return `Active player (${player.playerId}) doesn't have any workers to place.`;
    }

    // check whether player meets criteria for playing event
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

    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
      player.placeWorkerOnEvent(this.name);
    }
    this.playEventEffects(gameState, gameInput);
  }

  playEventEffects(gameState: GameState, gameInput: GameInput): void {
    if (this.playInner) {
      this.playInner(gameState, gameInput);
    }
  }

  getPlayedEventInfo(): PlayedEventInfo {
    return this.playedEventInfoInner ? this.playedEventInfoInner() : {};
  }

  getPoints(gameState: GameState, playerId: string) {
    return (
      this.baseVP +
      (this.pointsInner ? this.pointsInner(gameState, playerId) : 0)
    );
  }

  static fromName(name: EventName): Event {
    return EVENT_REGISTRY[name];
  }

  static byType(type: EventType): EventName[] {
    return ((Object.entries(EVENT_REGISTRY) as unknown) as [EventName, Event][])
      .filter(([_, event]) => {
        return event.type === type;
      })
      .map(([name, _]) => {
        return name;
      });
  }
}

const EVENT_REGISTRY: Record<EventName, Event> = {
  [EventName.BASIC_FOUR_PRODUCTION_TAGS]: new Event({
    name: EventName.BASIC_FOUR_PRODUCTION_TAGS,
    type: EventType.BASIC,
    baseVP: 3,
    canPlayCheckInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      if (player.getNumCardType(CardType.PRODUCTION) < 4) {
        return `Need at least 4 ${CardType.PRODUCTION} cards to claim event`;
      }
      return null;
    },
  }),
  [EventName.BASIC_THREE_DESTINATION]: new Event({
    name: EventName.BASIC_THREE_DESTINATION,
    type: EventType.BASIC,
    baseVP: 3,
    canPlayCheckInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      if (player.getNumCardType(CardType.DESTINATION) < 3) {
        return `Need at least 3 ${CardType.DESTINATION} cards to claim event`;
      }
      return null;
    },
  }),
  [EventName.BASIC_THREE_GOVERNANCE]: new Event({
    name: EventName.BASIC_THREE_GOVERNANCE,
    type: EventType.BASIC,
    baseVP: 3,
    canPlayCheckInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      if (player.getNumCardType(CardType.GOVERNANCE) < 3) {
        return `Need at least 3 ${CardType.GOVERNANCE} cards to claim event`;
      }
      return null;
    },
  }),
  [EventName.BASIC_THREE_TRAVELER]: new Event({
    name: EventName.BASIC_THREE_TRAVELER,
    type: EventType.BASIC,
    baseVP: 3,
    canPlayCheckInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      if (player.getNumCardType(CardType.TRAVELER) < 3) {
        return `Need at least 3 ${CardType.TRAVELER} cards to claim event`;
      }
      return null;
    },
  }),

  [EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN]: new Event({
    name: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      return "Not Implemented";
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
    /*
    canPlayCheckInnerRequiresCards([
      CardName.SHOPKEEPER,
      CardName.POST_OFFICE,
    ]),
    // may give opponents up to a total of 3 resources
    */
    // TODO: add playInner
    // TODO: add pointsInner
  }),

  [EventName.SPECIAL_A_WEE_RUN_CITY]: new Event({
    name: EventName.SPECIAL_A_WEE_RUN_CITY,
    type: EventType.SPECIAL,
    baseVP: 4,
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      return "Not Implemented";
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
    /*
    canPlayCheckInnerRequiresCards([
      CardName.CHIP_SWEEP,
      CardName.CLOCK_TOWER,
    ]),
    */
    // bring back one of your deployed workers
    // TODO: add playInner
  }),
  [EventName.SPECIAL_AN_EVENING_OF_FIREWORKS]: new Event({
    name: EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.LOOKOUT, CardName.MINER_MOLE],
    canPlayCheckInner: canPlayCheckInnerRequiresCards([
      CardName.LOOKOUT,
      CardName.MINER_MOLE,
    ]),
    playedEventInfoInner: () => ({
      storedResources: {
        [ResourceType.TWIG]: 0,
      },
    }),
    // place up to 3 twigs on event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // ask player how many twigs to add to card
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
          maxResources: 3,
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

        const numTwigs = resources[ResourceType.TWIG];

        if (!numTwigs) {
          throw new Error("must provide number of twigs");
        }

        if (numTwigs > 3) {
          throw new Error("too many twigs");
        }

        const eventInfo =
          player.claimedEvents[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS];

        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // add twigs to this event
        eventInfo.storedResources = resources;
        eventInfo.storedResources[ResourceType.TWIG] = numTwigs;

        // remove twigs from player's supply
        player.spendResources({ [ResourceType.TWIG]: numTwigs });
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 2 points per twig on event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS];

      if (!eventInfo) {
        throw new Error("Invalid event info");
      }

      const resources = eventInfo.storedResources;
      if (!resources) {
        throw new Error("Invalid resources list");
      }

      const numTwigs = resources[ResourceType.TWIG];
      if (!numTwigs) {
        throw new Error("Invalid number of twigs");
      }

      return numTwigs * 2;
    },
  }),

  [EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED]: new Event({
    name: EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.HISTORIAN, CardName.RUINS],
    canPlayCheckInner: canPlayCheckInnerRequiresCards([
      CardName.HISTORIAN,
      CardName.RUINS,
    ]),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // reveal 5 cards
        const cardOptions = [
          gameState.drawCard(),
          gameState.drawCard(),
          gameState.drawCard(),
          gameState.drawCard(),
          gameState.drawCard(),
        ];

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
          maxToSelect: 5,
          minToSelect: 0,
          cardOptions: cardOptions,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.prevInputType === GameInputType.CLAIM_EVENT &&
        gameInput.eventContext === EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      ) {
        if (!gameInput.clientOptions.selectedCards) {
          throw new Error("invalid input");
        }

        const selectedCards = gameInput.clientOptions.selectedCards;

        if (selectedCards.length > 5) {
          throw new Error("Too many cards");
        }

        const eventInfo =
          player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED];
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        let remainingCards = gameInput.cardOptions;

        // add selected cards to player's hand
        selectedCards.forEach((cardName) => {
          player.addCardToHand(gameState, cardName);

          // if card is added to player's hand, remove it from cards
          // that will go under event
          remainingCards = pull(remainingCards, cardName);
        });

        remainingCards.forEach((cardName) => {
          (eventInfo.storedCards = eventInfo.storedCards || []).push(cardName);
        });
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    playedEventInfoInner: () => ({
      storedCards: [],
    }),
    // Reveal 5 cards. You may draw any or place any beneath this event
    // TODO: add playInner
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const storedCards = eventInfo.storedCards;

      if (!storedCards) {
        throw new Error("Invalid list of paired cards");
      }

      return storedCards.length;
    },
  }),
  [EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES]: new Event({
    name: EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.COURTHOUSE, CardName.RANGER],
    canPlayCheckInner: canPlayCheckInnerRequiresCards([
      CardName.COURTHOUSE,
      CardName.RANGER,
    ]),
    playedEventInfoInner: () => ({
      storedCards: [],
    }),
    // play up to 2 critters from your city beneath this event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        const crittersInCity = player.getPlayedCritters();

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
          cardOptions: crittersInCity,
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (!selectedCards) {
          throw new Error("invalid input");
        }
        if (selectedCards.length > 2) {
          throw new Error("Too many cards");
        }

        selectedCards.forEach((playedCardInfo) => {
          const card = Card.fromName(playedCardInfo.cardName);
          if (!card.isCritter) {
            throw new Error("Can only put Critters beneath this event");
          }
        });

        const eventInfo =
          player.claimedEvents[EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES];
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // Remove cards from city and put under event
        selectedCards.forEach((playedCardInfo) => {
          const removedCards = player.removeCardFromCity(
            gameState,
            playedCardInfo,
            false /* addToDiscardPile */
          );
          const cardName = playedCardInfo.cardName;
          removedCards.splice(removedCards.indexOf(cardName), 1);
          removedCards.forEach((card) => {
            gameState.discardPile.addToStack(card);
          });
          (eventInfo.storedCards = eventInfo.storedCards || []).push(cardName);
        });
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 3 points per critter beneath event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }
      return (eventInfo.storedCards = eventInfo.storedCards || []).length * 3;
    },
  }),
  [EventName.SPECIAL_CROAK_WART_CURE]: new Event({
    name: EventName.SPECIAL_CROAK_WART_CURE,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        if (!player.hasCardInCity(CardName.UNDERTAKER)) {
          return `Need to have played ${CardName.UNDERTAKER} to claim event`;
        }
        if (!player.hasCardInCity(CardName.BARGE_TOAD)) {
          return `Need to have played ${CardName.BARGE_TOAD} to claim event`;
        }
        if (player.getNumResourcesByType(ResourceType.BERRY) < 2) {
          return `Need to have at least 2 ${
            ResourceType.BERRY
          } to claim event. \n Got: ${player.getNumResourcesByType(
            ResourceType.BERRY
          )}`;
        }
      }
      return null;
    },
    // Pay 2 berries and discard 2 cards from city
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // Remove berries from player's supply
        player.spendResources({ [ResourceType.BERRY]: 2 });

        // ask player to choose which cards to discard
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_CROAK_WART_CURE,
          cardOptions: player.getAllPlayedCards(),
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (!selectedCards) {
          throw new Error("invalid input");
        }
        if (selectedCards.length > 2) {
          throw new Error("Too many cards");
        }
        const eventInfo =
          player.claimedEvents[EventName.SPECIAL_CROAK_WART_CURE];
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }
        selectedCards.forEach((playedCardInfo) => {
          player.removeCardFromCity(gameState, playedCardInfo);
        });
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [EventName.SPECIAL_FLYING_DOCTOR_SERVICE]: new Event({
    name: EventName.SPECIAL_FLYING_DOCTOR_SERVICE,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.DOCTOR, CardName.POSTAL_PIGEON],
    canPlayCheckInner: canPlayCheckInnerRequiresCards([
      CardName.DOCTOR,
      CardName.POSTAL_PIGEON,
    ]),
    pointsInner: (gameState: GameState, playerId: string) => {
      let getNumHusbandWifePairs = 0;
      gameState.players.forEach((player) => {
        getNumHusbandWifePairs += player.getNumHusbandWifePairs();
      });
      return getNumHusbandWifePairs * 3;
    },
  }),
  [EventName.SPECIAL_GRADUATION_OF_SCHOLARS]: new Event({
    name: EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.TEACHER, CardName.UNIVERSITY],
    canPlayCheckInner: canPlayCheckInnerRequiresCards([
      CardName.TEACHER,
      CardName.UNIVERSITY,
    ]),
    playedEventInfoInner: () => ({
      storedCards: [],
    }),
    // play up to 3 critters from your hand beneath this event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        let critterCardsInHand: CardName[] = [];
        player.cardsInHand.forEach((cardName) => {
          const card = Card.fromName(cardName as CardName);
          if (card.isCritter) {
            critterCardsInHand.push(card.name);
          }
          return card.isCritter;
        });

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
          cardOptions: critterCardsInHand,
          maxToSelect: 3,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        if (!gameInput.clientOptions.selectedCards) {
          throw new Error("invalid input");
        }

        const cardsToUse = gameInput.clientOptions.selectedCards;

        if (cardsToUse.length > 3) {
          throw new Error("Too many cards");
        }

        cardsToUse.forEach((cardName) => {
          const card = Card.fromName(cardName as CardName);
          if (!card.isCritter) {
            throw new Error("Can only put Critters beneath this event");
          }
        });

        const eventInfo =
          player.claimedEvents[EventName.SPECIAL_GRADUATION_OF_SCHOLARS];
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // remove cards from hand
        cardsToUse.forEach((cardName) => {
          player.removeCardFromHand(cardName as CardName);
          (eventInfo.storedCards = eventInfo.storedCards || []).push(cardName);
        });
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 2 points per critter beneath event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_GRADUATION_OF_SCHOLARS];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }
      return (eventInfo.storedCards = eventInfo.storedCards || []).length * 2;
    },
  }),
  [EventName.SPECIAL_MINISTERING_TO_MISCREANTS]: new Event({
    name: EventName.SPECIAL_MINISTERING_TO_MISCREANTS,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.MONK, CardName.DUNGEON],
    canPlayCheckInner: canPlayCheckInnerRequiresCards([
      CardName.MONK,
      CardName.DUNGEON,
    ]),
    // 3 points for each prisoner in dungeon
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_MINISTERING_TO_MISCREANTS];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }
      if (player.getNumCardsInCity() === 0) {
        throw new Error("No cards in city");
      }
      const playedDungeons = player.getPlayedCardInfos(CardName.DUNGEON);
      if (playedDungeons.length === 0) {
        throw new Error("No dungeon in city");
      }
      // you can only have one dungeon in your city
      const cardsInDungeon = playedDungeons[0].pairedCards;
      if (!cardsInDungeon) {
        throw new Error("Invalid dungeon card list");
      }

      return cardsInDungeon.length * 3;
    },
  }),
  [EventName.SPECIAL_PATH_OF_THE_PILGRIMS]: new Event({
    name: EventName.SPECIAL_PATH_OF_THE_PILGRIMS,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.MONASTERY, CardName.WANDERER],
    canPlayCheckInner: canPlayCheckInnerRequiresCards([
      CardName.MONASTERY,
      CardName.WANDERER,
    ]),
    // 3 points for each worker in the monestary
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_PATH_OF_THE_PILGRIMS];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const playedCards = player.playedCards;
      if (!playedCards) {
        throw new Error("no cards in city");
      }

      const monestary = playedCards[CardName.MONASTERY];
      if (!monestary) {
        throw new Error("No monestary in city");
      }

      if (monestary.length > 1) {
        throw new Error("Cannot have more than one monestary");
      }

      // you can only have one monestary in your city
      const workersInMonestary = monestary[0].workers;

      if (!workersInMonestary) {
        throw new Error("Invalid monestary worker list");
      }

      return workersInMonestary.length * 3;
    },
  }),
  [EventName.SPECIAL_PERFORMER_IN_RESIDENCE]: new Event({
    name: EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.INN, CardName.BARD],
    canPlayCheckInner: canPlayCheckInnerRequiresCards([
      CardName.INN,
      CardName.BARD,
    ]),
    // may place up to 3 berries on this card
    playedEventInfoInner: () => ({
      storedResources: {
        [ResourceType.BERRY]: 0,
      },
    }),
    // place up to 3 berries on event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // ask player how many berries to add to card
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
          maxResources: 3,
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

        const numBerries = resources[ResourceType.BERRY];

        if (!numBerries) {
          throw new Error("must provide number of berries");
        }

        if (numBerries > 3) {
          throw new Error("too many berries");
        }

        const eventInfo =
          player.claimedEvents[EventName.SPECIAL_PERFORMER_IN_RESIDENCE];

        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // add berries to this event
        eventInfo.storedResources = resources;
        eventInfo.storedResources[ResourceType.BERRY] = numBerries;

        // remove berries from player's supply
        player.spendResources({ [ResourceType.BERRY]: numBerries });
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 2 points per berry on event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_PERFORMER_IN_RESIDENCE];

      if (!eventInfo) {
        throw new Error("Invalid event info");
      }

      const resources = eventInfo.storedResources;
      if (!resources) {
        throw new Error("Invalid resources list");
      }

      const numBerries = resources[ResourceType.BERRY];
      if (!numBerries) {
        throw new Error("Invalid number of berries");
      }

      return numBerries * 2;
    },
  }),
  [EventName.SPECIAL_PRISTINE_CHAPEL_CEILING]: new Event({
    name: EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.WOODCARVER, CardName.CHAPEL],
    canPlayCheckInner: canPlayCheckInnerRequiresCards([
      CardName.WOODCARVER,
      CardName.CHAPEL,
    ]),
    // draw 1 card and receive 1 resource for each VP on your chapel
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      // get number of VP on chapel
      const playedCards = player.playedCards;
      if (!playedCards) {
        throw new Error("no cards in city");
      }

      const chapel = playedCards[CardName.CHAPEL];
      if (!chapel) {
        throw new Error("No chapel in city");
      }

      if (chapel.length > 1) {
        throw new Error("Cannot have more than one chapel");
      }
      const chapelResources = chapel[0].resources;

      if (!chapelResources) {
        throw new Error("Invalid resources");
      }

      const numVP = chapelResources[ResourceType.VP] || 0;

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        player.drawCards(gameState, numVP);

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
          maxResources: numVP,
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

        if (numResources > numVP) {
          throw new Error("Can't gain more resources than VP on the Chapel");
        }

        // gain requested resources
        player.gainResources(resources);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 2 points for VP on the chapel
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_PRISTINE_CHAPEL_CEILING];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const playedCards = player.playedCards;
      if (!playedCards) {
        throw new Error("no cards in city");
      }

      const chapel = playedCards[CardName.CHAPEL];
      if (!chapel) {
        throw new Error("No chapel in city");
      }

      if (chapel.length > 1) {
        throw new Error("Cannot have more than one chapel");
      }
      const chapelResources = chapel[0].resources;

      if (!chapelResources) {
        throw new Error("Invalid resources");
      }

      const numVP = chapelResources[ResourceType.VP] || 0;

      return numVP * 2;
    },
  }),
  [EventName.SPECIAL_REMEMBERING_THE_FALLEN]: new Event({
    name: EventName.SPECIAL_REMEMBERING_THE_FALLEN,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.CEMETARY, CardName.SHEPHERD],
    canPlayCheckInner: canPlayCheckInnerRequiresCards([
      CardName.CEMETARY,
      CardName.SHEPHERD,
    ]),
    // 3 points for each worker in the cemetary
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_REMEMBERING_THE_FALLEN];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const playedCards = player.playedCards;
      if (!playedCards) {
        throw new Error("no cards in city");
      }

      const cemetary = playedCards[CardName.CEMETARY];
      if (!cemetary) {
        throw new Error("No cemetary in city");
      }

      if (cemetary.length > 1) {
        throw new Error("Cannot have more than one cemetary");
      }

      // you can only have one cemetary in your city
      const workersInCemetary = cemetary[0].workers;

      if (!workersInCemetary) {
        throw new Error("Invalid cemetary worker list");
      }

      return workersInCemetary.length * 3;
    },
  }),
  // activate all production cards
  [EventName.SPECIAL_TAX_RELIEF]: new Event({
    name: EventName.SPECIAL_TAX_RELIEF,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.JUDGE, CardName.QUEEN],
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      return "Not Implemented";
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
    /* canPlayCheckInnerRequiresCards([CardName.JUDGE, CardName.QUEEN]),*/
    // TODO: add playInner
    pointsInner: (gameState: GameState, playerId: string) => {
      return 3;
    },
  }),
  [EventName.SPECIAL_THE_EVERDELL_GAMES]: new Event({
    name: EventName.SPECIAL_THE_EVERDELL_GAMES,
    type: EventType.SPECIAL,
    baseVP: 9,
    canPlayCheckInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      const cardTypeList = [
        CardType.PROSPERITY,
        CardType.GOVERNANCE,
        CardType.PRODUCTION,
        CardType.TRAVELER,
        CardType.DESTINATION,
      ];
      for (let i = 0; i < cardTypeList.length; i++) {
        if (player.getNumCardType(cardTypeList[i]) < 2) {
          return `Need to have at least 2 ${
            cardTypeList[i]
          } cards to claim event. Got: ${player.getNumCardType(
            cardTypeList[i]
          )}`;
        }
      }
      return null;
    },
  }),
  [EventName.SPECIAL_UNDER_NEW_MANAGEMENT]: new Event({
    name: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.PEDDLER, CardName.GENERAL_STORE],
    canPlayCheckInner: canPlayCheckInnerRequiresCards([
      CardName.PEDDLER,
      CardName.GENERAL_STORE,
    ]),
    playedEventInfoInner: () => ({
      storedResources: {
        [ResourceType.TWIG]: 0,
        [ResourceType.RESIN]: 0,
        [ResourceType.PEBBLE]: 0,
        [ResourceType.BERRY]: 0,
      },
    }),
    // place up to 3 resources on event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // ask player how many resources to add to card
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
          maxResources: 3,
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

        if (numResources > 3) {
          throw new Error("too many resources");
        }

        const eventInfo =
          player.claimedEvents[EventName.SPECIAL_UNDER_NEW_MANAGEMENT];

        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // add berries to this event
        eventInfo.storedResources = resources;

        // remove berries from player's supply
        player.spendResources({
          [ResourceType.TWIG]: resources[ResourceType.TWIG] || 0,
          [ResourceType.RESIN]: resources[ResourceType.RESIN] || 0,
          [ResourceType.PEBBLE]: resources[ResourceType.PEBBLE] || 0,
          [ResourceType.BERRY]: resources[ResourceType.BERRY] || 0,
        });
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 1 pt per twig and berry, 2 pt per resin and pebble
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_UNDER_NEW_MANAGEMENT];

      if (!eventInfo) {
        throw new Error("Invalid event info");
      }

      const resources = eventInfo.storedResources;
      if (!resources) {
        throw new Error("Invalid resources list");
      }
      if (
        !resources[ResourceType.BERRY] ||
        !resources[ResourceType.TWIG] ||
        !resources[ResourceType.RESIN] ||
        !resources[ResourceType.PEBBLE]
      ) {
        throw new Error("Resource is undefined");
      }

      return (
        (resources[ResourceType.BERRY] || 0) +
        (resources[ResourceType.TWIG] || 0) +
        (resources[ResourceType.RESIN] || 0) * 2 +
        (resources[ResourceType.PEBBLE] || 0) * 2
      );
    },
  }),
};

export const initialEventMap = (): EventNameToPlayerId => {
  const ret: EventNameToPlayerId = {};
  [...Event.byType(EventType.BASIC)].forEach((ty) => {
    ret[ty] = null;
  });

  const specialEvents = shuffle(Event.byType(EventType.SPECIAL));
  if (specialEvents.length < 4) {
    throw new Error("Not enough Special Events available");
  }

  const chosenSpecialEvents = specialEvents.slice(0, 4);
  [...chosenSpecialEvents].forEach((ty) => {
    ret[ty] = null;
  });

  return ret;
};

/*
 * Helpers
 */
function canPlayCheckInnerRequiresCards(
  cards: CardName[]
): GameStateCanPlayCheckFn {
  return (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
      for (let i = 0; i < cards.length; i++) {
        if (!player.hasCardInCity(cards[i])) {
          return `Need to have played ${cards[i]} to claim event`;
        }
      }
    }
    return null;
  };
}
