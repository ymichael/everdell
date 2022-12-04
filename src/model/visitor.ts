import { CardType, GameText, VisitorName } from "./types";
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
  readonly isEligible: (player: Player, gameState: GameState) => boolean;

  readonly pointsInner: GameStatePointsFn | undefined;

  constructor({
    name,
    description,
    baseVP = 0,
    isEligible,
  }: {
    name: VisitorName;
    description: GameText;
    baseVP?: number;
    isEligible: (player: Player, gameState: GameState) => boolean;
  }) {
    this.name = name;
    this.description = description;
    this.baseVP = baseVP;
    this.isEligible = isEligible;
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
    if (this.isEligible(player, gameState)) {
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
    isEligible: (player, gameState) => {
      const numDestinations = player.getNumCardType(CardType.DESTINATION);
      return numDestinations >= 6;
    },
  }),
  [VisitorName.BOSLEY_TEDWARDSON]: new Visitor({
    name: VisitorName.BOSLEY_TEDWARDSON,
    description: toGameText(["At least 2 of each card color in your city."]),
    baseVP: 9,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.BUTTERBELL_SWEETPAW]: new Visitor({
    name: VisitorName.BUTTERBELL_SWEETPAW,
    description: toGameText(["At least 15 cards in your city."]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DIGGS_DEEPWELL]: new Visitor({
    name: VisitorName.DIGGS_DEEPWELL,
    description: toGameText(["At least 2 PEBBLE left over."]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DILLWEED_QUICKSNIFF]: new Visitor({
    name: VisitorName.DILLWEED_QUICKSNIFF,
    description: toGameText(["More Constructions than Critters in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DIM_DUSTLIGHT]: new Visitor({
    name: VisitorName.DIM_DUSTLIGHT,
    description: toGameText(["At least 6 Unique cards in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DIP_DUBBLE]: new Visitor({
    name: VisitorName.DIP_DUBBLE,
    description: toGameText(["At least 4 DESTINATION cards in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DUNE_TARRINGTON]: new Visitor({
    name: VisitorName.DUNE_TARRINGTON,
    description: toGameText(["At least 6 PROSPERITY cards in your city."]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DWELL_NORTHWATCH]: new Visitor({
    name: VisitorName.DWELL_NORTHWATCH,
    description: toGameText(["At least 4 TRAVELER cards in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.EDVARD_TRIPTAIL]: new Visitor({
    name: VisitorName.EDVARD_TRIPTAIL,
    description: toGameText(["At least 1 of each card color in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.FRIN_STICKLY]: new Visitor({
    name: VisitorName.FRIN_STICKLY,
    description: toGameText(["At least 4 RESIN left over."]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.GLINDIL_FRINK]: new Visitor({
    name: VisitorName.GLINDIL_FRINK,
    description: toGameText(["At least 4 PROSPERITY cards in your city."]),
    baseVP: 4,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.IGGY_SILVERSCALE]: new Visitor({
    name: VisitorName.IGGY_SILVERSCALE,
    description: toGameText(["At least 6 TRAVELER cards in your city."]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.MOSSY_STEPTOE]: new Visitor({
    name: VisitorName.MOSSY_STEPTOE,
    description: toGameText(["At least 5 PRODUCTION cards in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.ORIN_NIMBLEPAW]: new Visitor({
    name: VisitorName.ORIN_NIMBLEPAW,
    description: toGameText(["At least 2 workers on Journey."]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.OSCAR_LONGTALE]: new Visitor({
    name: VisitorName.OSCAR_LONGTALE,
    description: toGameText(["More Critters than Constructions in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.PHILL_GURGLE]: new Visitor({
    name: VisitorName.PHILL_GURGLE,
    description: toGameText(["No more than 2 PRODUCTION cards in your city."]),
    baseVP: 10,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.PIFF_QUILLGLOW]: new Visitor({
    name: VisitorName.PIFF_QUILLGLOW,
    description: toGameText(["At least 5 TWIG left over."]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.PLUM_SHORTCLAW]: new Visitor({
    name: VisitorName.PLUM_SHORTCLAW,
    description: toGameText(["At least 4 GOVERNANCE cards in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.QUINN_CLEANWHISKER]: new Visitor({
    name: VisitorName.QUINN_CLEANWHISKER,
    description: toGameText([
      "At least 6 Critters and 6 Constructions in your city.",
    ]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.REEMY_SNIGGLE]: new Visitor({
    name: VisitorName.REEMY_SNIGGLE,
    description: toGameText(["Achieve at least 3 basic Events."]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.RIVIL_ABLACUS]: new Visitor({
    name: VisitorName.RIVIL_ABLACUS,
    description: toGameText(["At least 6 GOVERNANCE cards in your city."]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.RUBY_DEW]: new Visitor({
    name: VisitorName.RUBY_DEW,
    description: toGameText(["Achieve at least 2 special Events.."]),
    baseVP: 8,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.SARIS_CLEARWHISTLE]: new Visitor({
    name: VisitorName.SARIS_CLEARWHISTLE,
    description: toGameText(["At least 6 Common cards in your city."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III]: new Visitor({
    name: VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III,
    description: toGameText(["At least 1 of each resource type left over."]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.SKIN_SHINYSNOUT]: new Visitor({
    name: VisitorName.SKIN_SHINYSNOUT,
    description: toGameText(["At least 10 point tokens."]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.SNOUT_PUDDLEHOP]: new Visitor({
    name: VisitorName.SNOUT_PUDDLEHOP,
    description: toGameText([
      "Achieve at least 2 basic Events and 1 Special event.",
    ]),
    baseVP: 8,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.TRISS_PESKE]: new Visitor({
    name: VisitorName.TRISS_PESKE,
    description: toGameText([
      "At least 6 cards of one color in your city that isn't PRODUCTION.",
    ]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.VARA_AND_BRUN_MAYBERRY]: new Visitor({
    name: VisitorName.VARA_AND_BRUN_MAYBERRY,
    description: toGameText(["At least 7 Unique cards in your city."]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.WILDELL_FAMILY]: new Visitor({
    name: VisitorName.WILDELL_FAMILY,
    description: toGameText(["At least 9 Common cards in your city."]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.WILLOW_GREENGRIN]: new Visitor({
    name: VisitorName.WILLOW_GREENGRIN,
    description: toGameText(["At least 7 TRAVELER cards in your city."]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.WIMBLE_WUFFLE]: new Visitor({
    name: VisitorName.WIMBLE_WUFFLE,
    description: toGameText(["At least 3 BERRY left over."]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
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
