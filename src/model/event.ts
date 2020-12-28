import {
  CardName,
  CardType,
  EventType,
  EventName,
  EventNameToPlayerId,
  GameInput,
  GameInputType,
  PlayedCardInfo,
  ResourceType,
} from "./types";
import { Card } from "./card";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayFn,
} from "./gameState";

export class Event {
  readonly playInner: GameStatePlayFn | undefined;
  readonly playedCardInfoInner: (() => PlayedCardInfo) | undefined;
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
    playedCardInfoInner, // used for cards that accumulate other cards or resources
    pointsInner, // computed if specified + added to base points
  }: {
    name: EventName;
    type: EventType;
    baseVP: number;
    canPlayInner: GameStateCanPlayFn;
    playInner?: GameStatePlayFn;
    playedCardInfoInner?: () => PlayedCardInfo;
    pointsInner?: (gameState: GameState, playerId: string) => number;
  }) {
    this.name = name;
    this.type = type;
    this.baseVP = baseVP;
    this.canPlayInner = canPlayInner;
    this.playInner = playInner;
    this.playedCardInfoInner = playedCardInfoInner;
    this.pointsInner = pointsInner;
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    if (!(this.name in gameState.eventsMap)) {
      return false;
    }
    if (gameState.getActivePlayer().numAvailableWorkers <= 0) {
      return false;
    }
    if (this.canPlayInner && !this.canPlayInner(gameState, gameInput)) {
      return false;
    }
    return true;
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

// TODO: add worker placement rules
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
    baseVP: 0,
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      return player.getNumCardType(CardType.TRAVELER) >= 3;
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
    playedCardInfoInner: () => ({
      pairedCards: [],
    }),
    // play up to 3 critters from your hand beneath this event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType !== GameInputType.CLAIM_EVENT) {
        throw new Error("Invalid input type");
      }
      if (!gameInput.clientOptions) {
        throw new Error("Invalid input");
      }
      const cardsToUse = gameInput.clientOptions.cardsToUse;
      if (cardsToUse && cardsToUse.length > 3) {
        throw new Error("Too many cards");
      }

      for (let cardName in cardsToUse) {
        let card = Card.fromName(cardName as CardName);
        if (!card.isCritter) {
          throw new Error("Can only put Critters beneath this event");
        }
      }
      const eventInfo =
        player?.claimedEvents[EventName.SPECIAL_GRADUATION_OF_SCHOLARS];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      // remove cards from hand
      for (let cardName in cardsToUse) {
        player.removeCardFromHand(cardName as CardName);
        (eventInfo.pairedCards = eventInfo.pairedCards || []).push(cardName);
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
      return (eventInfo.pairedCards = eventInfo.pairedCards || []).length * 2;
    },
  }),
  [EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN]: new Event({
    name: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.SHOPKEEPER,
      CardName.POST_OFFICE,
    ]),
    // TODO: add playInner
    // TODO: add pointsInner
  }),
  [EventName.SPECIAL_PERFORMER_IN_RESIDENCE]: new Event({
    name: EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: canPlayInnerRequiresCards([CardName.INN, CardName.BARD]),
    // may place up to 3 berries on this card
    playedCardInfoInner: () => ({
      resources: {
        [ResourceType.BERRY]: 0,
      },
    }),
    // place up to 3 berries on event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType !== GameInputType.CLAIM_EVENT) {
        throw new Error("Invalid input type");
      }
      if (!gameInput.clientOptions) {
        throw new Error("Invalid input");
      }
      const eventInfo =
        player?.claimedEvents[EventName.SPECIAL_PERFORMER_IN_RESIDENCE];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const resources = gameInput.clientOptions.resourcesToSpend;
      if (!resources) {
        throw new Error("Invalid resources list");
      }
      const numBerriesToSpend = resources[ResourceType.BERRY];
      if (!numBerriesToSpend) {
        throw new Error("Invalid number of berries");
      }
      if (numBerriesToSpend > 3) {
        throw new Error("Cannot place more than 3 berries on this card");
      }

      // add berries to this event
      eventInfo.resources = eventInfo.resources || { [ResourceType.BERRY]: 0 };
      eventInfo.resources[ResourceType.BERRY] = numBerriesToSpend;

      // remove berries from player's supply
      player.spendResources({ [ResourceType.BERRY]: numBerriesToSpend });
    },
    // 2 points per berry on event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_PERFORMER_IN_RESIDENCE];

      if (!eventInfo) {
        throw new Error("Invalid event info");
      }

      const resources = eventInfo.resources;
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
  [EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES]: new Event({
    name: EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.COURTHOUSE,
      CardName.RANGER,
    ]),
    playedCardInfoInner: () => ({
      pairedCards: [],
    }),
    // play up to 2 critters from your city beneath this event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType !== GameInputType.CLAIM_EVENT) {
        throw new Error("Invalid input type");
      }
      if (!gameInput.clientOptions) {
        throw new Error("Invalid input");
      }
      const cardsToUse = gameInput.clientOptions.cardsToUse;
      if (cardsToUse && cardsToUse.length > 2) {
        throw new Error("Too many cards");
      }

      for (let cardName in cardsToUse) {
        let card = Card.fromName(cardName as CardName);
        if (!card.isCritter) {
          throw new Error("Can only put Critters beneath this event");
        }
      }
      const eventInfo =
        player?.claimedEvents[EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      // remove cards from city
      for (let cardName in cardsToUse) {
        player.removeCardFromCity(cardName as CardName);
        (eventInfo.pairedCards = eventInfo.pairedCards || []).push(cardName);
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
      return (eventInfo.pairedCards = eventInfo.pairedCards || []).length * 3;
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
  [EventName.SPECIAL_CROAK_WART_CURE]: new Event({
    name: EventName.SPECIAL_CROAK_WART_CURE,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const playedCards = player.playedCards;

      const cards = [CardName.UNDERTAKER, CardName.BARGE_TOAD];
      return (
        cards.every((card) => player.hasPlayedCard(card)) &&
        player.getNumResource(ResourceType.BERRY) >= 2
      );
    },
    // play up to 2 critters from your city beneath this event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType !== GameInputType.CLAIM_EVENT) {
        throw new Error("Invalid input type");
      }
      if (!gameInput.clientOptions) {
        throw new Error("Invalid input");
      }
      const cardsToUse = gameInput.clientOptions.cardsToUse;
      if (cardsToUse && cardsToUse.length > 2) {
        throw new Error("Too many cards");
      }

      const eventInfo =
        player?.claimedEvents[EventName.SPECIAL_CROAK_WART_CURE];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      // remove cards from city
      for (let cardName in cardsToUse) {
        player.removeCardFromCity(cardName as CardName);
      }
      // remove berries from player's supply
      player.spendResources({ [ResourceType.BERRY]: 2 });
    },
  }),
  [EventName.SPECIAL_AN_EVENING_OF_FIREWORKS]: new Event({
    name: EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.LOOKOUT,
      CardName.MINER_MOLE,
    ]),
    playedCardInfoInner: () => ({
      resources: {
        [ResourceType.TWIG]: 0,
      },
    }),
    // place up to 3 twigs on event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType !== GameInputType.CLAIM_EVENT) {
        throw new Error("Invalid input type");
      }
      if (!gameInput.clientOptions) {
        throw new Error("Invalid input");
      }
      const eventInfo =
        player?.claimedEvents[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const resources = gameInput.clientOptions.resourcesToSpend;
      if (!resources) {
        throw new Error("Invalid resources list");
      }
      const numTwigsToSpend = resources[ResourceType.TWIG];
      if (!numTwigsToSpend) {
        throw new Error("Invalid number of twigs");
      }
      if (numTwigsToSpend > 3) {
        throw new Error("Cannot place more than 3 twigs on this card");
      }

      // add twigs to this event
      eventInfo.resources = eventInfo.resources || { [ResourceType.TWIG]: 0 };
      eventInfo.resources[ResourceType.TWIG] = numTwigsToSpend;

      // remove twigs from player's supply
      player.spendResources({ [ResourceType.TWIG]: numTwigsToSpend });
    },
    // 2 points per twig on event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS];

      if (!eventInfo) {
        throw new Error("Invalid event info");
      }

      const resources = eventInfo.resources;
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
  [EventName.SPECIAL_A_WEE_RUN_CITY]: new Event({
    name: EventName.SPECIAL_A_WEE_RUN_CITY,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.CHIP_SWEEP,
      CardName.CLOCK_TOWER,
    ]),
    // TODO: add playInner
    pointsInner: (gameState: GameState, playerId: string) => {
      return 4;
    },
  }),
  [EventName.SPECIAL_TAX_RELIEF]: new Event({
    name: EventName.SPECIAL_TAX_RELIEF,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: canPlayInnerRequiresCards([CardName.JUDGE, CardName.QUEEN]),
    // TODO: add playInner
    pointsInner: (gameState: GameState, playerId: string) => {
      return 3;
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
    playedCardInfoInner: () => ({
      resources: {
        [ResourceType.TWIG]: 0,
        [ResourceType.RESIN]: 0,
        [ResourceType.PEBBLE]: 0,
        [ResourceType.BERRY]: 0,
      },
    }),
    // place up to 3 resources on event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType !== GameInputType.CLAIM_EVENT) {
        throw new Error("Invalid input type");
      }
      if (!gameInput.clientOptions) {
        throw new Error("Invalid input");
      }
      const eventInfo =
        player?.claimedEvents[EventName.SPECIAL_UNDER_NEW_MANAGEMENT];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const resourcesToSpend = gameInput.clientOptions.resourcesToSpend;
      if (!resourcesToSpend) {
        throw new Error("Invalid resources list");
      }

      // add resources to this event
      eventInfo.resources = resourcesToSpend;

      // remove resources from player's supply
      player.spendResources(resourcesToSpend);
    },
    // 1 pt per twig and berry, 2 pt per resin and pebble
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_UNDER_NEW_MANAGEMENT];

      if (!eventInfo) {
        throw new Error("Invalid event info");
      }

      const resources = eventInfo.resources;
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
  [EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED]: new Event({
    name: EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.HISTORIAN,
      CardName.RUINS,
    ]),
    playedCardInfoInner: () => ({
      pairedCards: [],
    }),
    // TODO: add playInner
    // TODO: add pointsInner
  }),
  [EventName.SPECIAL_FLYING_DOCTOR_SERVICE]: new Event({
    name: EventName.SPECIAL_FLYING_DOCTOR_SERVICE,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.DOCTOR,
      CardName.POSTAL_PIGEON,
    ]),
    // TODO: add playInner
    // TODO: add pointsInner
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
        throw new Error("Cannot have more thna one monestary");
      }

      // you can only have one monestary in your city
      const workersInMonestary = monestary[0].workers;

      if (!workersInMonestary) {
        throw new Error("Invalid monestary worker list");
      }

      return workersInMonestary.length * 3;
    },
  }),
  [EventName.SPECIAL_CROAK_WART_CURE]: new Event({
    name: EventName.SPECIAL_CROAK_WART_CURE,
    type: EventType.SPECIAL,
    baseVP: 0,
    canPlayInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const playedCards = player.playedCards;

      const cards = [CardName.UNDERTAKER, CardName.BARGE_TOAD];
      return (
        cards.every((card) => player.hasPlayedCard(card)) &&
        player.getNumResource(ResourceType.BERRY) >= 2
      );
    },
    // play up to 2 critters from your city beneath this event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType !== GameInputType.CLAIM_EVENT) {
        throw new Error("Invalid input type");
      }
      if (!gameInput.clientOptions) {
        throw new Error("Invalid input");
      }
      const cardsToUse = gameInput.clientOptions.cardsToUse;
      if (cardsToUse && cardsToUse.length > 2) {
        throw new Error("Too many cards");
      }

      const eventInfo =
        player?.claimedEvents[EventName.SPECIAL_CROAK_WART_CURE];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      // remove cards from city
      for (let cardName in cardsToUse) {
        player.removeCardFromCity(cardName as CardName);
      }
      // remove berries from player's supply
      player.spendResources({ [ResourceType.BERRY]: 2 });
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

      let totalGainedResources =
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
};

export const initialEventMap = (): EventNameToPlayerId => {
  const ret: EventNameToPlayerId = {};
  [...Event.byType(EventType.BASIC)].forEach((ty) => {
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
