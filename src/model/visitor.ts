import {
  //   CardType,
  //   EventType,
  GameText,
  GameInput,
  //   TextPartEntity,
  //   IGameTextEntity,
  //   ResourceType,
  VisitorName,
} from "./types";
import {
  GameState,
  GameStatePointsFn,
  GameStatePlayFn,
  GameStatePlayable,
} from "./gameState";
// import { Event } from "./event";
import { CardStack } from "./cardStack";
// import { Card } from "./card";
import { Player } from "./player";
import { toGameText } from "./gameText";

// Newleaf Visitors
export class Visitor implements GameStatePlayable /*, IGameTextEntity*/ {
  readonly name: VisitorName;
  readonly description: GameText;
  readonly baseVP: number;
  readonly playInner: GameStatePlayFn;
  readonly pointsInner: GameStatePointsFn | undefined;

  constructor({
    name,
    description,
    baseVP = 0,
    pointsInner,
    playInner,
  }: {
    name: VisitorName;
    description: GameText;
    baseVP?: number;
    pointsInner?: GameStatePointsFn;
    playInner: GameStatePlayFn;
  }) {
    this.name = name;
    this.description = description;
    this.baseVP = baseVP;
    this.pointsInner = pointsInner;
    this.playInner = playInner;
  }

  // TODO: Implement
  //   getGameTextPart(): TextPartEntity {
  //     return {
  //       type: "entity",
  //       entityType: "visitor",
  //       visitor: this.name,
  //     };
  //   }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    return !this.canPlayCheck(gameState, gameInput);
  }

  canPlayCheck(gameState: GameState, gameInput: GameInput): string | null {
    return null;
  }

  play(gameState: GameState, gameInput: GameInput): void {
    const canPlayError = this.canPlayCheck(gameState, gameInput);

    if (canPlayError) {
      throw new Error(canPlayError);
    }
  }

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
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.BOSLEY_TEDWARDSON]: new Visitor({
    name: VisitorName.BOSLEY_TEDWARDSON,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.BUTTERBELL_SWEETPAW]: new Visitor({
    name: VisitorName.BUTTERBELL_SWEETPAW,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.DIGGS_DEEPWELL]: new Visitor({
    name: VisitorName.DIGGS_DEEPWELL,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.DILLWEED_QUICKSNIFF]: new Visitor({
    name: VisitorName.DILLWEED_QUICKSNIFF,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.DIM_DUSTLIGHT]: new Visitor({
    name: VisitorName.DIM_DUSTLIGHT,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.DIP_DUBBLE]: new Visitor({
    name: VisitorName.DIP_DUBBLE,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.DUNE_TARRINGTON]: new Visitor({
    name: VisitorName.DUNE_TARRINGTON,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.DWELL_NORTHWATCH]: new Visitor({
    name: VisitorName.DWELL_NORTHWATCH,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.EDVARD_TRIPTAIL]: new Visitor({
    name: VisitorName.EDVARD_TRIPTAIL,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.FRIN_STICKLY]: new Visitor({
    name: VisitorName.FRIN_STICKLY,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.GLINDIL_FRINK]: new Visitor({
    name: VisitorName.GLINDIL_FRINK,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.IGGY_SILVERSCALE]: new Visitor({
    name: VisitorName.IGGY_SILVERSCALE,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.MOSSY_STEPTOE]: new Visitor({
    name: VisitorName.MOSSY_STEPTOE,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.ORIN_NIMBLEPAW]: new Visitor({
    name: VisitorName.ORIN_NIMBLEPAW,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.OSCAR_LONGTALE]: new Visitor({
    name: VisitorName.OSCAR_LONGTALE,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.PHILL_GURGLE]: new Visitor({
    name: VisitorName.PHILL_GURGLE,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.PIFF_QUILLGLOW]: new Visitor({
    name: VisitorName.PIFF_QUILLGLOW,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.PLUM_SHORTCLAW]: new Visitor({
    name: VisitorName.PLUM_SHORTCLAW,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.QUINN_CLEANWHISKER]: new Visitor({
    name: VisitorName.QUINN_CLEANWHISKER,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.REEMY_SNIGGLE]: new Visitor({
    name: VisitorName.REEMY_SNIGGLE,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.RIVIL_ABLACUS]: new Visitor({
    name: VisitorName.RIVIL_ABLACUS,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.RUBY_DEW]: new Visitor({
    name: VisitorName.RUBY_DEW,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.SARIS_CLEARWHISTLE]: new Visitor({
    name: VisitorName.SARIS_CLEARWHISTLE,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III]: new Visitor({
    name: VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.SKIN_SHINYSNOUT]: new Visitor({
    name: VisitorName.SKIN_SHINYSNOUT,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.SNOUT_PUDDLEHOP]: new Visitor({
    name: VisitorName.SNOUT_PUDDLEHOP,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.TRISS_PESKE]: new Visitor({
    name: VisitorName.TRISS_PESKE,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.VARA_AND_BRUN_MAYBERRY]: new Visitor({
    name: VisitorName.VARA_AND_BRUN_MAYBERRY,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.WILDELL_FAMILY]: new Visitor({
    name: VisitorName.WILDELL_FAMILY,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.WILLOW_GREENGRIN]: new Visitor({
    name: VisitorName.WILLOW_GREENGRIN,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
  [VisitorName.WIMBLE_WUFFLE]: new Visitor({
    name: VisitorName.WIMBLE_WUFFLE,
    description: toGameText([]),
    pointsInner: (player) => {
      return 0;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      return;
    },
  }),
};

export const allVisitors = (): CardStack<VisitorName> => {
  return new CardStack({
    name: "Visitors",
    cards: Object.values(VisitorName),
  });
};
