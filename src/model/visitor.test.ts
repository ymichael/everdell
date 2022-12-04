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
      player.claimedVisitors?.push(VisitorName.BIM_LITTLE);

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
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.BOSLEY_TEDWARDSON);
      expect(false);
    });
  });
  describe.skip(VisitorName.BUTTERBELL_SWEETPAW, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.BUTTERBELL_SWEETPAW);
      expect(false);
    });
  });
  describe.skip(VisitorName.DIGGS_DEEPWELL, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DIGGS_DEEPWELL);
      expect(false);
    });
  });
  describe.skip(VisitorName.DILLWEED_QUICKSNIFF, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DILLWEED_QUICKSNIFF);
      expect(false);
    });
  });
  describe.skip(VisitorName.DIM_DUSTLIGHT, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DIM_DUSTLIGHT);
      expect(false);
    });
  });
  describe.skip(VisitorName.DIP_DUBBLE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DIP_DUBBLE);
      expect(false);
    });
  });
  describe.skip(VisitorName.DUNE_TARRINGTON, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DUNE_TARRINGTON);
      expect(false);
    });
  });
  describe.skip(VisitorName.DWELL_NORTHWATCH, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DWELL_NORTHWATCH);
      expect(false);
    });
  });
  describe.skip(VisitorName.EDVARD_TRIPTAIL, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.EDVARD_TRIPTAIL);
      expect(false);
    });
  });
  describe.skip(VisitorName.FRIN_STICKLY, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.FRIN_STICKLY);
      expect(false);
    });
  });
  describe.skip(VisitorName.GLINDIL_FRINK, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.GLINDIL_FRINK);
      expect(false);
    });
  });
  describe.skip(VisitorName.IGGY_SILVERSCALE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.IGGY_SILVERSCALE);
      expect(false);
    });
  });
  describe.skip(VisitorName.MOSSY_STEPTOE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.MOSSY_STEPTOE);
      expect(false);
    });
  });
  describe.skip(VisitorName.ORIN_NIMBLEPAW, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.ORIN_NIMBLEPAW);
      expect(false);
    });
  });
  describe.skip(VisitorName.OSCAR_LONGTALE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.OSCAR_LONGTALE);
      expect(false);
    });
  });
  describe.skip(VisitorName.PHILL_GURGLE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.PHILL_GURGLE);
      expect(false);
    });
  });
  describe.skip(VisitorName.PIFF_QUILLGLOW, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.PIFF_QUILLGLOW);
      expect(false);
    });
  });
  describe.skip(VisitorName.PLUM_SHORTCLAW, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.PLUM_SHORTCLAW);
      expect(false);
    });
  });
  describe.skip(VisitorName.QUINN_CLEANWHISKER, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.QUINN_CLEANWHISKER);
      expect(false);
    });
  });
  describe.skip(VisitorName.REEMY_SNIGGLE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.REEMY_SNIGGLE);
      expect(false);
    });
  });
  describe.skip(VisitorName.RIVIL_ABLACUS, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.RIVIL_ABLACUS);
      expect(false);
    });
  });
  describe.skip(VisitorName.RUBY_DEW, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.RUBY_DEW);
      expect(false);
    });
  });
  describe.skip(VisitorName.SARIS_CLEARWHISTLE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.SARIS_CLEARWHISTLE);
      expect(false);
    });
  });
  describe.skip(VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III);
      expect(false);
    });
  });
  describe.skip(VisitorName.SKIN_SHINYSNOUT, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.SKIN_SHINYSNOUT);
      expect(false);
    });
  });
  describe.skip(VisitorName.SNOUT_PUDDLEHOP, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.SNOUT_PUDDLEHOP);
      expect(false);
    });
  });
  describe.skip(VisitorName.TRISS_PESKE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.TRISS_PESKE);
      expect(false);
    });
  });
  describe.skip(VisitorName.VARA_AND_BRUN_MAYBERRY, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.VARA_AND_BRUN_MAYBERRY);
      expect(false);
    });
  });
  describe.skip(VisitorName.WILDELL_FAMILY, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.WILDELL_FAMILY);
      expect(false);
    });
  });
  describe.skip(VisitorName.WILLOW_GREENGRIN, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.WILLOW_GREENGRIN);
      expect(false);
    });
  });
  describe.skip(VisitorName.WIMBLE_WUFFLE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.WIMBLE_WUFFLE);
      expect(false);
    });
  });
});
