import expect from "expect.js";
import { GameState } from "./gameState";
import { Player } from "./player";
import { CardName, VisitorName } from "./types";
import { testInitialGameState } from "./testHelpers";

describe("Visitor", () => {
  let gameState: GameState;
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState({
      visitors: [VisitorName.BIM_LITTLE, VisitorName.DIM_DUSTLIGHT],
      gameOptions: { newleaf: { visitors: true } },
    });
  });

  describe(VisitorName.BIM_LITTLE, () => {
    it("gives points when player has at least 6 destination cards in city when claimed", () => {
      player = gameState.getActivePlayer();
      player.visitorsSelected?.push(VisitorName.BIM_LITTLE);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      player.addToCityMulti(gameState, [
        CardName.INN,
        CardName.INN,
        CardName.INN,
        CardName.INN,
        CardName.INN,
        CardName.INN,
      ]);

      expect(player.getPointsFromVisitors(gameState)).to.be(7);
    });
  });
  describe.skip(VisitorName.BOSLEY_TEDWARDSON, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.BUTTERBELL_SWEETPAW, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.DIGGS_DEEPWELL, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.DILLWEED_QUICKSNIFF, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.DIM_DUSTLIGHT, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.DIP_DUBBLE, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.DUNE_TARRINGTON, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.DWELL_NORTHWATCH, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.EDVARD_TRIPTAIL, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.FRIN_STICKLY, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.GLINDIL_FRINK, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.IGGY_SILVERSCALE, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.MOSSY_STEPTOE, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.ORIN_NIMBLEPAW, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.OSCAR_LONGTALE, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.PHILL_GURGLE, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.PIFF_QUILLGLOW, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.PLUM_SHORTCLAW, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.QUINN_CLEANWHISKER, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.REEMY_SNIGGLE, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.RIVIL_ABLACUS, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.RUBY_DEW, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.SARIS_CLEARWHISTLE, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.SKIN_SHINYSNOUT, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.SNOUT_PUDDLEHOP, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.TRISS_PESKE, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.VARA_AND_BRUN_MAYBERRY, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.WILDELL_FAMILY, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.WILLOW_GREENGRIN, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
  describe.skip(VisitorName.WIMBLE_WUFFLE, () => {
    it("gives correct number of points when claimed", () => {
      expect(false);
    });
  });
});
