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
  WILD = "WILD",
  WILD_BUT_NOT_BERRY = "WILD_BUT_NOT_BERRY",
  VP = "VP",
}

export type ResourceMap = {
  [ResourceType.VP]?: number;
  [ResourceType.TWIG]?: number;
  [ResourceType.BERRY]?: number;
  [ResourceType.PEBBLE]?: number;
  [ResourceType.RESIN]?: number;
  [ResourceType.WILD]?: number;
  [ResourceType.WILD_BUT_NOT_BERRY]?: number;
};

export type CardCost = {
  [ResourceType.TWIG]?: number;
  [ResourceType.BERRY]?: number;
  [ResourceType.PEBBLE]?: number;
  [ResourceType.RESIN]?: number;
  [ResourceType.WILD]?: number;
  [ResourceType.WILD_BUT_NOT_BERRY]?: number;
};

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
      playerId: string;
      card: CardName;
    }
  | {
      inputType: GameInputType.PLACE_WORKER;
      playerId: string;
      location: LocationName;
    }
  | {
      inputType: GameInputType.CLAIM_EVENT;
      playerId: string;
      event: EventName;
    }
  | {
      inputType: GameInputType.PREPARE_FOR_SEASON;
      playerId: string;
    }
  | {
      inputType: GameInputType.PAY_FOR_CARD;
      playerId: string;
    }
  | {
      inputType: GameInputType.DRAW_CARDS;
      playerId: string;
      count: number;
    }
  | {
      inputType: GameInputType.GAIN_RESOURCES;
      playerId: string;
      resources: ResourceMap;
    }
  | {
      inputType: GameInputType.SPEND_RESOURCES;
      playerId: string;
      resources: ResourceMap;
    }
  | {
      inputType: GameInputType.DISCARD_CARDS;
      playerId: string | null;
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
  // Basic
  ONE_BERRY = "ONE_BERRY",
  ONE_BERRY_AND_ONE_CARD = "ONE_BERRY_AND_ONE_CARD",
  ONE_RESIN_AND_ONE_CARD = "ONE_RESIN_AND_ONE_CARD",
  ONE_STONE = "ONE_STONE",
  THREE_TWIGS = "THREE_TWIGS",
  TWO_CARDS_AND_ONE_VP = "TWO_CARDS_AND_ONE_VP",
  TWO_RESIN = "TWO_RESIN",
  TWO_TWIGS_AND_ONE_CARD = "TWO_TWIGS_AND_ONE_CARD",

  // Forest
  // TODO

  // Haven
  HAVEN = "HAVEN",

  // Journey
  JOURNEY_FIVE = "JOURNEY_FIVE",
  JOURNEY_FOUR = "JOURNEY_FOUR",
  JOURNEY_THREE = "JOURNEY_THREE",
  JOURNEY_TWO = "JOURNEY_TWO",
}

export enum EventName {
  // Basic
  FOUR_PRODUCTION_TAGS = "FOUR_PRODUCTION_TAGS",
  THREE_DESTINATION = "THREE_DESTINATION",
  THREE_GOVERNANCE = "THREE_GOVERNANCE",
  THREE_TRAVELER = "THREE_TRAVELER",
}
