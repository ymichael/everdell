import {
  CardName,
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
  readonly canPlayInner: GameStateCanPlayFn | undefined;
  readonly playedCardInfoInner: (() => PlayedCardInfo) | undefined;
  readonly pointsInner:
    | ((gameState: GameState, playerId: string) => number)
    | undefined;

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
    pointsInner?: (gameState: GameState, playerId: string) => number;
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

// TODO: add worker placement rules
const EVENT_REGISTRY: Record<EventName, Event> = {
  [EventName.BASIC_FOUR_PRODUCTION_TAGS]: new Event({
    name: EventName.BASIC_FOUR_PRODUCTION_TAGS,
    type: EventType.BASIC,
    canPlayInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      const playedCards = player.playedCards;

      return player.getNumProductionCards() >= 4;
    },
    pointsInner: (gameState: GameState, playerId: string) => {
      return 3;
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
    pointsInner: (gameState: GameState, playerId: string) => {
      return 3;
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
    pointsInner: (gameState: GameState, playerId: string) => {
      return 3;
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
    pointsInner: (gameState: GameState, playerId: string) => {
      return 3;
    },
  }),
  [EventName.SPECIAL_GRADUATION_OF_SCHOLARS]: new Event({
    name: EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
    type: EventType.SPECIAL,
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
      var cardsToUse = gameInput.clientOptions.cardsToUse;
      if (cardsToUse && cardsToUse.length > 3) {
        throw new Error("Too many cards");
      }

      for (var cardName in cardsToUse) {
        var card = Card.fromName(cardName as CardName);
        if (!card.isCritter) {
          throw new Error("Can only put Critters beneath this event");
        }
      }
      var eventInfo =
        player?.claimedEvents[EventName.SPECIAL_GRADUATION_OF_SCHOLARS];
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      // remove cards from hand
      for (var cardName in cardsToUse) {
        player.removeCardFromHand(cardName as CardName);
        (eventInfo.pairedCards = eventInfo.pairedCards || []).push(cardName);
      }
    },
    // 2 points per critter beneath event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      var eventInfo =
        player.claimedEvents[EventName.SPECIAL_GRADUATION_OF_SCHOLARS];
      if (eventInfo) {
        return (eventInfo.pairedCards = eventInfo.pairedCards || []).length * 3;
      }
      return 0;
    },
  }),
  [EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN]: new Event({
    name: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.SHOPKEEPER,
      CardName.POST_OFFICE,
    ]),
  }),
  [EventName.SPECIAL_PERFORMER_IN_RESIDENCE]: new Event({
    name: EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([CardName.INN, CardName.BARD]),
    // may place up to 3 berries on this card
    playedCardInfoInner: () => ({
      resources: {
        [ResourceType.BERRY]: 0,
      },
    }),
  }),
  [EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES]: new Event({
    name: EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.COURTHOUSE,
      CardName.RANGER,
    ]),
    playedCardInfoInner: () => ({
      pairedCards: [],
    }),
  }),
  [EventName.SPECIAL_MINISTERING_TO_MISCREANTS]: new Event({
    name: EventName.SPECIAL_MINISTERING_TO_MISCREANTS,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([CardName.MONK, CardName.DUNGEON]),
  }),
  [EventName.SPECIAL_CROAK_WART_CURE]: new Event({
    name: EventName.SPECIAL_CROAK_WART_CURE,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.UNDERTAKER,
      CardName.BARGE_TOAD,
    ]),
  }),
  [EventName.SPECIAL_AN_EVENING_OF_FIREWORKS]: new Event({
    name: EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.LOOKOUT,
      CardName.MINER_MOLE,
    ]),
    playedCardInfoInner: () => ({
      resources: {
        [ResourceType.TWIG]: 0,
      },
    }),
  }),
  [EventName.SPECIAL_A_WEE_RUN_CITY]: new Event({
    name: EventName.SPECIAL_A_WEE_RUN_CITY,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.CHIP_SWEEP,
      CardName.CLOCK_TOWER,
    ]),
  }),
  [EventName.SPECIAL_TAX_RELIEF]: new Event({
    name: EventName.SPECIAL_TAX_RELIEF,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([CardName.JUDGE, CardName.QUEEN]),
  }),
  [EventName.SPECIAL_UNDER_NEW_MANAGEMENT]: new Event({
    name: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
    type: EventType.SPECIAL,
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
  }),
  [EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED]: new Event({
    name: EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.HISTORIAN,
      CardName.RUINS,
    ]),
    playedCardInfoInner: () => ({
      pairedCards: [],
    }),
  }),
  [EventName.SPECIAL_FLYING_DOCTOR_SERVICE]: new Event({
    name: EventName.SPECIAL_FLYING_DOCTOR_SERVICE,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.DOCTOR,
      CardName.POSTAL_PIGEON,
    ]),
  }),
  [EventName.SPECIAL_PATH_OF_THE_PILGRIMS]: new Event({
    name: EventName.SPECIAL_PATH_OF_THE_PILGRIMS,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.MONASTERY,
      CardName.WANDERER,
    ]),
  }),
  [EventName.SPECIAL_REMEMBERING_THE_FALLEN]: new Event({
    name: EventName.SPECIAL_REMEMBERING_THE_FALLEN,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.CEMETARY,
      CardName.SHEPHERD,
    ]),
  }),
  [EventName.SPECIAL_PRISTINE_CHAPEL_CEILING]: new Event({
    name: EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
    type: EventType.SPECIAL,
    canPlayInner: canPlayInnerRequiresCards([
      CardName.WOODCARVER,
      CardName.CHAPEL,
    ]),
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
    pointsInner: (gameState: GameState, playerId: string) => {
      return 9;
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
