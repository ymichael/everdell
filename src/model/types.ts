export enum GameInputType {
  PLAY_CARD = "PLAY_CARD",
  PLACE_WORKER = "PLACE_WORKER",
  VISIT_DESTINATION_CARD = "VISIT_DESTINATION_CARD",
  CLAIM_EVENT = "CLAIM_EVENT",
  PREPARE_FOR_SEASON = "PREPARE_FOR_SEASON",
  GAME_END = "GAME_END",

  SELECT_CARD = "SELECT_CARD",
  SELECT_PLAYER = "SELECT_PLAYER",
  DISCARD_CARDS = "DISCARD_CARDS",
}

export type GameInputPlaceWorker = {
  inputType: GameInputType.PLACE_WORKER;
  location: LocationName;
};

export type GameInputVisitDestinationCard = {
  inputType: GameInputType.VISIT_DESTINATION_CARD;
  card: CardName;
  playerId: string;
  clientOptions?: {
    // lookout
    location?: LocationName;

    // monastery
    targetPlayerId?: string;

    // monastery
    resourcesToSpend?: {
      [ResourceType.TWIG]?: number;
      [ResourceType.BERRY]?: number;
      [ResourceType.PEBBLE]?: number;
      [ResourceType.RESIN]?: number;
    };

    // university
    targetCard?: CardName;

    // university
    resourcesToGain?: {
      [ResourceType.TWIG]?: number;
      [ResourceType.BERRY]?: number;
      [ResourceType.PEBBLE]?: number;
      [ResourceType.RESIN]?: number;
      [ResourceType.VP]?: number;
    };
  };
};

export type GameInputPlayCard = {
  inputType: GameInputType.PLAY_CARD;
  card: CardName;
  fromMeadow: boolean;

  clientOptions?: {
    // bard, post office
    cardsToDiscard?: CardName[];

    // husband, peddler
    resourcesToGain?: {
      [ResourceType.VP]?: number;
      [ResourceType.TWIG]?: number;
      [ResourceType.BERRY]?: number;
      [ResourceType.PEBBLE]?: number;
      [ResourceType.RESIN]?: number;
    };

    // wood carver, docter, peddler
    resourcesToSpend?: {
      [ResourceType.VP]?: number;
      [ResourceType.TWIG]?: number;
      [ResourceType.BERRY]?: number;
      [ResourceType.PEBBLE]?: number;
      [ResourceType.RESIN]?: number;
    };
  };

  // How to pay?
  paymentOptions?: {
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
  clientOptions?: {
    // eg, placing cards underneath event
    cardsToUse?: CardName[];

    // eg, place berries on event
    resourcesToSpend?: {
      [ResourceType.TWIG]?: number;
      [ResourceType.BERRY]?: number;
      [ResourceType.PEBBLE]?: number;
      [ResourceType.RESIN]?: number;
    };

    resourcesToGain?: {
      [ResourceType.TWIG]?: number;
      [ResourceType.BERRY]?: number;
      [ResourceType.PEBBLE]?: number;
      [ResourceType.RESIN]?: number;
    };

    // TODO: add resources to opponents
  };
};

export type GameInputGameEnd = {
  inputType: GameInputType.GAME_END;
};

export type GameInputPrepareForSeason = {
  inputType: GameInputType.PREPARE_FOR_SEASON;
};

export type GameInputSimple =
  | GameInputPlaceWorker
  | GameInputVisitDestinationCard
  | GameInputPlayCard
  | GameInputClaimEvent
  | GameInputGameEnd
  | GameInputPrepareForSeason;

export type GameInputDiscardCards = {
  inputType: GameInputType.DISCARD_CARDS;
  prevInputType: GameInputType;
  minCards: number;
  maxCards: number;
  location?: LocationName;
  cardsToDiscard?: CardName[];
};

export type GameInputSelectPlayer = {
  inputType: GameInputType.SELECT_PLAYER;
  prevInputType: GameInputType;
  cardContext?: CardName;
  playerOptions: string[];
  mustSelectOne: boolean;
  clientOptions: {
    selectedPlayer: string | null;
  };
};

export type GameInputSelectCard = {
  inputType: GameInputType.SELECT_CARD;
  prevInputType: GameInputType;
  cardContext?: CardName;
  cardOptions: CardName[];
  cardOptionsUnfiltered: CardName[];
  mustSelectOne: boolean;
  clientOptions: {
    selectedCard: CardName | null;
  };
};

export type GameInputMultiStep =
  | GameInputSelectCard
  | GameInputDiscardCards
  | GameInputSelectPlayer;

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
  maxWorkers?: number;

  // dungeon
  pairedCards?: string[];
};

export type PlayedEventInfo = {
  // whether the event card has a worker on it
  hasWorker?: boolean;

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
