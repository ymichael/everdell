import { GameText, VisitorName } from "./types";
import { GameState, GameStatePointsFn, GameStatePlayable } from "./gameState";
import { CardStack } from "./cardStack";
import { Player } from "./player";
import { toGameText } from "./gameText";

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
    // TODO: implement
    return 0;
  }

  static fromName(name: VisitorName): Visitor {
    return VISITOR_REGISTRY[name];
  }
}

const VISITOR_REGISTRY: Record<VisitorName, Visitor> = {
  [VisitorName.BIM_LITTLE]: new Visitor({
    name: VisitorName.BIM_LITTLE,
    description: toGameText([]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.BOSLEY_TEDWARDSON]: new Visitor({
    name: VisitorName.BOSLEY_TEDWARDSON,
    description: toGameText([]),
    baseVP: 9,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.BUTTERBELL_SWEETPAW]: new Visitor({
    name: VisitorName.BUTTERBELL_SWEETPAW,
    description: toGameText([]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DIGGS_DEEPWELL]: new Visitor({
    name: VisitorName.DIGGS_DEEPWELL,
    description: toGameText([]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DILLWEED_QUICKSNIFF]: new Visitor({
    name: VisitorName.DILLWEED_QUICKSNIFF,
    description: toGameText([]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DIM_DUSTLIGHT]: new Visitor({
    name: VisitorName.DIM_DUSTLIGHT,
    description: toGameText([]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DIP_DUBBLE]: new Visitor({
    name: VisitorName.DIP_DUBBLE,
    description: toGameText([]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DUNE_TARRINGTON]: new Visitor({
    name: VisitorName.DUNE_TARRINGTON,
    description: toGameText([]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.DWELL_NORTHWATCH]: new Visitor({
    name: VisitorName.DWELL_NORTHWATCH,
    description: toGameText([]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.EDVARD_TRIPTAIL]: new Visitor({
    name: VisitorName.EDVARD_TRIPTAIL,
    description: toGameText([]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.FRIN_STICKLY]: new Visitor({
    name: VisitorName.FRIN_STICKLY,
    description: toGameText([]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.GLINDIL_FRINK]: new Visitor({
    name: VisitorName.GLINDIL_FRINK,
    description: toGameText([]),
    baseVP: 4,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.IGGY_SILVERSCALE]: new Visitor({
    name: VisitorName.IGGY_SILVERSCALE,
    description: toGameText([]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.MOSSY_STEPTOE]: new Visitor({
    name: VisitorName.MOSSY_STEPTOE,
    description: toGameText([]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.ORIN_NIMBLEPAW]: new Visitor({
    name: VisitorName.ORIN_NIMBLEPAW,
    description: toGameText([]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.OSCAR_LONGTALE]: new Visitor({
    name: VisitorName.OSCAR_LONGTALE,
    description: toGameText([]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.PHILL_GURGLE]: new Visitor({
    name: VisitorName.PHILL_GURGLE,
    description: toGameText([]),
    baseVP: 10,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.PIFF_QUILLGLOW]: new Visitor({
    name: VisitorName.PIFF_QUILLGLOW,
    description: toGameText([]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.PLUM_SHORTCLAW]: new Visitor({
    name: VisitorName.PLUM_SHORTCLAW,
    description: toGameText([]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.QUINN_CLEANWHISKER]: new Visitor({
    name: VisitorName.QUINN_CLEANWHISKER,
    description: toGameText([]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.REEMY_SNIGGLE]: new Visitor({
    name: VisitorName.REEMY_SNIGGLE,
    description: toGameText([]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.RIVIL_ABLACUS]: new Visitor({
    name: VisitorName.RIVIL_ABLACUS,
    description: toGameText([]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.RUBY_DEW]: new Visitor({
    name: VisitorName.RUBY_DEW,
    description: toGameText([]),
    baseVP: 8,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.SARIS_CLEARWHISTLE]: new Visitor({
    name: VisitorName.SARIS_CLEARWHISTLE,
    description: toGameText([]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III]: new Visitor({
    name: VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III,
    description: toGameText([]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.SKIN_SHINYSNOUT]: new Visitor({
    name: VisitorName.SKIN_SHINYSNOUT,
    description: toGameText([]),
    baseVP: 5,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.SNOUT_PUDDLEHOP]: new Visitor({
    name: VisitorName.SNOUT_PUDDLEHOP,
    description: toGameText([]),
    baseVP: 8,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.TRISS_PESKE]: new Visitor({
    name: VisitorName.TRISS_PESKE,
    description: toGameText([]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.VARA_AND_BRUN_MAYBERRY]: new Visitor({
    name: VisitorName.VARA_AND_BRUN_MAYBERRY,
    description: toGameText([]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.WILDELL_FAMILY]: new Visitor({
    name: VisitorName.WILDELL_FAMILY,
    description: toGameText([]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.WILLOW_GREENGRIN]: new Visitor({
    name: VisitorName.WILLOW_GREENGRIN,
    description: toGameText([]),
    baseVP: 7,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
  [VisitorName.WIMBLE_WUFFLE]: new Visitor({
    name: VisitorName.WIMBLE_WUFFLE,
    description: toGameText([]),
    baseVP: 6,
    isEligible: (player, gameState) => {
      return false;
    },
  }),
};

export const allVisitors = (): CardStack<VisitorName> => {
  return new CardStack({
    name: "Visitors",
    cards: Object.values(VisitorName),
  });
};
