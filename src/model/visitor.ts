import {
  CardType,
  GameText,
  ResourceType,
  ResourceMap,
  VisitorName,
  EventType,
} from "./types";
import { GameState, GameStatePointsFn } from "./gameState";
import { Player } from "./player";
import { toGameText } from "./gameText";
import cloneDeep from "lodash/cloneDeep";
import shuffle from "lodash/shuffle";
import { VisitorStackJSON } from "./jsonTypes";

// Newleaf Visitors
export class Visitor {
  readonly name: VisitorName;
  readonly description: GameText;
  readonly baseVP: number;
  readonly isEligible?: (player: Player, gameState: GameState) => boolean;

  readonly pointsInner: GameStatePointsFn | undefined;
  readonly resourceRequirements?: ResourceMap;
  readonly cardColorRequirements?: Partial<Record<CardType, number>>;
  readonly eventTypeRequirements?: Partial<Record<EventType, number>>;

  constructor({
    name,
    description,
    baseVP = 0,
    isEligible,
    resourceRequirements,
    cardColorRequirements,
    eventTypeRequirements,
  }: {
    name: VisitorName;
    description: GameText;
    baseVP?: number;
    isEligible?: (player: Player, gameState: GameState) => boolean;
    resourceRequirements?: ResourceMap;
    cardColorRequirements?: Partial<Record<CardType, number>>;
    eventTypeRequirements?: Partial<Record<EventType, number>>;
  }) {
    this.name = name;
    this.description = description;
    this.baseVP = baseVP;
    this.isEligible = isEligible;
    this.resourceRequirements = resourceRequirements;
    this.cardColorRequirements = cardColorRequirements;
    this.eventTypeRequirements = eventTypeRequirements;
  }

  // TODO: Implement
  //   getGameTextPart(): TextPartEntity {
  //     return {
  //       type: "entity",
  //       entityType: "visitor",
  //       visitor: this.name,
  //     };
  //   }

  getPoints(player: Player, gameState: GameState): number {
    if (this.resourceRequirements) {
      for (const [resourceType, numRequired] of Object.entries(
        this.resourceRequirements
      )) {
        if (
          player.getNumResourcesByType(resourceType as ResourceType, true) <
          numRequired
        ) {
          return 0;
        }
      }
      return this.baseVP;
    }

    if (this.cardColorRequirements) {
      for (const [cardType, numRequired] of Object.entries(
        this.cardColorRequirements
      )) {
        if (player.getNumCardType(cardType as CardType) < numRequired) {
          return 0;
        }
      }
      return this.baseVP;
    }

    if (this.eventTypeRequirements) {
      for (const [eventType, numRequired] of Object.entries(
        this.eventTypeRequirements
      )) {
        if (
          player.getNumClaimedEventsByType(eventType as EventType) < numRequired
        ) {
          return 0;
        }
      }
      return this.baseVP;
    }

    if (this.isEligible?.(player, gameState)) {
      return this.baseVP;
    }
    return 0;
  }

  static fromName(name: VisitorName): Visitor {
    return VISITOR_REGISTRY[name];
  }
}

const VISITOR_REGISTRY: Record<VisitorName, Visitor> = {
  [VisitorName.BIM_LITTLE]: new Visitor({
    name: VisitorName.BIM_LITTLE,
    description: toGameText(["At least 6 DESTINATION cards in your city."]),
    baseVP: 7,
    cardColorRequirements: { [CardType.DESTINATION]: 6 },
  }),
  [VisitorName.BOSLEY_TEDWARDSON]: new Visitor({
    name: VisitorName.BOSLEY_TEDWARDSON,
    description: toGameText(["At least 2 of each card color in your city."]),
    baseVP: 9,
    cardColorRequirements: {
      [CardType.DESTINATION]: 2,
      [CardType.GOVERNANCE]: 2,
      [CardType.PROSPERITY]: 2,
      [CardType.PRODUCTION]: 2,
      [CardType.TRAVELER]: 2,
    },
  }),
  [VisitorName.BUTTERBELL_SWEETPAW]: new Visitor({
    name: VisitorName.BUTTERBELL_SWEETPAW,
    description: toGameText(["At least 15 cards in your city."]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return player.getNumCardsInCity() >= 15;
    },
  }),
  [VisitorName.DIGGS_DEEPWELL]: new Visitor({
    name: VisitorName.DIGGS_DEEPWELL,
    description: toGameText(["At least 2 PEBBLE left over."]),
    baseVP: 6,
    resourceRequirements: { [ResourceType.PEBBLE]: 2 },
  }),
  [VisitorName.DILLWEED_QUICKSNIFF]: new Visitor({
    name: VisitorName.DILLWEED_QUICKSNIFF,
    description: toGameText(["More Constructions than Critters in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return player.getNumPlayedConstructions() > player.getNumPlayedCritters();
    },
  }),
  [VisitorName.DIM_DUSTLIGHT]: new Visitor({
    name: VisitorName.DIM_DUSTLIGHT,
    description: toGameText(["At least 6 Unique cards in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return (
        player.getNumPlayedUniqueConstructions() +
          player.getNumPlayedUniqueCritters() >=
        6
      );
    },
  }),
  [VisitorName.DIP_DUBBLE]: new Visitor({
    name: VisitorName.DIP_DUBBLE,
    description: toGameText(["At least 4 DESTINATION cards in your city."]),
    baseVP: 5,
    cardColorRequirements: { [CardType.DESTINATION]: 4 },
  }),
  [VisitorName.DUNE_TARRINGTON]: new Visitor({
    name: VisitorName.DUNE_TARRINGTON,
    description: toGameText(["At least 6 PROSPERITY cards in your city."]),
    baseVP: 6,
    cardColorRequirements: { [CardType.PROSPERITY]: 6 },
  }),
  [VisitorName.DWELL_NORTHWATCH]: new Visitor({
    name: VisitorName.DWELL_NORTHWATCH,
    description: toGameText(["At least 4 TRAVELER cards in your city."]),
    baseVP: 5,
    cardColorRequirements: { [CardType.TRAVELER]: 4 },
  }),
  [VisitorName.EDVARD_TRIPTAIL]: new Visitor({
    name: VisitorName.EDVARD_TRIPTAIL,
    description: toGameText(["At least 1 of each card color in your city."]),
    baseVP: 5,
    cardColorRequirements: {
      [CardType.DESTINATION]: 1,
      [CardType.GOVERNANCE]: 1,
      [CardType.PROSPERITY]: 1,
      [CardType.PRODUCTION]: 1,
      [CardType.TRAVELER]: 1,
    },
  }),
  [VisitorName.FRIN_STICKLY]: new Visitor({
    name: VisitorName.FRIN_STICKLY,
    description: toGameText(["At least 4 RESIN left over."]),
    baseVP: 6,
    resourceRequirements: { [ResourceType.RESIN]: 4 },
  }),
  [VisitorName.GLINDIL_FRINK]: new Visitor({
    name: VisitorName.GLINDIL_FRINK,
    description: toGameText(["At least 4 PROSPERITY cards in your city."]),
    baseVP: 4,
    cardColorRequirements: { [CardType.PROSPERITY]: 4 },
  }),
  [VisitorName.IGGY_SILVERSCALE]: new Visitor({
    name: VisitorName.IGGY_SILVERSCALE,
    description: toGameText(["At least 6 TRAVELER cards in your city."]),
    baseVP: 7,
    cardColorRequirements: { [CardType.TRAVELER]: 6 },
  }),
  [VisitorName.MOSSY_STEPTOE]: new Visitor({
    name: VisitorName.MOSSY_STEPTOE,
    description: toGameText(["At least 5 PRODUCTION cards in your city."]),
    baseVP: 5,
    cardColorRequirements: { [CardType.PRODUCTION]: 5 },
  }),
  [VisitorName.ORIN_NIMBLEPAW]: new Visitor({
    name: VisitorName.ORIN_NIMBLEPAW,
    description: toGameText(["At least 2 workers on Journey."]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return player.getNumWorkersOnJourney(gameState) >= 2;
    },
  }),
  [VisitorName.OSCAR_LONGTALE]: new Visitor({
    name: VisitorName.OSCAR_LONGTALE,
    description: toGameText(["More Critters than Constructions in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return player.getNumPlayedConstructions() < player.getNumPlayedCritters();
    },
  }),
  [VisitorName.PHILL_GURGLE]: new Visitor({
    name: VisitorName.PHILL_GURGLE,
    description: toGameText(["No more than 2 PRODUCTION cards in your city."]),
    baseVP: 10,
    isEligible: (player, gameState) => {
      return player.getNumCardType(CardType.PRODUCTION) <= 2;
    },
  }),
  [VisitorName.PIFF_QUILLGLOW]: new Visitor({
    name: VisitorName.PIFF_QUILLGLOW,
    description: toGameText(["At least 5 TWIG left over."]),
    baseVP: 6,
    resourceRequirements: { [ResourceType.TWIG]: 5 },
  }),
  [VisitorName.PLUM_SHORTCLAW]: new Visitor({
    name: VisitorName.PLUM_SHORTCLAW,
    description: toGameText(["At least 4 GOVERNANCE cards in your city."]),
    baseVP: 5,
    cardColorRequirements: { [CardType.GOVERNANCE]: 4 },
  }),
  [VisitorName.QUINN_CLEANWHISKER]: new Visitor({
    name: VisitorName.QUINN_CLEANWHISKER,
    description: toGameText([
      "At least 6 Critters and 6 Constructions in your city.",
    ]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return (
        player.getNumPlayedConstructions() >= 6 &&
        player.getNumPlayedCritters() >= 6
      );
    },
  }),
  [VisitorName.REEMY_SNIGGLE]: new Visitor({
    name: VisitorName.REEMY_SNIGGLE,
    description: toGameText(["Achieve at least 3 basic Events."]),
    baseVP: 7,
    eventTypeRequirements: { [EventType.BASIC]: 3 },
  }),
  [VisitorName.RIVIL_ABLACUS]: new Visitor({
    name: VisitorName.RIVIL_ABLACUS,
    description: toGameText(["At least 6 GOVERNANCE cards in your city."]),
    baseVP: 7,
    cardColorRequirements: { [CardType.GOVERNANCE]: 6 },
  }),
  [VisitorName.RUBY_DEW]: new Visitor({
    name: VisitorName.RUBY_DEW,
    description: toGameText(["Achieve at least 2 special Events."]),
    baseVP: 8,
    eventTypeRequirements: { [EventType.SPECIAL]: 2 },
  }),
  [VisitorName.SARIS_CLEARWHISTLE]: new Visitor({
    name: VisitorName.SARIS_CLEARWHISTLE,
    description: toGameText(["At least 6 Common cards in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return (
        player.getNumPlayedCommonCritters() +
          player.getNumPlayedCommonConstructions() >=
        6
      );
    },
  }),
  [VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III]: new Visitor({
    name: VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III,
    description: toGameText(["At least 1 of each resource type left over."]),
    baseVP: 7,
    resourceRequirements: {
      [ResourceType.PEBBLE]: 1,
      [ResourceType.TWIG]: 1,
      [ResourceType.RESIN]: 1,
      [ResourceType.BERRY]: 1,
    },
  }),
  [VisitorName.SKIN_SHINYSNOUT]: new Visitor({
    name: VisitorName.SKIN_SHINYSNOUT,
    description: toGameText(["At least 10 point tokens."]),
    baseVP: 5,
    resourceRequirements: {
      [ResourceType.VP]: 10,
    },
  }),
  [VisitorName.SNOUT_PUDDLEHOP]: new Visitor({
    name: VisitorName.SNOUT_PUDDLEHOP,
    description: toGameText([
      "Achieve at least 2 basic Events and 1 Special event.",
    ]),
    baseVP: 8,
    eventTypeRequirements: { [EventType.BASIC]: 2, [EventType.SPECIAL]: 1 },
  }),
  [VisitorName.TRISS_PESKE]: new Visitor({
    name: VisitorName.TRISS_PESKE,
    description: toGameText([
      "At least 6 cards of one color in your city that isn't PRODUCTION.",
    ]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return (
        player.getNumCardType(CardType.DESTINATION) >= 6 ||
        player.getNumCardType(CardType.PROSPERITY) >= 6 ||
        player.getNumCardType(CardType.TRAVELER) >= 6 ||
        player.getNumCardType(CardType.GOVERNANCE) >= 6
      );
    },
  }),
  [VisitorName.VARA_AND_BRUN_MAYBERRY]: new Visitor({
    name: VisitorName.VARA_AND_BRUN_MAYBERRY,
    description: toGameText(["At least 7 Unique cards in your city."]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return (
        player.getNumPlayedUniqueConstructions() +
          player.getNumPlayedUniqueCritters() >=
        7
      );
    },
  }),
  [VisitorName.WILDELL_FAMILY]: new Visitor({
    name: VisitorName.WILDELL_FAMILY,
    description: toGameText(["At least 9 Common cards in your city."]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return (
        player.getNumPlayedCommonCritters() +
          player.getNumPlayedCommonConstructions() >=
        9
      );
    },
  }),
  [VisitorName.WILLOW_GREENGRIN]: new Visitor({
    name: VisitorName.WILLOW_GREENGRIN,
    description: toGameText(["At least 7 TRAVELER cards in your city."]),
    baseVP: 7,
    cardColorRequirements: { [CardType.TRAVELER]: 7 },
  }),
  [VisitorName.WIMBLE_WUFFLE]: new Visitor({
    name: VisitorName.WIMBLE_WUFFLE,
    description: toGameText(["At least 3 BERRY left over."]),
    baseVP: 6,
    resourceRequirements: {
      [ResourceType.BERRY]: 3,
    },
  }),
};

export class VisitorStack {
  private revealed: (VisitorName | null)[];
  private rest: VisitorName[];

  constructor({ revealed, rest }: VisitorStackJSON) {
    this.revealed = revealed;
    this.rest = rest;
  }

  getRevealedVisitors(): VisitorName[] {
    this.revealed.forEach((x) => {
      if (!x) {
        throw new Error("Unexpected missing visitor.");
      }
    });
    return [...this.revealed] as VisitorName[];
  }

  peekAt(position: number): VisitorName | null {
    return this.revealed[position];
  }

  pushTile(name: VisitorName): void {
    this.rest.unshift(name);
  }

  replaceAt(position: number, shouldDiscard: boolean): VisitorName {
    const [next, ...rest] = this.rest;
    this.rest = rest;
    const currTile = this.peekAt(position);

    // if there is a tile at index 'position', remove it
    // if shouldDiscard is false, player is drawing it into their city
    if (currTile && shouldDiscard) {
      this.rest.push(currTile);
    }

    this.revealed[position] = next;
    return next;
  }

  toJSON(includePrivate: boolean): VisitorStackJSON {
    return cloneDeep({
      revealed: this.revealed,
      rest: [],
      ...(includePrivate ? { rest: this.rest } : {}),
    });
  }

  static fromJSON(visitorStackJSON: VisitorStackJSON): VisitorStack {
    return new VisitorStack(visitorStackJSON);
  }
}

export function intialVisitorStack(): VisitorStack {
  const allVisitors: VisitorName[] = Object.values(VisitorName);
  const [one, two, ...rest] = shuffle(allVisitors);
  return new VisitorStack({
    revealed: [one, two],
    rest,
  });
}
