import {
  CardName,
  EventType,
  EventName,
  EventNameToPlayerId,
  GameInput,
  PlayedCardInfo,
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
  readonly canPlayInner: GameStateCanPlayFn | undefined;
  readonly playedCardInfoInner: (() => PlayedCardInfo) | undefined;
  readonly pointsInner: ((gameState: GameState) => number) | undefined;

  readonly name: EventName;
  readonly type: EventType;

  constructor({
    name,
    type,
    playInner, // called when the card is played
    canPlayInner, // called when we check canPlay function
    playedCardInfoInner, // used for cards that accumulate other cards or resources
    pointsInner, // computed if specified + added to base points
  }: {
    name: EventName;
    type: EventType;
    playInner?: GameStatePlayFn;
    canPlayInner?: GameStateCanPlayFn;
    playedCardInfoInner?: () => PlayedCardInfo;
    pointsInner?: (gameState: GameState) => number;
  }) {
    this.name = name;
    this.type = type;
    this.playInner = playInner;
    this.canPlayInner = canPlayInner;
    this.playedCardInfoInner = playedCardInfoInner;
    this.pointsInner = pointsInner;
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
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      const playedCards = player.playedCards;

      return player.getNumProductionCards() >= 4;
    },
  }),
  [EventName.BASIC_THREE_DESTINATION]: new Event({
    name: EventName.BASIC_THREE_DESTINATION,
    type: EventType.BASIC,
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      const playedCards = player.playedCards;

      return player.getNumDestinationCards() >= 3;
    },
  }),
  [EventName.BASIC_THREE_GOVERNANCE]: new Event({
    name: EventName.BASIC_THREE_GOVERNANCE,
    type: EventType.BASIC,
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      const playedCards = player.playedCards;

      return player.getNumGovernanceCards() >= 3;
    },
  }),
  [EventName.BASIC_THREE_TRAVELER]: new Event({
    name: EventName.BASIC_THREE_TRAVELER,
    type: EventType.BASIC,
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      const playedCards = player.playedCards;

      return player.getNumTravelerCards() >= 3;
    },
  }),
  [EventName.SPECIAL_GRADUATION_OF_SCHOLARS]: new Event({
    name: EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_GRADUATION_OF_SCHOLARS
    ),
  }),
  [EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN]: new Event({
    name: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN
    ),
  }),
  [EventName.SPECIAL_PERFORMER_IN_RESIDENCE]: new Event({
    name: EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_PERFORMER_IN_RESIDENCE
    ),
  }),
  [EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES]: new Event({
    name: EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES
    ),
  }),
  [EventName.SPECIAL_MINISTERING_TO_MISCREANTS]: new Event({
    name: EventName.SPECIAL_MINISTERING_TO_MISCREANTS,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_MINISTERING_TO_MISCREANTS
    ),
  }),
  [EventName.SPECIAL_CROAK_WART_CURE]: new Event({
    name: EventName.SPECIAL_CROAK_WART_CURE,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(EventName.SPECIAL_CROAK_WART_CURE),
  }),
  [EventName.SPECIAL_AN_EVENING_OF_FIREWORKS]: new Event({
    name: EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_AN_EVENING_OF_FIREWORKS
    ),
  }),
  [EventName.SPECIAL_A_WEE_RUN_CITY]: new Event({
    name: EventName.SPECIAL_A_WEE_RUN_CITY,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(EventName.SPECIAL_A_WEE_RUN_CITY),
  }),
  [EventName.SPECIAL_TAX_RELIEF]: new Event({
    name: EventName.SPECIAL_TAX_RELIEF,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(EventName.SPECIAL_TAX_RELIEF),
  }),
  [EventName.SPECIAL_UNDER_NEW_MANAGEMENT]: new Event({
    name: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_UNDER_NEW_MANAGEMENT
    ),
  }),
  [EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED]: new Event({
    name: EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
    ),
  }),
  [EventName.SPECIAL_FLYING_DOCTOR_SERVICE]: new Event({
    name: EventName.SPECIAL_FLYING_DOCTOR_SERVICE,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_FLYING_DOCTOR_SERVICE
    ),
  }),
  [EventName.SPECIAL_PATH_OF_THE_PILGRIMS]: new Event({
    name: EventName.SPECIAL_PATH_OF_THE_PILGRIMS,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_PATH_OF_THE_PILGRIMS
    ),
  }),
  [EventName.SPECIAL_REMEMBERING_THE_FALLEN]: new Event({
    name: EventName.SPECIAL_REMEMBERING_THE_FALLEN,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_REMEMBERING_THE_FALLEN
    ),
  }),
  [EventName.SPECIAL_PRISTINE_CHAPEL_CEILING]: new Event({
    name: EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards(
      EventName.SPECIAL_PRISTINE_CHAPEL_CEILING
    ),
  }),
  [EventName.SPECIAL_THE_EVERDELL_GAMES]: new Event({
    name: EventName.SPECIAL_THE_EVERDELL_GAMES,
    type: EventType.SPECIAL,
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      const playedCards = player.playedCards;

      return (
        player.getNumProsperityCards() >= 2 &&
        player.getNumGovernanceCards() >= 2 &&
        player.getNumProductionCards() >= 2 &&
        player.getNumDestinationCards() >= 2 &&
        player.getNumTravelerCards() >= 2
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

var requiredCardsMap = {
  // these events require the player to have certain cards in order to play
  SPECIAL_GRADUATION_OF_SCHOLARS: [CardName.TEACHER, CardName.UNIVERSITY],
  SPECIAL_A_BRILLIANT_MARKETING_PLAN: [
    CardName.SHOPKEEPER,
    CardName.POST_OFFICE,
  ],
  SPECIAL_PERFORMER_IN_RESIDENCE: [CardName.INN, CardName.BARD],
  SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES: [CardName.COURTHOUSE, CardName.RANGER],
  SPECIAL_MINISTERING_TO_MISCREANTS: [CardName.MONK, CardName.DUNGEON],
  SPECIAL_CROAK_WART_CURE: [CardName.UNDERTAKER, CardName.BARGE_TOAD],
  SPECIAL_AN_EVENING_OF_FIREWORKS: [CardName.LOOKOUT, CardName.MINER_MOLE],
  SPECIAL_A_WEE_RUN_CITY: [CardName.CHIP_SWEEP, CardName.CLOCK_TOWER],
  SPECIAL_TAX_RELIEF: [CardName.JUDGE, CardName.QUEEN],
  SPECIAL_UNDER_NEW_MANAGEMENT: [CardName.PEDDLER, CardName.GENERAL_STORE],
  SPECIAL_ANCIENT_SCROLLS_DISCOVERED: [CardName.HISTORIAN, CardName.RUINS],
  SPECIAL_FLYING_DOCTOR_SERVICE: [CardName.DOCTOR, CardName.POSTAL_PIGEON],
  SPECIAL_PATH_OF_THE_PILGRIMS: [CardName.MONASTERY, CardName.WANDERER],
  SPECIAL_REMEMBERING_THE_FALLEN: [CardName.CEMETARY, CardName.SHEPHERD],
  SPECIAL_PRISTINE_CHAPEL_CEILING: [CardName.WOODCARVER, CardName.CHAPEL],

  // these events do not have specific card requirements
  SPECIAL_THE_EVERDELL_GAMES: [],
  BASIC_FOUR_PRODUCTION_TAGS: [],
  BASIC_THREE_DESTINATION: [],
  BASIC_THREE_GOVERNANCE: [],
  BASIC_THREE_TRAVELER: [],
};

function canPlayInnerRequiresCards(eventName: EventName): GameStateCanPlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    var requiredCards = requiredCardsMap[eventName];

    for (var requiredCard in requiredCards) {
      var hasCard = player.playedCards[requiredCard as CardName];
      if (!hasCard) {
        return false;
      }
    }

    return true;
  };
}
