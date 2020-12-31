export enum GameInputType {
  PLAY_CARD = "PLAY_CARD",
  PLACE_WORKER = "PLACE_WORKER",
  VISIT_DESTINATION_CARD = "VISIT_DESTINATION_CARD",
  CLAIM_EVENT = "CLAIM_EVENT",
  PREPARE_FOR_SEASON = "PREPARE_FOR_SEASON",
  GAME_END = "GAME_END",

  SELECT_CARDS = "SELECT_CARDS",
  SELECT_PLAYED_CARDS = "SELECT_PLAYED_CARDS",
  SELECT_PLAYER = "SELECT_PLAYER",
  SELECT_RESOURCES = "SELECT_RESOURCES",
  SELECT_LOCATION = "SELECT_LOCATION",
  SELECT_WORKER_PLACEMENT = "SELECT_WORKER_PLACEMENT",
  DISCARD_CARDS = "DISCARD_CARDS",
  SELECT_PAYMENT_FOR_CARD = "SELECT_PAYMENT_FOR_CARD",
}

export type GameInputPlaceWorker = {
  inputType: GameInputType.PLACE_WORKER;
  location: LocationName;
};

export type GameInputVisitDestinationCard = {
  inputType: GameInputType.VISIT_DESTINATION_CARD;
  card: CardName;
  cardOwnerId: string;
};

export type GameInputPlayCard = {
  inputType: GameInputType.PLAY_CARD;
  card: CardName;
  fromMeadow: boolean;
  paymentOptions: {
    cardToDungeon?: CardName;

    useAssociatedCard?: boolean;

    // Eg crane, innkeeper, queen
    cardToUse?:
      | CardName.QUEEN
      | CardName.INNKEEPER
      | CardName.CRANE
      | CardName.INN
      | null;

    resources: {
      [ResourceType.TWIG]?: number;
      [ResourceType.BERRY]?: number;
      [ResourceType.PEBBLE]?: number;
      [ResourceType.RESIN]?: number;
    };
  };
};

export type GameInputClaimEvent = {
  inputType: GameInputType.CLAIM_EVENT;
  event: EventName;
};

export type GameInputGameEnd = {
  inputType: GameInputType.GAME_END;
};

export type GameInputPrepareForSeason = {
  inputType: GameInputType.PREPARE_FOR_SEASON;
};

export type GameInputWorkerPlacementTypes =
  | GameInputClaimEvent
  | GameInputPlaceWorker
  | GameInputVisitDestinationCard;

export type GameInputSimple =
  | GameInputWorkerPlacementTypes
  | GameInputPlayCard
  | GameInputGameEnd
  | GameInputPrepareForSeason;

export type GameInputDiscardCards = {
  inputType: GameInputType.DISCARD_CARDS;
  prevInputType: GameInputType;
  minCards: number;
  maxCards: number;

  locationContext?: LocationName;
  cardContext?: CardName;

  clientOptions: {
    cardsToDiscard: CardName[];
  };
};

export type GameInputSelectPlayer = {
  inputType: GameInputType.SELECT_PLAYER;
  prevInputType: GameInputType;
  playerOptions: string[];
  mustSelectOne: boolean;

  locationContext?: LocationName;
  cardContext?: CardName;

  clientOptions: {
    selectedPlayer: string | null;
  };
};

export type GameInputSelectCards = {
  inputType: GameInputType.SELECT_CARDS;
  prevInputType: GameInputType;
  cardOptions: CardName[];
  cardOptionsUnfiltered?: CardName[];

  maxToSelect: number;
  minToSelect: number;

  locationContext?: LocationName;
  cardContext?: CardName;

  clientOptions: {
    selectedCards: CardName[];
  };
};

export type GameInputSelectPlayedCards = {
  inputType: GameInputType.SELECT_PLAYED_CARDS;
  prevInputType: GameInputType;
  cardOptions: PlayedCardInfo[];
  maxToSelect: number;
  minToSelect: number;

  eventContext?: EventName;
  cardContext?: CardName;
  locationContext?: LocationName;

  clientOptions: {
    selectedCards: PlayedCardInfo[];
  };
};

export type GameInputSelectResources = {
  inputType: GameInputType.SELECT_RESOURCES;
  prevInputType: GameInputType;
  maxResources: number;
  minResources: number;

  excludeResource?: ResourceType;
  specificResource?: ResourceType;

  locationContext?: LocationName;
  cardContext?: CardName;
  eventContext?: EventName;

  clientOptions: {
    resources: CardCost;
  };
};

export type GameInputSelectWorkerPlacement = {
  inputType: GameInputType.SELECT_WORKER_PLACEMENT;
  prevInputType: GameInputType;
  options: GameInputWorkerPlacementTypes[];

  locationContext?: LocationName;
  cardContext?: CardName;
  eventContext?: EventName;

  clientOptions: {
    selectedInput: GameInputWorkerPlacementTypes | null;
  };
};

export type GameInputSelectLocation = {
  inputType: GameInputType.SELECT_LOCATION;
  prevInputType: GameInputType;

  locationOptions: LocationName[];

  locationContext?: LocationName;
  cardContext?: CardName;
  eventContext?: EventName;

  clientOptions: {
    selectedLocation: LocationName | null;
  };
};

export type GameInputSelectPaymentForCard = {
  inputType: GameInputType.SELECT_PAYMENT_FOR_CARD;
  prevInputType: GameInputType;

  locationContext?: LocationName;
  // if cardContext is specified, must use that card
  cardContext?: CardName;
  cardToBuy: CardName;

  // player specified number of resources
  clientOptions: {
    resources: {
      [ResourceType.TWIG]?: number;
      [ResourceType.BERRY]?: number;
      [ResourceType.PEBBLE]?: number;
      [ResourceType.RESIN]?: number;
    };
  };

  paymentOptions: {
    cardToDungeon?: CardName;

    useAssociatedCard?: boolean;

    // Eg crane, innkeeper, queen
    cardToUse?:
      | CardName.QUEEN
      | CardName.INNKEEPER
      | CardName.CRANE
      | CardName.INN
      | null;

    resources: {
      [ResourceType.TWIG]?: number;
      [ResourceType.BERRY]?: number;
      [ResourceType.PEBBLE]?: number;
      [ResourceType.RESIN]?: number;
    };
  };
};

export type GameInputMultiStep = (
  | GameInputSelectCards
  | GameInputSelectPlayedCards
  | GameInputDiscardCards
  | GameInputSelectResources
  | GameInputSelectPlayer
  | GameInputSelectLocation
  | GameInputSelectPaymentForCard
  | GameInputSelectWorkerPlacement
) & {
  eventContext?: EventName;
  cardContext?: CardName;
  locationContext?: LocationName;
  prevInput?: GameInput;
};

export type GameInput = GameInputSimple | GameInputMultiStep;

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

export enum LocationOccupancy {
  EXCLUSIVE = "EXCLUSIVE",
  EXCLUSIVE_FOUR = "EXCLUSIVE_FOUR",
  UNLIMITED = "UNLIMITED",
}

export enum LocationType {
  BASIC = "BASIC",
  FOREST = "FOREST",
  HAVEN = "HAVEN",
  JOURNEY = "JOURNEY",
}

export enum EventType {
  BASIC = "BASIC",
  SPECIAL = "SPECIAL",
}

export enum LocationName {
  BASIC_ONE_BERRY = "BASIC_ONE_BERRY",
  BASIC_ONE_BERRY_AND_ONE_CARD = "BASIC_ONE_BERRY_AND_ONE_CARD",
  BASIC_ONE_RESIN_AND_ONE_CARD = "BASIC_ONE_RESIN_AND_ONE_CARD",
  BASIC_ONE_STONE = "BASIC_ONE_STONE",
  BASIC_THREE_TWIGS = "BASIC_THREE_TWIGS",
  BASIC_TWO_CARDS_AND_ONE_VP = "BASIC_TWO_CARDS_AND_ONE_VP",
  BASIC_TWO_RESIN = "BASIC_TWO_RESIN",
  BASIC_TWO_TWIGS_AND_ONE_CARD = "BASIC_TWO_TWIGS_AND_ONE_CARD",
  HAVEN = "HAVEN",
  JOURNEY_FIVE = "JOURNEY_FIVE",
  JOURNEY_FOUR = "JOURNEY_FOUR",
  JOURNEY_THREE = "JOURNEY_THREE",
  JOURNEY_TWO = "JOURNEY_TWO",

  FOREST_TWO_BERRY_ONE_CARD = "FOREST_TWO_BERRY_ONE_CARD",
  FOREST_TWO_WILD = "FOREST_TWO_WILD",
  FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD = "FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD",
  FOREST_COPY_BASIC_ONE_CARD = "FOREST_COPY_BASIC_ONE_CARD",
  FOREST_ONE_PEBBLE_THREE_CARD = "FOREST_ONE_PEBBLE_THREE_CARD",
  FOREST_ONE_TWIG_RESIN_BERRY = "FOREST_ONE_TWIG_RESIN_BERRY",
  FOREST_THREE_BERRY = "FOREST_THREE_BERRY",
  FOREST_TWO_RESIN_ONE_TWIG = "FOREST_TWO_RESIN_ONE_TWIG",
  FOREST_TWO_CARDS_ONE_WILD = "FOREST_TWO_CARDS_ONE_WILD",
  FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD = "FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD",
  FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS = "FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS",
}

export enum EventName {
  BASIC_FOUR_PRODUCTION_TAGS = "BASIC_FOUR_PRODUCTION_TAGS",
  BASIC_THREE_DESTINATION = "BASIC_THREE_DESTINATION",
  BASIC_THREE_GOVERNANCE = "BASIC_THREE_GOVERNANCE",
  BASIC_THREE_TRAVELER = "BASIC_THREE_TRAVELER",

  SPECIAL_GRADUATION_OF_SCHOLARS = "SPECIAL_GRADUATION_OF_SCHOLARS",
  SPECIAL_A_BRILLIANT_MARKETING_PLAN = "SPECIAL_A_BRILLIANT_MARKETING_PLAN",
  SPECIAL_PERFORMER_IN_RESIDENCE = "SPECIAL_PERFORMER_IN_RESIDENCE",
  SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES = "SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES",
  SPECIAL_MINISTERING_TO_MISCREANTS = "SPECIAL_MINISTERING_TO_MISCREANTS",
  SPECIAL_CROAK_WART_CURE = "SPECIAL_CROAK_WART_CURE",
  SPECIAL_AN_EVENING_OF_FIREWORKS = "SPECIAL_AN_EVENING_OF_FIREWORKS",
  SPECIAL_A_WEE_RUN_CITY = "SPECIAL_A_WEE_RUN_CITY",
  SPECIAL_TAX_RELIEF = "SPECIAL_TAX_RELIEF",
  SPECIAL_UNDER_NEW_MANAGEMENT = "SPECIAL_UNDER_NEW_MANAGEMENT",
  SPECIAL_ANCIENT_SCROLLS_DISCOVERED = "SPECIAL_ANCIENT_SCROLLS_DISCOVERED",
  SPECIAL_FLYING_DOCTOR_SERVICE = "SPECIAL_FLYING_DOCTOR_SERVICE",
  SPECIAL_PATH_OF_THE_PILGRIMS = "SPECIAL_PATH_OF_THE_PILGRIMS",
  SPECIAL_REMEMBERING_THE_FALLEN = "SPECIAL_REMEMBERING_THE_FALLEN",
  SPECIAL_PRISTINE_CHAPEL_CEILING = "SPECIAL_PRISTINE_CHAPEL_CEILING",
  SPECIAL_THE_EVERDELL_GAMES = "SPECIAL_THE_EVERDELL_GAMES",
}

export type LocationNameToPlayerIds = Partial<
  { [key in LocationName]: string[] }
>;

export type EventNameToPlayerId = Partial<
  { [key in EventName]: string | null }
>;

export type PlayedCardInfo = {
  cardOwnerId: string;
  cardName: CardName;

  // constructions
  usedForCritter?: boolean;

  // clocktower, storehouse
  resources?: {
    [ResourceType.VP]?: number;
    [ResourceType.TWIG]?: number;
    [ResourceType.BERRY]?: number;
    [ResourceType.PEBBLE]?: number;
    [ResourceType.RESIN]?: number;
  };

  // queen, inn etc
  workers?: string[];

  // dungeon
  pairedCards?: CardName[];
};

export type PlayedEventInfo = {
  // events that store resources
  storedResources?: {
    [ResourceType.TWIG]?: number;
    [ResourceType.BERRY]?: number;
    [ResourceType.PEBBLE]?: number;
    [ResourceType.RESIN]?: number;
  };

  // certain events
  storedCards?: string[];
};

export type WorkerPlacementInfo = {
  location?: LocationName;
  cardDestination?: {
    card: CardName;
    cardOwnerId: string;
  };
  event?: EventName;
};

export type PlayerIdsToAvailableDestinationCards = {
  [playerId: string]: CardName[];
};

// All known cards
export enum CardName {
  ARCHITECT = "ARCHITECT",
  BARD = "BARD",
  BARGE_TOAD = "BARGE_TOAD",
  CASTLE = "CASTLE",
  CEMETARY = "CEMETARY",
  CHAPEL = "CHAPEL",
  CHIP_SWEEP = "CHIP_SWEEP",
  CLOCK_TOWER = "CLOCK_TOWER",
  COURTHOUSE = "COURTHOUSE",
  CRANE = "CRANE",
  DOCTOR = "DOCTOR",
  DUNGEON = "DUNGEON",
  EVERTREE = "EVERTREE",
  FAIRGROUNDS = "FAIRGROUNDS",
  FARM = "FARM",
  FOOL = "FOOL",
  GENERAL_STORE = "GENERAL_STORE",
  HISTORIAN = "HISTORIAN",
  HUSBAND = "HUSBAND",
  INN = "INN",
  INNKEEPER = "INNKEEPER",
  JUDGE = "JUDGE",
  KING = "KING",
  LOOKOUT = "LOOKOUT",
  MINE = "MINE",
  MINER_MOLE = "MINER_MOLE",
  MONASTERY = "MONASTERY",
  MONK = "MONK",
  PALACE = "PALACE",
  PEDDLER = "PEDDLER",
  POST_OFFICE = "POST_OFFICE",
  POSTAL_PIGEON = "POSTAL_PIGEON",
  QUEEN = "QUEEN",
  RANGER = "RANGER",
  RESIN_REFINERY = "RESIN_REFINERY",
  RUINS = "RUINS",
  SCHOOL = "SCHOOL",
  SHEPHERD = "SHEPHERD",
  SHOPKEEPER = "SHOPKEEPER",
  STOREHOUSE = "STOREHOUSE",
  TEACHER = "TEACHER",
  THEATRE = "THEATRE",
  TWIG_BARGE = "TWIG_BARGE",
  UNDERTAKER = "UNDERTAKER",
  UNIVERSITY = "UNIVERSITY",
  WANDERER = "WANDERER",
  WIFE = "WIFE",
  WOODCARVER = "WOODCARVER",
}

export enum ResourceType {
  TWIG = "TWIG",
  RESIN = "RESIN",
  BERRY = "BERRY",
  PEBBLE = "PEBBLE",
  VP = "VP",
}

export type ResourceMap = Partial<Record<ResourceType, number>>;

export type ProductionResourceMap = ResourceMap & {
  CARD?: number;
};

export type CardCost = {
  [ResourceType.TWIG]?: number;
  [ResourceType.BERRY]?: number;
  [ResourceType.PEBBLE]?: number;
  [ResourceType.RESIN]?: number;
};
