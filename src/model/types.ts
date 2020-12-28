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

export type CardCost = {
  [ResourceType.TWIG]?: number;
  [ResourceType.BERRY]?: number;
  [ResourceType.PEBBLE]?: number;
  [ResourceType.RESIN]?: number;
};

export enum GameInputType {
  PLAY_CARD = "PLAY_CARD",
  PLACE_WORKER = "PLACE_WORKER",
  CLAIM_EVENT = "CLAIM_EVENT",
  PREPARE_FOR_SEASON = "PREPARE_FOR_SEASON",

  REPLENISH_MEADOW = "REPLENISH_MEADOW",
  DRAW_CARDS = "DRAW_CARDS",
}

export type GameInput =
  | {
      inputType: GameInputType.DRAW_CARDS;
      playerId: string;
      count: number;
    }
  | {
      inputType: GameInputType.REPLENISH_MEADOW;
    }
  | {
      inputType: GameInputType.PLACE_WORKER;
      location: LocationName;
      clientOptions?: {
        cardsToDiscard?: CardName[];
        resourcesToGain?: {
          [ResourceType.TWIG]?: number;
          [ResourceType.BERRY]?: number;
          [ResourceType.PEBBLE]?: number;
          [ResourceType.RESIN]?: number;
        };
      };
    }
  | {
      inputType: GameInputType.PLAY_CARD;
      card: CardName;
      fromMeadow: boolean;
      clientOptions?: {
        // fool
        targetPlayerId?: string;

        // bard
        cardsToDiscard?: CardName[];

        // chip sweep
        targetCard?: CardName;

        // husband
        resourcesToGain?: {
          [ResourceType.TWIG]?: number;
          [ResourceType.BERRY]?: number;
          [ResourceType.PEBBLE]?: number;
          [ResourceType.RESIN]?: number;
        };

        // wood carver
        resourcesToSpend?: {
          [ResourceType.VP]?: number;
          [ResourceType.TWIG]?: number;
          [ResourceType.BERRY]?: number;
          [ResourceType.PEBBLE]?: number;
          [ResourceType.RESIN]?: number;
        };
      };
    }
  | {
      inputType: GameInputType.CLAIM_EVENT;
      event: EventName;
    }
  | {
      inputType: GameInputType.PREPARE_FOR_SEASON;
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
  HAVEN = "HAVEN",
  JOURNEY_FIVE = "JOURNEY_FIVE",
  JOURNEY_FOUR = "JOURNEY_FOUR",
  JOURNEY_THREE = "JOURNEY_THREE",
  JOURNEY_TWO = "JOURNEY_TWO",
  BASIC_ONE_BERRY = "BASIC_ONE_BERRY",
  BASIC_ONE_BERRY_AND_ONE_CARD = "BASIC_ONE_BERRY_AND_ONE_CARD",
  BASIC_ONE_RESIN_AND_ONE_CARD = "BASIC_ONE_RESIN_AND_ONE_CARD",
  BASIC_ONE_STONE = "BASIC_ONE_STONE",
  BASIC_THREE_TWIGS = "BASIC_THREE_TWIGS",
  BASIC_TWO_CARDS_AND_ONE_VP = "BASIC_TWO_CARDS_AND_ONE_VP",
  BASIC_TWO_RESIN = "BASIC_TWO_RESIN",
  BASIC_TWO_TWIGS_AND_ONE_CARD = "BASIC_TWO_TWIGS_AND_ONE_CARD",
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
  isOccupied?: boolean;

  // clocktower, storehouse etc
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
