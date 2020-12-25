export enum ResourceType {
  TWIG = "TWIG",
  RESIN = "RESIN",
  BERRY = "BERRY",
  STONE = "STONE",
  WILD = "WILD",
  WILD_BUT_NOT_BERRY = "WILD_BUT_NOT_BERRY",
  VP = "VP",
}

export type ResourceMap = {
  [ResourceType.VP]?: number;
  [ResourceType.TWIG]?: number;
  [ResourceType.BERRY]?: number;
  [ResourceType.STONE]?: number;
  [ResourceType.RESIN]?: number;
  [ResourceType.WILD]?: number;
  [ResourceType.WILD_BUT_NOT_BERRY]?: number;
};

export type CardCost = {
  [ResourceType.TWIG]?: number;
  [ResourceType.BERRY]?: number;
  [ResourceType.STONE]?: number;
  [ResourceType.RESIN]?: number;
  [ResourceType.WILD]?: number;
  [ResourceType.WILD_BUT_NOT_BERRY]?: number;
};

export interface IGame {
  readonly gameId: string;
  readonly gameState: IGameState;
}

export type IGameState = {
  readonly activePlayer: IPlayer;
  readonly players: IPlayer[];
  readonly locations: ILocation[];
  readonly meadowCards: ICard[];
  readonly events: IEvent[];
  readonly pendingGameInput: GameInput | null;
};

export interface IPlayer {
  name: string;
  playedCards: ICard[];
  cardsInHand: ICard[];
  resources: {
    [ResourceType.VP]: number;
    [ResourceType.TWIG]: number;
    [ResourceType.BERRY]: number;
    [ResourceType.STONE]: number;
    [ResourceType.RESIN]: number;
  };
  currentSeason: Season;

  // TBD
  numWorkers: number;
  numAvailableWorkers: number;
}

export enum GameInputType {
  PLAY_CARD = "PLAY_CARD",
  PLACE_WORKER = "PLACE_WORKER",
  CLAIM_EVENT = "CLAIM_EVENT",
  PREPARE_FOR_SEASON = "PREPARE_FOR_SEASON",

  PAY_FOR_CARD = "PAY_FOR_CARD",
  DRAW_CARDS = "DRAW_CARDS",
  GAIN_RESOURCES = "GAIN_RESOURCES",
  SPEND_RESOURCES = "SPEND_RESOURCES",
  DISCARD_CARDS = "DISCARD_CARDS",
}

export type GameInput =
  | {
      inputType: GameInputType.PLAY_CARD;
      player: IPlayer;
      card: ICard;
    }
  | {
      inputType: GameInputType.PLACE_WORKER;
      player: IPlayer;
      location: ILocation;
    }
  | {
      inputType: GameInputType.CLAIM_EVENT;
      player: IPlayer;
      event: IEvent;
    }
  | {
      inputType: GameInputType.PREPARE_FOR_SEASON;
      player: IPlayer;
    }
  | {
      inputType: GameInputType.PAY_FOR_CARD;
      player: IPlayer;
    }
  | {
      inputType: GameInputType.DRAW_CARDS;
      player: IPlayer;
      count: number;
    }
  | {
      inputType: GameInputType.GAIN_RESOURCES;
      player: IPlayer;
      resources: ResourceMap;
    }
  | {
      inputType: GameInputType.SPEND_RESOURCES;
      player: IPlayer;
      resources: ResourceMap;
    }
  | {
      inputType: GameInputType.DISCARD_CARDS;
      player: IPlayer | null;
      count: number;
    };

export enum Season {
  WINTER = "WINTER",
  SPRING = "SPRING",
  SUMMER = "SUMMER",
  AUTUMN = "AUTUMN",
}

export enum CardType {
  TRAVELER = "TRAVELER", // Tan
  PRODUCTION = "PRODUCTION", // Green
  DESTINATION = "DESTINATION", // Red
  GOVERNANCE = "GOVERNANCE", // Blue
  PROSPERITY = "PROSPERITY", // Purple
}

export interface ICard {
  name: string;
  rawCost: CardCost;
  cardType: CardType;
  isUnique: boolean;
  isCritter: boolean;
  isConstruction: boolean;

  associatedCard: string | null;
  getPointTotal(player: IPlayer): number;
}

export enum LocationType {
  BASIC = "BASIC",
  FOREST = "FOREST",
  HAVEN = "HAVEN",
  JOURNEY = "JOURNEY",
}

export interface ILocation {
  name: string;
  locationType: LocationType;
}

export enum EventType {
  BASIC = "BASIC",
  SPECIAL = "SPECIAL",
}

export interface IEvent {
  eventType: EventType;
}
