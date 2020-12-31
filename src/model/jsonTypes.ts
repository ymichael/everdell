import {
  CardName,
  EventName,
  Season,
  ResourceType,
  PlayedCardInfo,
  PlayedEventInfo,
  WorkerPlacementInfo,
  GameInputMultiStep,
  EventNameToPlayerId,
  LocationNameToPlayerIds,
} from "./types";

export type GameJSON = {
  gameId: string;
  gameSecret: string;
  gameState: GameStateJSON;
};

export type GameStateJSON = {
  activePlayerId: string;
  players: PlayerJSON[];
  meadowCards: CardName[];
  discardPile: CardStackJSON;
  deck: CardStackJSON;
  locationsMap: LocationNameToPlayerIds;
  eventsMap: EventNameToPlayerId;
  pendingGameInputs: GameInputMultiStep[];
};

export type CardStackJSON = {
  numCards: number;
  cards: CardName[];
};

export type PlayerJSON = {
  name: string;
  playerSecret?: string;
  playerId: string;
  playedCards: Partial<Record<CardName, PlayedCardInfo[]>>;
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
};
