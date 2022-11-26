import {
  AdornmentName,
  CardName,
  EventName,
  EventNameToPlayerId,
  GameInput,
  GameInputMultiStep,
  GameLogEntry,
  GameOptions,
  LocationNameToPlayerIds,
  PlayedCardInfo,
  PlayedEventInfo,
  PlayerStatus,
  ResourceType,
  RiverDestinationMapSpots,
  Season,
  WorkerPlacementInfo,
  TrainCarTileName,
} from "./types";

export type GameJSON = {
  gameId: string;
  gameSecret: string;
  gameState: GameStateJSON;
};

export type GameStateJSON = {
  gameStateId: number;
  gameOptions: GameOptions;
  activePlayerId: string;
  players: PlayerJSON[];
  meadowCards: CardName[];
  discardPile: CardStackJSON<CardName>;
  deck: CardStackJSON<CardName>;
  locationsMap: LocationNameToPlayerIds;
  eventsMap: EventNameToPlayerId;
  pendingGameInputs: GameInputMultiStep[];
  playedGameInputs: GameInput[];
  gameLog: GameLogEntry[];
  riverDestinationMap: RiverDestinationMapJSON | null;
  adornmentsPile: CardStackJSON<AdornmentName> | null;
};

export type CardStackJSON<T> = {
  name: string;
  numCards: number;
  cards: T[];
};

export type PlayerJSON = {
  name: string;
  playerSecret?: string;
  playerId: string;
  playedCards: Partial<Record<CardName, PlayedCardInfo[]>>;
  numCardsInHand: number;
  cardsInHand: CardName[] | null;
  resources: Record<ResourceType, number>;
  currentSeason: Season;
  numWorkers: number;
  claimedEvents: Partial<Record<EventName, PlayedEventInfo>>;
  placedWorkers: WorkerPlacementInfo[];
  playerStatus: PlayerStatus;
  numAdornmentsInHand: number;
  adornmentsInHand: AdornmentName[];
  playedAdornments: AdornmentName[];
  numAmbassadors: number;
};

export type RiverDestinationMapJSON = {
  spots: RiverDestinationMapSpots;
};

export type TrainCarTileStackJSON = {
  revealed: [TrainCarTileName, TrainCarTileName, TrainCarTileName];
  rest: TrainCarTileName[];
};
