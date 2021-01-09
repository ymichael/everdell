import {
  CardName,
  EventName,
  Season,
  ResourceType,
  PlayedCardInfo,
  PlayedEventInfo,
  PlayerStatus,
  WorkerPlacementInfo,
  GameInputMultiStep,
  EventNameToPlayerId,
  GameLogEntry,
  LocationNameToPlayerIds,
} from "./types";

export type GameJSON = {
  gameId: string;
  gameSecret: string;
  gameState: GameStateJSON;
};

export type GameStateJSON = {
  gameStateId: number;
  activePlayerId: string;
  players: PlayerJSON[];
  meadowCards: CardName[];
  discardPile: CardStackJSON;
  deck: CardStackJSON;
  locationsMap: LocationNameToPlayerIds;
  eventsMap: EventNameToPlayerId;
  pendingGameInputs: GameInputMultiStep[];
  gameLog: GameLogEntry[];
};

export type CardStackJSON = {
  name: string;
  numCards: number;
  cards: CardName[];
};

export type PlayerJSON = {
  name: string;
  playerSecret?: string;
  playerId: string;
  playedCards: Partial<Record<CardName, PlayedCardInfo[]>>;
  numCardsInHand: number;
  cardsInHand: CardName[];
  resources: {
    [ResourceType.VP]: number;
    [ResourceType.TWIG]: number;
    [ResourceType.BERRY]: number;
    [ResourceType.PEBBLE]: number;
    [ResourceType.RESIN]: number;
  };
  currentSeason: Season;
  numWorkers: number;
  claimedEvents: Partial<Record<EventName, PlayedEventInfo>>;
  placedWorkers: WorkerPlacementInfo[];
  playerStatus: PlayerStatus;
};
