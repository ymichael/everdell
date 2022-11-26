// GameInputType represents the type of the transition from gameState ->
// gameState.
//
// We split these into 2 types:
//
// **simple**: Actions that players can typically play at the start
// of their turn (if eligible). Eg. playing a card from their hand.
//
// **multi**: Actions that are special and can only be triggered after taking
// certain actions. Eg. Choosing a wild resource after placing a worker on a
// location.
//
// We use this split to help us:
// - Present the possible legal transitions available to the active player.
// - Prevent any out-of-turn/illegal moves from happening.
export enum GameInputType {
  // simple
  PLAY_CARD = "PLAY_CARD",
  PLACE_WORKER = "PLACE_WORKER",
  VISIT_DESTINATION_CARD = "VISIT_DESTINATION_CARD",
  CLAIM_EVENT = "CLAIM_EVENT",
  PREPARE_FOR_SEASON = "PREPARE_FOR_SEASON",
  GAME_END = "GAME_END",

  // multi
  SELECT_CARDS = "SELECT_CARDS",
  SELECT_PLAYED_CARDS = "SELECT_PLAYED_CARDS",
  SELECT_PLAYER = "SELECT_PLAYER",
  SELECT_RESOURCES = "SELECT_RESOURCES",
  SELECT_LOCATION = "SELECT_LOCATION",
  SELECT_WORKER_PLACEMENT = "SELECT_WORKER_PLACEMENT",
  DISCARD_CARDS = "DISCARD_CARDS",
  SELECT_PAYMENT_FOR_CARD = "SELECT_PAYMENT_FOR_CARD",
  SELECT_OPTION_GENERIC = "SELECT_OPTION_GENERIC",

  // Pearlbrook specific (simple)
  PLAY_ADORNMENT = "PLAY_ADORNMENT",
  PLACE_AMBASSADOR = "PLACE_AMBASSADOR",

  // Pearlbrook specific (multi)
  SELECT_PLAYED_ADORNMENT = "SELECT_PLAYED_ADORNMENT",
  SELECT_RIVER_DESTINATION = "SELECT_RIVER_DESTINATION",
}

export type GameInputPlaceWorker = {
  inputType: GameInputType.PLACE_WORKER;
  clientOptions: {
    location: LocationName | null;
  };
};

export type GameInputVisitDestinationCard = {
  inputType: GameInputType.VISIT_DESTINATION_CARD;
  clientOptions: {
    playedCard: PlayedCardInfo | null;
  };
};

export type GameInputPlayCard = {
  inputType: GameInputType.PLAY_CARD;

  // We overload this input when re-activating cards/playing cards via other means
  // eg. using other cards/locations. These are used to identify the played card and
  // provide more context to the action..
  playedCardContext?: PlayedCardInfo;
  prevInputType?: GameInputType;

  clientOptions: {
    card: CardName | null;
    fromMeadow: boolean;
    paymentOptions: CardPaymentOptions;
  };
};

export type GameInputClaimEvent = {
  inputType: GameInputType.CLAIM_EVENT;
  clientOptions: {
    event: EventName | null;
  };
};

export type GameInputPlayAdornment = {
  inputType: GameInputType.PLAY_ADORNMENT;
  clientOptions: {
    adornment: AdornmentName | null;
  };
};

export type GameInputPlaceAmbassador = {
  inputType: GameInputType.PLACE_AMBASSADOR;
  clientOptions: {
    loc: AmbassadorPlacementInfo | null;
  };
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
  | GameInputPrepareForSeason
  | GameInputPlayAdornment
  | GameInputPlaceAmbassador
  | GameInputPrepareForSeason;

export type GameInputDiscardCards = {
  inputType: GameInputType.DISCARD_CARDS;
  prevInputType: GameInputType;
  minCards: number;
  maxCards: number;

  isAutoAdvancedInput?: boolean;
  clientOptions: {
    cardsToDiscard: CardName[];
  };
};

export type GameInputSelectPlayedAdornment = {
  inputType: GameInputType.SELECT_PLAYED_ADORNMENT;
  prevInputType: GameInputType;
  adornmentOptions: AdornmentName[];
  clientOptions: {
    adornment: AdornmentName | null;
  };
};

export type GameInputSelectRiverDestination = {
  inputType: GameInputType.SELECT_RIVER_DESTINATION;
  prevInputType: GameInputType;
  options: RiverDestinationName[];
  clientOptions: {
    riverDestination: RiverDestinationName | null;
  };
};

export type GameInputSelectPlayer = {
  inputType: GameInputType.SELECT_PLAYER;
  prevInputType: GameInputType;
  playerOptions: string[];
  mustSelectOne: boolean;
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
  clientOptions: {
    selectedCards: PlayedCardInfo[];
  };
};

export type GameInputSelectResources = {
  inputType: GameInputType.SELECT_RESOURCES;
  prevInputType: GameInputType;
  maxResources: number;
  minResources: number;

  isAutoAdvancedInput?: boolean;
  toSpend: boolean;
  excludeResource?: ResourceType;
  specificResource?: ResourceType;
  clientOptions: {
    resources: CardCost;
  };
};

export type GameInputSelectWorkerPlacement = {
  inputType: GameInputType.SELECT_WORKER_PLACEMENT;
  prevInput?: GameInput;
  prevInputType: GameInputType;
  options: WorkerPlacementInfo[];

  mustSelectOne: boolean;
  clientOptions: {
    selectedOption: WorkerPlacementInfo | null;
  };
};

export type GameInputSelectLocation = {
  inputType: GameInputType.SELECT_LOCATION;
  prevInputType: GameInputType;
  locationOptions: LocationName[];
  clientOptions: {
    selectedLocation: LocationName | null;
  };
};

export type GameInputSelectOptionGeneric = {
  inputType: GameInputType.SELECT_OPTION_GENERIC;
  prevInputType: GameInputType;
  options: string[];
  playedCardContext?: PlayedCardInfo;

  clientOptions: {
    selectedOption: string | null;
  };
};

export type GameInputSelectPaymentForCard = {
  inputType: GameInputType.SELECT_PAYMENT_FOR_CARD;
  prevInputType: GameInputType;

  // if cardContext is specified, must use that card
  cardContext?: CardName;
  card: CardName;

  // player specified number of resources
  clientOptions: {
    card: CardName;
    paymentOptions: CardPaymentOptions;
  };
};

export type GameInputMultiStepContext = {
  eventContext?: EventName;
  cardContext?: CardName;
  playedCardContext?: PlayedCardInfo;
  locationContext?: LocationName;
  adornmentContext?: AdornmentName;
  riverDestinationContext?: RiverDestinationName;
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
  | GameInputSelectOptionGeneric
  | GameInputSelectPlayedAdornment
  | GameInputSelectRiverDestination
) &
  GameInputMultiStepContext & {
    prevInput?: GameInput;
    label?: string | (string | TextPart)[] | GameText;
  };

export type GameInput = GameInputSimple | GameInputMultiStep;

export enum Season {
  WINTER = "Winter",
  SPRING = "Spring",
  SUMMER = "Summer",
  AUTUMN = "Autumn",
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
  WONDER = "WONDER",
}

export enum LocationName {
  BASIC_ONE_BERRY = "ONE_BERRY",
  BASIC_ONE_BERRY_AND_ONE_CARD = "ONE_BERRY_AND_ONE_CARD",
  BASIC_ONE_RESIN_AND_ONE_CARD = "ONE_RESIN_AND_ONE_CARD",
  BASIC_ONE_STONE = "ONE_STONE",
  BASIC_THREE_TWIGS = "THREE_TWIGS",
  BASIC_TWO_CARDS_AND_ONE_VP = "TWO_CARDS_AND_ONE_VP",
  BASIC_TWO_RESIN = "TWO_RESIN",
  BASIC_TWO_TWIGS_AND_ONE_CARD = "TWO_TWIGS_AND_ONE_CARD",
  HAVEN = "HAVEN",
  JOURNEY_FIVE = "JOURNEY_FIVE",
  JOURNEY_FOUR = "JOURNEY_FOUR",
  JOURNEY_THREE = "JOURNEY_THREE",
  JOURNEY_TWO = "JOURNEY_TWO",

  FOREST_TWO_BERRY_ONE_CARD = "TWO_BERRY_ONE_CARD",
  FOREST_TWO_WILD = "TWO_WILD",
  FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD = "DISCARD_ANY_THEN_DRAW_TWO_PER_CARD",
  FOREST_COPY_BASIC_ONE_CARD = "COPY_BASIC_ONE_CARD",
  FOREST_ONE_PEBBLE_THREE_CARD = "ONE_PEBBLE_THREE_CARD",
  FOREST_ONE_TWIG_RESIN_BERRY = "ONE_TWIG_RESIN_BERRY",
  FOREST_THREE_BERRY = "THREE_BERRY",
  FOREST_TWO_RESIN_ONE_TWIG = "TWO_RESIN_ONE_TWIG",
  FOREST_TWO_CARDS_ONE_WILD = "TWO_CARDS_ONE_WILD",
  FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD = "DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD",
  FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS = "DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS",

  // Pearlbrook
  FOREST_TWO_PEBBLE_ONE_CARD = "FOREST_TWO_PEBBLE_ONE_CARD",
  FOREST_RESIN_PEBBLE_OR_FOUR_CARDS = "FOREST_RESIN_PEBBLE_OR_FOUR_CARDS",
  FOREST_ACTIVATE_2_PRODUCTION = "FOREST_ACTIVATE_2_PRODUCTION",
  FOREST_BERRY_PEBBLE_CARD = "FOREST_BERRY_PEBBLE_CARD",
  FOREST_DISCARD_2_MEADOW_DRAW_2_MEADOW_GAIN_ANY = "FOREST_DISCARD_2_MEADOW_DRAW_2_MEADOW_GAIN_ANY",
}

export enum EventName {
  BASIC_FOUR_PRODUCTION = "4 PRODUCTION",
  BASIC_THREE_DESTINATION = "3 DESTINATION",
  BASIC_THREE_GOVERNANCE = "3 GOVERNANCE",
  BASIC_THREE_TRAVELER = "3 TRAVELER",

  SPECIAL_GRADUATION_OF_SCHOLARS = "Graduation of Scholars",
  SPECIAL_A_BRILLIANT_MARKETING_PLAN = "A Brilliant Marketing Plan",
  SPECIAL_PERFORMER_IN_RESIDENCE = "Performer in Residence",
  SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES = "Capture of the Acorn Thieves",
  SPECIAL_MINISTERING_TO_MISCREANTS = "Ministering to Miscreants",
  SPECIAL_CROAK_WART_CURE = "Croak Wart Cure",
  SPECIAL_AN_EVENING_OF_FIREWORKS = "An Evening of Fireworks",
  SPECIAL_A_WEE_RUN_CITY = "A Wee Run City",
  SPECIAL_TAX_RELIEF = "Tax Relief",
  SPECIAL_UNDER_NEW_MANAGEMENT = "Under New Management",
  SPECIAL_ANCIENT_SCROLLS_DISCOVERED = "Ancient Scrolls Discovered",
  SPECIAL_FLYING_DOCTOR_SERVICE = "Flying Doctor Service",
  SPECIAL_PATH_OF_THE_PILGRIMS = "Path of the Pilgrims",
  SPECIAL_REMEMBERING_THE_FALLEN = "Remembering the Fallen",
  SPECIAL_PRISTINE_CHAPEL_CEILING = "Pristine Chapel Ceiling",
  SPECIAL_THE_EVERDELL_GAMES = "The Everdell Games",

  // Pearlbrook events
  SPECIAL_ROMANTIC_CRUISE = "Romantic Cruise",
  SPECIAL_X_MARKS_THE_SPOT = "X Marks the Spot",
  SPECIAL_RIVERSIDE_RESORT = "Riverside Resort",
  SPECIAL_MASQUERADE_INVITATIONS = "Masquerade Invitations",
  SPECIAL_SUNKEN_TREASURE_DISCOVERED = "Sunken Treasure Discovered",
  SPECIAL_RIVER_RACE = "River Race",

  // Pearlbrook Wonders
  WONDER_SUNBLAZE_BRIDGE = "Sunblaze Bridge",
  WONDER_STARFALLS_FLAME = "Starfalls flame",
  WONDER_HOPEWATCH_GATE = "Hopewatch Gate",
  WONDER_MISTRISE_FOUNTAIN = "Mistrise Fountain",

  // Newleaf events
  SPECIAL_CITY_JUBILEE = "City Jubilee",
  SPECIAL_EVER_WALL_TOWER_CONSTRUCTED = "Ever Wall Tower Constructed",
  SPECIAL_GLOW_LIGHT_FESTIVAL = "Glow Light Festival",
  SPECIAL_HOT_AIR_BALLOON_RACE = "Hot Air Balloon Race",
  SPECIAL_JUNIPER_JIG_DANCE_CONTEST = "Juniper Jig Dance Contest",
  SPECIAL_MAGIC_SNOW = "Magic Snow",
  SPECIAL_ROYAL_TEA = "Royal Tea",
  SPECIAL_STOCK_MARKET_BOOM = "Stock Market Boom",
  SPECIAL_SUNFLOWER_PARADE = "Sunflower Parade",

  // // Bellfaire events
  SPECIAL_ARCHITECTURAL_RENAISSANCE = "Architectural Renaissance",
  SPECIAL_ARTS_AND_MUSIC_FESTIVAL = "Arts and Music Festival",
  SPECIAL_BED_AND_BREAKFAST_GUILD = "Bed and Breakfast Guild",
  SPECIAL_CITY_HOLIDAY = "City Holiday",
  SPECIAL_GATHERING_OF_ELDERS = "Gathering of Elders",
  SPECIAL_KINGS_ROAD_ESTABLISHED = "King's Road Established",
  SPECIAL_PIE_EATING_CONTEST = "Pie Eating Contest",
  SPECIAL_ROYAL_WEDDING = "Royal Wedding",
  SPECIAL_STATUES_COMMISSIONED = "Statues Commissioned",
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

  // Messenger
  shareSpaceWith?: CardName | null;

  // Ferry
  ambassador?: string | null;
};

export type PlayedEventInfo = {
  // events that store resources
  storedResources?: {
    [ResourceType.TWIG]?: number;
    [ResourceType.BERRY]?: number;
    [ResourceType.PEBBLE]?: number;
    [ResourceType.RESIN]?: number;
    [ResourceType.VP]?: number;
  };

  // certain events
  storedCards?: string[];
};

export type WorkerPlacementInfo =
  | {
      location: LocationName;
      playedCard?: undefined;
      event?: undefined;
    }
  | {
      playedCard: PlayedCardInfo;
      event?: undefined;
      location?: undefined;
    }
  | {
      event: EventName;
      location?: undefined;
      playedCard?: undefined;
    };

export type AmbassadorPlacementInfo =
  | {
      type: "spot";
      spot: RiverDestinationSpotName;
    }
  | {
      type: "card";
      playedCard: PlayedCardInfo;
    };

// All known cards
export enum CardName {
  ARCHITECT = "Architect",
  BARD = "Bard",
  BARGE_TOAD = "Barge Toad",
  CASTLE = "Castle",
  CEMETARY = "Cemetary",
  CHAPEL = "Chapel",
  CHIP_SWEEP = "Chip Sweep",
  CLOCK_TOWER = "Clock Tower",
  COURTHOUSE = "Courthouse",
  CRANE = "Crane",
  DOCTOR = "Doctor",
  DUNGEON = "Dungeon",
  EVERTREE = "Evertree",
  FAIRGROUNDS = "Fairgrounds",
  FARM = "Farm",
  FOOL = "Fool",
  GENERAL_STORE = "General Store",
  HISTORIAN = "Historian",
  HUSBAND = "Husband",
  INN = "Inn",
  INNKEEPER = "Innkeeper",
  JUDGE = "Judge",
  KING = "King",
  LOOKOUT = "Lookout",
  MINE = "Mine",
  MINER_MOLE = "Miner Mole",
  MONASTERY = "Monastery",
  MONK = "Monk",
  PALACE = "Palace",
  PEDDLER = "Peddler",
  POST_OFFICE = "Post Office",
  POSTAL_PIGEON = "Postal Pigeon",
  QUEEN = "Queen",
  RANGER = "Ranger",
  RESIN_REFINERY = "Resin Refinery",
  RUINS = "Ruins",
  SCHOOL = "School",
  SHEPHERD = "Shepherd",
  SHOPKEEPER = "Shopkeeper",
  STOREHOUSE = "Storehouse",
  TEACHER = "Teacher",
  THEATRE = "Theatre",
  TWIG_BARGE = "Twig Barge",
  UNDERTAKER = "Undertaker",
  UNIVERSITY = "University",
  WANDERER = "Wanderer",
  WIFE = "Wife",
  WOODCARVER = "Woodcarver",

  // Pearlbrook
  BRIDGE = "Bridge",
  FERRY = "Ferry",
  FERRY_FERRET = "Ferry Ferret",
  HARBOR = "Harbor",
  MESSENGER = "Messenger",
  PIRATE = "Pirate",
  PIRATE_SHIP = "Pirate Ship",
  SHIPWRIGHT = "Shipwright",

  // Newleaf
  AIR_BALLOON = "Air Balloon",
  BAKER = "Baker",
  BANK = "Bank",
  CHIPSMITH = "Chipsmith",
  CITY_HALL = "City Hall",
  CONDUCTOR = "Conductor",
  DIPLOMAT = "Diplomat",
  EVER_WALL = "Ever Wall",
  FREIGHT_CAR = "Freight Car",
  GARDENER = "Gardener",
  GREENHOUSE = "Greenhouse",
  HOTEL = "Hotel",
  INVENTOR = "Inventor",
  LAMPLIGHTER = "Lamplighter",
  LIBRARY = "Library",
  LOCOMOTIVE = "Locomotive",
  MAGICIAN = "Magician",
  MAIN_ROAD = "Main Road",
  MAYOR = "Mayor",
  MILLER = "Miller",
  MUSEUM = "Museum",
  PHOTOGRAPHER = "Photographer",
  POET = "Poet",
  TEA_HOUSE = "Tea House",
}

export enum ResourceType {
  TWIG = "TWIG",
  RESIN = "RESIN",
  BERRY = "BERRY",
  PEARL = "PEARL",
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

export type WonderCost = {
  resources: {
    [ResourceType.TWIG]: number;
    [ResourceType.PEBBLE]: number;
    [ResourceType.RESIN]: number;
    [ResourceType.PEARL]: number;
  };
  numCardsToDiscard: number;
};

export enum PlayerStatus {
  DURING_SEASON = "DURING_SEASON",
  PREPARING_FOR_SEASON = "PREPARING_FOR_SEASON",
  GAME_ENDED = "GAME_ENDED",
}

export type GameLogEntry = {
  entry: GameText;
};

export type CardPaymentOptions = {
  cardToDungeon?: CardName;

  useAssociatedCard?: boolean;

  // Eg crane, innkeeper, queen
  cardToUse?:
    | CardName.QUEEN
    | CardName.INNKEEPER
    | CardName.CRANE
    | CardName.INVENTOR
    | CardName.INN
    | null;

  resources: {
    [ResourceType.TWIG]?: number;
    [ResourceType.BERRY]?: number;
    [ResourceType.PEBBLE]?: number;
    [ResourceType.RESIN]?: number;
  };
};

export type TextPartEntity =
  | {
      type: "entity";
      entityType: "card";
      card: CardName;
    }
  | {
      type: "entity";
      entityType: "location";
      location: LocationName;
    }
  | {
      type: "entity";
      entityType: "event";
      event: EventName;
    }
  | {
      type: "entity";
      entityType: "adornment";
      adornment: AdornmentName;
    }
  | {
      type: "entity";
      entityType: "riverDestination";
      riverDestination: RiverDestinationName;
    }
  | {
      type: "entity";
      entityType: "riverDestinationSpot";
      spot: RiverDestinationSpotName;
    };

export type TextPartPlayer = {
  type: "player";
  name: string;
};

export type TextPartIcon =
  | { type: "resource"; resourceType: ResourceType | "ANY" }
  | { type: "cardType"; cardType: CardType }
  | { type: "points"; value: number }
  | { type: "symbol"; symbol: "VP" | "CARD" };
export type TextPartBR = { type: "BR" };
export type TextPartHR = { type: "HR" };
export type TextPartText =
  | { type: "text"; text: string }
  | { type: "em"; text: string }
  | { type: "i"; text: string }
  | { type: "iblock"; text: GameText };
export type TextPart =
  | TextPartText
  | TextPartIcon
  | TextPartBR
  | TextPartHR
  | TextPartPlayer
  | TextPartEntity;
export type GameText = TextPart[];

export interface IGameTextEntity {
  getGameTextPart(): TextPart;
}

export type GameOptions = {
  realtimePoints: boolean;
  pearlbrook: boolean;

  // NOT IMPLEMENTED YET
  spirecrest?: {
    expedition?: boolean;
  };
  bellfaire?: {
    market?: boolean;
    garlandAward?: boolean;
    flowerFestival?: boolean;
    forestLocations?: boolean;
    specialEvents?: boolean;
    playerPowers?: boolean;
  };
  newleaf?: {
    cards?: boolean;
    forestLocations?: boolean;
    specialEvents?: boolean;
    reserving?: boolean;
    station?: boolean;
    visitors?: boolean;
  };
  mistwood?: {
    throughTheSeasons?: boolean;
    corinneCards?: boolean;
  };
  hunterGatherer?: boolean;
  legendaryCards?: boolean;
};

export enum ExpansionType {
  PEARLBROOK = "PEARLBROOK",
  NEWLEAF = "NEWLEAF",
  BELLFAIRE = "BELLFAIRE",
  SPIRECREST = "SPIRECREST",
  MISTWOOD = "MISTWOOD",
}

export enum RiverDestinationType {
  SHOAL = "SHOAL",
  CITIZEN = "CITIZEN",
  LOCATION = "LOCATION",
}

export enum RiverDestinationName {
  SHOAL = "Shoal",
  GUS_THE_GARDENER = "Gus the Gardener",
  BOSLEY_THE_ARTIST = "Bosley the Artist",
  CRUSTINA_THE_CONSTABLE = "Crustina the Constable",
  ILUMINOR_THE_INVENTOR = "Iluminor the Inventor",
  SNOUT_THE_EXPLORER = "Snout the Explorer",
  OMICRON_THE_ELDER = "Omicron the Elder",
  BALLROOM = "Ballroom",
  WATERMILL = "Watermill",
  OBSERVATORY = "Observatory",
  MARKET = "Market",
  GREAT_HALL = "Great Hall",
  GARDENS = "Gardens",
}

export enum AdornmentName {
  SPYGLASS = "Spyglass",
  SCALES = "Scales",
  MIRROR = "Mirror",
  KEY_TO_THE_CITY = "Key to the City",
  SUNDIAL = "Sundial",
  GILDED_BOOK = "Gilded Book",
  SEAGLASS_AMULET = "Seaglass Amulet",
  MASQUE = "Masque",
  BELL = "Bell",
  HOURGLASS = "Hourglass",
  COMPASS = "Compass",
  TIARA = "Tiara",
}

export enum RiverDestinationSpotName {
  SHOAL = "SHOAL",
  THREE_PRODUCTION = "THREE_PRODUCTION",
  TWO_DESTINATION = "TWO_DESTINATION",
  TWO_GOVERNANCE = "TWO_GOVERNANCE",
  TWO_TRAVELER = "TWO_TRAVELER",
}

export type RiverDestinationSpotNameInfo = {
  name: RiverDestinationName | null;
  ambassadors: string[];
  revealed: boolean;
};

export type RiverDestinationMapSpots = Record<
  RiverDestinationSpotName,
  RiverDestinationSpotNameInfo
>;

export type TAssociatedCard =
  | {
      type: "CARD";
      cardName: CardName;
    }
  | {
      type: "GOLDEN_LEAF";
      cardType: CardType | "UNIQUE" | "COMMON";
    }
  | { type: "ANY" }
  | { type: "HUSBAND_WIFE" };
