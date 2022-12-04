import expect from "expect.js";
import { GameState } from "./gameState";
import { Player } from "./player";
import { CardName, EventName, ResourceType, VisitorName } from "./types";
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
  describe(VisitorName.BOSLEY_TEDWARDSON, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.BOSLEY_TEDWARDSON);
      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      player.addToCityMulti(gameState, [
        CardName.INN,
        CardName.INN,
        CardName.DUNGEON,
        CardName.HISTORIAN,
        CardName.FARM,
        CardName.FARM,
        CardName.WANDERER,
        CardName.WANDERER,
        CardName.WIFE,
        CardName.WIFE,
      ]);

      expect(player.getPointsFromVisitors(gameState)).to.be(9);
    });
  });
  describe(VisitorName.BUTTERBELL_SWEETPAW, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.BUTTERBELL_SWEETPAW);

      for (let x = 0; x < 15; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.FARM);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(6);
    });
  });
  describe(VisitorName.DIGGS_DEEPWELL, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DIGGS_DEEPWELL);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      player.gainResources(gameState, { [ResourceType.PEBBLE]: 2 });

      expect(player.getPointsFromVisitors(gameState)).to.be(6);
    });
  });
  describe(VisitorName.DILLWEED_QUICKSNIFF, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DILLWEED_QUICKSNIFF);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 3; x++) {
        player.addToCity(gameState, CardName.FARM);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(5);

      for (let x = 0; x < 5; x++) {
        player.addToCity(gameState, CardName.WIFE);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(0);
    });
  });
  describe(VisitorName.DIM_DUSTLIGHT, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DIM_DUSTLIGHT);

      const cardsToAdd = [
        CardName.RANGER,
        CardName.DUNGEON,
        CardName.QUEEN,
        CardName.KING,
        CardName.PALACE,
        CardName.CASTLE,
      ];

      cardsToAdd.forEach((cardName) => {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, cardName);
      });

      expect(player.getPointsFromVisitors(gameState)).to.be(5);
    });
  });
  describe(VisitorName.DIP_DUBBLE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DIP_DUBBLE);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      player.addToCityMulti(gameState, [
        CardName.INN,
        CardName.INN,
        CardName.INN,
        CardName.INN,
      ]);

      expect(player.getPointsFromVisitors(gameState)).to.be(5);
    });
  });
  describe(VisitorName.DUNE_TARRINGTON, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DUNE_TARRINGTON);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 6; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.WIFE);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(6);
    });
  });
  describe(VisitorName.DWELL_NORTHWATCH, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.DWELL_NORTHWATCH);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 4; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.WANDERER);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(5);
    });
  });
  describe(VisitorName.EDVARD_TRIPTAIL, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.EDVARD_TRIPTAIL);

      const cardsToAdd = [
        CardName.RANGER,
        CardName.DUNGEON,
        CardName.QUEEN,
        CardName.KING,
        CardName.FARM,
      ];

      cardsToAdd.forEach((cardName) => {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, cardName);
      });

      expect(player.getPointsFromVisitors(gameState)).to.be(5);
    });
  });
  describe(VisitorName.FRIN_STICKLY, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.FRIN_STICKLY);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      player.gainResources(gameState, { [ResourceType.RESIN]: 4 });

      expect(player.getPointsFromVisitors(gameState)).to.be(6);
    });
  });
  describe(VisitorName.GLINDIL_FRINK, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.GLINDIL_FRINK);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 4; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.WIFE);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(4);
    });
  });
  describe(VisitorName.IGGY_SILVERSCALE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.IGGY_SILVERSCALE);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 6; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.WANDERER);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(7);
    });
  });
  describe(VisitorName.MOSSY_STEPTOE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.MOSSY_STEPTOE);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 5; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.FARM);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(5);
    });
  });
  describe.skip(VisitorName.ORIN_NIMBLEPAW, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.ORIN_NIMBLEPAW);
      expect(false);
    });
  });
  describe(VisitorName.OSCAR_LONGTALE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.OSCAR_LONGTALE);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 3; x++) {
        player.addToCity(gameState, CardName.WIFE);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(5);

      for (let x = 0; x < 5; x++) {
        player.addToCity(gameState, CardName.FARM);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(0);
    });
  });
  describe(VisitorName.PHILL_GURGLE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.PHILL_GURGLE);

      expect(player.getPointsFromVisitors(gameState)).to.be(10);

      player.addToCity(gameState, CardName.FARM);
      expect(player.getPointsFromVisitors(gameState)).to.be(10);

      player.addToCity(gameState, CardName.FARM);
      expect(player.getPointsFromVisitors(gameState)).to.be(10);

      player.addToCity(gameState, CardName.FARM);
      expect(player.getPointsFromVisitors(gameState)).to.be(0);
    });
  });
  describe(VisitorName.PIFF_QUILLGLOW, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.PIFF_QUILLGLOW);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      player.gainResources(gameState, { [ResourceType.TWIG]: 5 });

      expect(player.getPointsFromVisitors(gameState)).to.be(6);
    });
  });
  describe(VisitorName.PLUM_SHORTCLAW, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.PLUM_SHORTCLAW);

      const cardsToAdd = [
        CardName.DUNGEON,
        CardName.COURTHOUSE,
        CardName.JUDGE,
        CardName.SHOPKEEPER,
      ];

      cardsToAdd.forEach((cardName) => {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, cardName);
      });

      expect(player.getPointsFromVisitors(gameState)).to.be(5);
    });
  });
  describe(VisitorName.QUINN_CLEANWHISKER, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.QUINN_CLEANWHISKER);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 6; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.WIFE);
      }

      for (let x = 0; x < 6; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.FARM);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(6);
    });
  });
  describe(VisitorName.REEMY_SNIGGLE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.REEMY_SNIGGLE);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);
      player.claimedEvents[EventName.BASIC_FOUR_PRODUCTION] = {};

      expect(player.getPointsFromVisitors(gameState)).to.be(0);
      player.claimedEvents[EventName.BASIC_THREE_DESTINATION] = {};

      expect(player.getPointsFromVisitors(gameState)).to.be(0);
      player.claimedEvents[EventName.BASIC_THREE_GOVERNANCE] = {};

      expect(player.getPointsFromVisitors(gameState)).to.be(7);
    });
  });
  describe(VisitorName.RIVIL_ABLACUS, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.RIVIL_ABLACUS);

      const cardsToAdd = [
        CardName.DUNGEON,
        CardName.COURTHOUSE,
        CardName.JUDGE,
        CardName.SHOPKEEPER,
        CardName.INNKEEPER,
        CardName.HISTORIAN,
      ];

      cardsToAdd.forEach((cardName) => {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, cardName);
      });

      expect(player.getPointsFromVisitors(gameState)).to.be(7);
    });
  });
  describe(VisitorName.RUBY_DEW, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.RUBY_DEW);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);
      player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED] = {};

      expect(player.getPointsFromVisitors(gameState)).to.be(0);
      player.claimedEvents[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS] = {};

      expect(player.getPointsFromVisitors(gameState)).to.be(8);
    });
  });
  describe(VisitorName.SARIS_CLEARWHISTLE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.SARIS_CLEARWHISTLE);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 6; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.FARM);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(5);
    });
  });
  describe(VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.SIR_TRIVLE_Q_S_MARQWILL_III);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      player.gainResources(gameState, {
        [ResourceType.RESIN]: 1,
        [ResourceType.TWIG]: 1,
        [ResourceType.PEBBLE]: 1,
        [ResourceType.BERRY]: 1,
      });

      expect(player.getPointsFromVisitors(gameState)).to.be(7);
    });
  });
  describe.skip(VisitorName.SKIN_SHINYSNOUT, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.SKIN_SHINYSNOUT);
      expect(false);
    });
  });
  describe(VisitorName.SNOUT_PUDDLEHOP, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.SNOUT_PUDDLEHOP);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);
      player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED] = {};

      expect(player.getPointsFromVisitors(gameState)).to.be(0);
      player.claimedEvents[EventName.BASIC_FOUR_PRODUCTION] = {};

      expect(player.getPointsFromVisitors(gameState)).to.be(0);
      player.claimedEvents[EventName.BASIC_THREE_DESTINATION] = {};

      expect(player.getPointsFromVisitors(gameState)).to.be(8);
    });
  });
  describe(VisitorName.TRISS_PESKE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.TRISS_PESKE);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 6; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.WIFE);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(6);
    });
  });
  describe(VisitorName.VARA_AND_BRUN_MAYBERRY, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.VARA_AND_BRUN_MAYBERRY);

      const cardsToAdd = [
        CardName.RANGER,
        CardName.DUNGEON,
        CardName.QUEEN,
        CardName.KING,
        CardName.PALACE,
        CardName.CASTLE,
        CardName.EVERTREE,
      ];

      cardsToAdd.forEach((cardName) => {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, cardName);
      });

      expect(player.getPointsFromVisitors(gameState)).to.be(7);
    });
  });
  describe(VisitorName.WILDELL_FAMILY, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.WILDELL_FAMILY);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 9; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.FARM);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(7);
    });
  });
  describe(VisitorName.WILLOW_GREENGRIN, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.WILLOW_GREENGRIN);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      for (let x = 0; x < 7; x++) {
        expect(player.getPointsFromVisitors(gameState)).to.be(0);
        player.addToCity(gameState, CardName.WANDERER);
      }

      expect(player.getPointsFromVisitors(gameState)).to.be(7);
    });
  });
  describe(VisitorName.WIMBLE_WUFFLE, () => {
    it("gives correct number of points when claimed", () => {
      player = gameState.getActivePlayer();
      player.claimedVisitors?.push(VisitorName.WIMBLE_WUFFLE);

      expect(player.getPointsFromVisitors(gameState)).to.be(0);

      player.gainResources(gameState, { [ResourceType.BERRY]: 3 });

      expect(player.getPointsFromVisitors(gameState)).to.be(6);
    });
  });
});
