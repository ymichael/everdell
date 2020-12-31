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
  GameStateCanPlayFn,
} from "./gameState";
import shuffle from "lodash/shuffle";

export class Event implements GameStatePlayable {
  readonly playInner: GameStatePlayFn | undefined;
  readonly playedEventInfoInner: (() => PlayedEventInfo) | undefined;
  readonly pointsInner:
    | ((gameState: GameState, playerId: string) => number)
    | undefined;

  readonly name: EventName;
  readonly type: EventType;
  readonly baseVP: number;
  // every event has requirements to play,
  // but not all events result in an action when played
  readonly canPlayInner: GameStateCanPlayFn;

  constructor({
    name,
    type,
    baseVP,
    playInner, // called when the card is played
    canPlayInner, // called when we check canPlay function
    playedEventInfoInner, // used for cards that accumulate other cards or resources
    pointsInner, // computed if specified + added to base points
  }: {
    name: EventName;
    type: EventType;
    baseVP: number;
    canPlayInner: GameStateCanPlayFn;
    playInner?: GameStatePlayFn;
    playedEventInfoInner?: () => PlayedEventInfo;
    pointsInner?: (gameState: GameState, playerId: string) => number;
  }) {
    this.name = name;
    this.type = type;
    this.baseVP = baseVP;
    this.canPlayInner = canPlayInner;
    this.playInner = playInner;
    this.playedEventInfoInner = playedEventInfoInner;
    this.pointsInner = pointsInner;
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    // check whether the event is in the game
    if (!(this.name in gameState.eventsMap)) {
      return false;
    }

    // check whether the event has been playedCards and we're not taking
    // a second action
    if (
      gameState.eventsMap[this.name] &&
      gameInput.inputType == GameInputType.CLAIM_EVENT
    ) {
      return false;
    }

    // check whether the active player has available workers
    if (gameState.getActivePlayer().numAvailableWorkers <= 0) {
      return false;
    }

    // check whether player meets criteria for playing event
    if (this.canPlayInner && !this.canPlayInner(gameState, gameInput)) {
      return false;
    }
    return true;
  }

  play(gameState: GameState, gameInput: GameInput): void {
    if (
      gameInput.inputType !== GameInputType.CLAIM_EVENT &&
      gameInput.inputType !== GameInputType.SELECT_MULTIPLE_CARDS &&
      gameInput.inputType !== GameInputType.SELECT_RESOURCES
    ) {
      throw new Error("Invalid game input type");
    }
    const player = gameState.getActivePlayer();

    if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
      player.claimEvent(this.name);
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
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      return player.getNumCardType(CardType.PRODUCTION) >= 4;
    },
  }),
  [EventName.BASIC_THREE_DESTINATION]: new Event({
    name: EventName.BASIC_THREE_DESTINATION,
    type: EventType.BASIC,
    baseVP: 3,
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      return player.getNumCardType(CardType.DESTINATION) >= 3;
    },
  }),
  [EventName.BASIC_THREE_GOVERNANCE]: new Event({
    name: EventName.BASIC_THREE_GOVERNANCE,
    type: EventType.BASIC,
    baseVP: 3,
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      return player.getNumCardType(CardType.GOVERNANCE) >= 3;
    },
  }),
  [EventName.BASIC_THREE_TRAVELER]: new Event({
    name: EventName.BASIC_THREE_TRAVELER,
    type: EventType.BASIC,
    baseVP: 3,
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      return player.getNumCardType(CardType.TRAVELER) >= 3;
    },
  }),

  [EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN]: new Event({
    name: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: (gameState: GameState, gameInput: GameInput) => {
      return false;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
    /*
    canPlayInnerRequiresCards([
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
    canPlayInner: (gameState: GameState, gameInput: GameInput) => {
      return false;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
    /*
    canPlayInnerRequiresCards([
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
    canPlayInner: canPlayInnerRequiresCards([
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
            resources: [] as CardCost,
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
        eventInfo.storedResources = eventInfo.storedResources || {
          [ResourceType.TWIG]: 0,
        };
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
    canPlayInner: (gameState: GameState, gameInput: GameInput) => {
      return false;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },

    /*
    canPlayInnerRequiresCards([
      CardName.HISTORIAN,
      CardName.RUINS,
    ]),
    */
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
    canPlayInner: canPlayInnerRequiresCards([
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
        let crittersInCity: CardName[] = [];

        const playedCards = Object.keys(player.playedCards) as CardName[];
        playedCards.forEach((cardName) => {
          const card = Card.fromName(cardName as CardName);
          if (card.isCritter) {
            crittersInCity.push(card.name);
          }
          return card.isCritter;
        });

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_MULTIPLE_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
          cardOptions: crittersInCity,
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_MULTIPLE_CARDS) {
        if (!gameInput.clientOptions.selectedCards) {
          throw new Error("invalid input");
        }

        const cardsToUse = gameInput.clientOptions.selectedCards;

        if (cardsToUse.length > 2) {
          throw new Error("Too many cards");
        }

        cardsToUse.forEach((cardName) => {
          const card = Card.fromName(cardName as CardName);
          if (!card.isCritter) {
            throw new Error("Can only put Critters beneath this event");
          }
        });

        const eventInfo =
          player.claimedEvents[EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES];
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // remove cards from city and put under event
        cardsToUse.forEach((cardName) => {
          player.removeCardFromCity(
            gameState,
            cardName as CardName,
            false /* addToDiscardPile */
          );
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
    canPlayInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const cards = [CardName.UNDERTAKER, CardName.BARGE_TOAD];
      return cards.every((card) => player.hasPlayedCard(card)) &&
        gameInput.inputType === GameInputType.CLAIM_EVENT
        ? player.getNumResource(ResourceType.BERRY) >= 2
        : true;
    },
    // pay 2 berries and discard 2 cards from city
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // Remove berries from player's supply
        player.spendResources({ [ResourceType.BERRY]: 2 });

        // ask player to choose which cards to discard
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_MULTIPLE_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_CROAK_WART_CURE,
          cardOptions: Object.keys(player.playedCards) as CardName[],
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_MULTIPLE_CARDS) {
        if (!gameInput.clientOptions.selectedCards) {
          throw new Error("invalid input");
        }
        const cardOptions = gameInput.clientOptions.selectedCards;
        if (cardOptions.length > 2) {
          throw new Error("Too many cards");
        }

        const eventInfo =
          player.claimedEvents[EventName.SPECIAL_CROAK_WART_CURE];
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // TODO: handle case where you have multiple played cards with
        // the same name
        // Remove cards from city
        cardOptions.forEach((cardName) => {
          player.removeCardFromCity(
            gameState,
            cardName as CardName,
            true /* addToDiscardPile */
          );
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
    canPlayInner: canPlayInnerRequiresCards([
      CardName.DOCTOR,
      CardName.POSTAL_PIGEON,
    ]),
    pointsInner: (gameState: GameState, playerId: string) => {
      let numHusbandWifePairs = 0;
      gameState.players.forEach((player) => {
        numHusbandWifePairs += player.numHusbandWifePairs();
      });
      return numHusbandWifePairs * 3;
    },
  }),
  [EventName.SPECIAL_GRADUATION_OF_SCHOLARS]: new Event({
    name: EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: canPlayInnerRequiresCards([
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

        const playedCards = player.cardsInHand;
        playedCards.forEach((cardName) => {
          const card = Card.fromName(cardName as CardName);
          if (card.isCritter) {
            critterCardsInHand.push(card.name);
          }
          return card.isCritter;
        });

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_MULTIPLE_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
          cardOptions: critterCardsInHand,
          maxToSelect: 3,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_MULTIPLE_CARDS) {
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
    canPlayInner: canPlayInnerRequiresCards([CardName.MONK, CardName.DUNGEON]),
    // 3 points for each prisoner in dungeon
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_MINISTERING_TO_MISCREANTS];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const playedCards = player.playedCards;
      if (!playedCards) {
        throw new Error("no cards in city");
      }

      const dungeon = playedCards[CardName.DUNGEON];
      if (!dungeon) {
        throw new Error("No dungeon in city");
      }

      if (dungeon.length > 1) {
        throw new Error("Cannot have more than one dungeon");
      }

      // you can only have one dungeon in your city
      const cardsInDungeon = dungeon[0].pairedCards;

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
    canPlayInner: canPlayInnerRequiresCards([
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
    canPlayInner: canPlayInnerRequiresCards([CardName.INN, CardName.BARD]),
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
            resources: [] as CardCost,
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
        eventInfo.storedResources = eventInfo.storedResources || {
          [ResourceType.BERRY]: 0,
        };
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
    canPlayInner: canPlayInnerRequiresCards([
      CardName.WOODCARVER,
      CardName.CHAPEL,
    ]),
    // draw 1 card and receive 1 resource for each VP on your chapel
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType !== GameInputType.CLAIM_EVENT) {
        throw new Error("Invalid input type");
      }

      if (!gameInput.clientOptions) {
        throw new Error("Invalid input");
      }
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

      player.drawCards(gameState, numVP);
      const resourcesToGain = gameInput.clientOptions.resourcesToGain;

      if (!resourcesToGain) {
        throw new Error("No resources to gain specified");
      }

      // check to make sure we're not trying to gain too many resources
      if (
        !resourcesToGain[ResourceType.BERRY] ||
        !resourcesToGain[ResourceType.TWIG] ||
        !resourcesToGain[ResourceType.RESIN] ||
        !resourcesToGain[ResourceType.PEBBLE]
      ) {
        throw new Error("Resource is undefined");
      }

      const totalGainedResources =
        (resourcesToGain[ResourceType.BERRY] || 0) +
        (resourcesToGain[ResourceType.TWIG] || 0) +
        (resourcesToGain[ResourceType.RESIN] || 0) +
        (resourcesToGain[ResourceType.PEBBLE] || 0);

      if (totalGainedResources > numVP) {
        throw new Error("Can't gain more resources than VP on the Chapel");
      }

      player.gainResources(resourcesToGain);
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
    canPlayInner: canPlayInnerRequiresCards([
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
    canPlayInner: (gameState: GameState, gameInput: GameInput) => {
      return false;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
    /* canPlayInnerRequiresCards([CardName.JUDGE, CardName.QUEEN]),*/
    // TODO: add playInner
    pointsInner: (gameState: GameState, playerId: string) => {
      return 3;
    },
  }),
  [EventName.SPECIAL_THE_EVERDELL_GAMES]: new Event({
    name: EventName.SPECIAL_THE_EVERDELL_GAMES,
    type: EventType.SPECIAL,
    baseVP: 9,
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      return (
        player.getNumCardType(CardType.PROSPERITY) >= 2 &&
        player.getNumCardType(CardType.GOVERNANCE) >= 2 &&
        player.getNumCardType(CardType.PRODUCTION) >= 2 &&
        player.getNumCardType(CardType.TRAVELER) >= 2 &&
        player.getNumCardType(CardType.DESTINATION) >= 2
      );
    },
  }),
  [EventName.SPECIAL_UNDER_NEW_MANAGEMENT]: new Event({
    name: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: canPlayInnerRequiresCards([
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
      throw new Error("Not Implemented");
      // const player = gameState.getActivePlayer();
      // if (gameInput.inputType !== GameInputType.CLAIM_EVENT) {
      //   throw new Error("Invalid input type");
      // }
      // if (!gameInput.clientOptions) {
      //   throw new Error("Invalid input");
      // }
      // const eventInfo =
      //   player?.claimedEvents[EventName.SPECIAL_UNDER_NEW_MANAGEMENT];
      // if (!eventInfo) {
      //   throw new Error("Cannot find event info");
      // }

      // const resourcesToSpend = gameInput.clientOptions.resourcesToSpend;
      // if (!resourcesToSpend) {
      //   throw new Error("Invalid resources list");
      // }

      // // add resources to this event
      // eventInfo.storedResources = resourcesToSpend;

      // // remove resources from player's supply
      // player.spendResources(resourcesToSpend);
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
function canPlayInnerRequiresCards(cards: CardName[]): GameStateCanPlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    return cards.every((card) => player.hasPlayedCard(card));
  };
}
