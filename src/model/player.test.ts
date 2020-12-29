import expect from "expect.js";
import { Player } from "./player";
import { Card } from "./card";
import { GameState } from "./gameState";
import { testInitialGameState } from "./testHelpers";
import { sumResources } from "./gameStatePlayHelpers";
import { ResourceType, CardName } from "./types";

describe("Player", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = testInitialGameState();
  });

  describe("canAffordCard", () => {
    it("have the right resources", () => {
      const player = gameState.getActivePlayer();
      expect(sumResources(player.resources)).to.be(0);
      expect(player.canAffordCard(CardName.FARM, false /* isMeadow */)).to.be(
        false
      );
      player.gainResources(Card.fromName(CardName.FARM).baseCost);
      expect(player.canAffordCard(CardName.FARM, false /* isMeadow */)).to.be(
        true
      );
    });

    it("unoccupied associated construction", () => {
      const player = gameState.getActivePlayer();
      expect(sumResources(player.resources)).to.be(0);
      expect(
        player.canAffordCard(CardName.HUSBAND, false /* isMeadow */)
      ).to.be(false);
      player.addToCity(CardName.FARM);
      expect(
        player.canAffordCard(CardName.HUSBAND, false /* isMeadow */)
      ).to.be(true);
      // Occupy the farm
      player.occupyConstruction(CardName.FARM);
      expect(
        player.canAffordCard(CardName.HUSBAND, false /* isMeadow */)
      ).to.be(false);
    });

    it("CRANE discount for constructions", () => {
      const player = gameState.getActivePlayer();
      expect(sumResources(player.resources)).to.be(0);
      expect(player.canAffordCard(CardName.FARM, false /* isMeadow */)).to.be(
        false
      );
      player.addToCity(CardName.CRANE);
      expect(player.canAffordCard(CardName.FARM, false /* isMeadow */)).to.be(
        true
      );
      // Doesn't work for critters
      expect(player.canAffordCard(CardName.WIFE, false /* isMeadow */)).to.be(
        false
      );
    });

    it("INNKEEPER discount for critters", () => {
      const player = gameState.getActivePlayer();
      expect(sumResources(player.resources)).to.be(0);
      expect(player.canAffordCard(CardName.WIFE, false /* isMeadow */)).to.be(
        false
      );
      player.addToCity(CardName.INNKEEPER);
      expect(player.canAffordCard(CardName.WIFE, false /* isMeadow */)).to.be(
        true
      );
      // Doesn't work for constructions
      expect(player.canAffordCard(CardName.FARM, false /* isMeadow */)).to.be(
        false
      );
    });

    it("QUEEN discount", () => {
      const player = gameState.getActivePlayer();
      expect(sumResources(player.resources)).to.be(0);
      expect(player.canAffordCard(CardName.WIFE, false /* isMeadow */)).to.be(
        false
      );
      player.addToCity(CardName.QUEEN);
      expect(player.canAffordCard(CardName.WIFE, false /* isMeadow */)).to.be(
        true
      );
      // Doesn't work if VP is greater than 3
      expect(player.canAffordCard(CardName.KING, false /* isMeadow */)).to.be(
        false
      );
    });

    it("JUDGE discount", () => {
      const player = gameState.getActivePlayer();
      expect(sumResources(player.resources)).to.be(0);
      expect(player.canAffordCard(CardName.CRANE, false /* isMeadow */)).to.be(
        false
      );
      player.addToCity(CardName.JUDGE);
      expect(player.canAffordCard(CardName.CRANE, false /* isMeadow */)).to.be(
        false
      );
      player.gainResources({
        [ResourceType.BERRY]: 1,
      });
      expect(player.canAffordCard(CardName.CRANE, false /* isMeadow */)).to.be(
        true
      );

      // need resin & pebble
      expect(
        player.canAffordCard(CardName.RESIN_REFINERY, false /* isMeadow */)
      ).to.be(false);
      player.gainResources({
        [ResourceType.BERRY]: 1,
      });
      expect(
        player.canAffordCard(CardName.RESIN_REFINERY, false /* isMeadow */)
      ).to.be(false);
      player.gainResources({
        [ResourceType.PEBBLE]: 1,
      });
      expect(
        player.canAffordCard(CardName.RESIN_REFINERY, false /* isMeadow */)
      ).to.be(true);
    });
  });

  describe("isPaidResourcesValid", () => {
    it("invalid resources", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid({}, { [ResourceType.BERRY]: 1 })
      ).to.be(false);
      expect(player.isPaidResourcesValid({}, { [ResourceType.TWIG]: 1 })).to.be(
        false
      );
      expect(
        player.isPaidResourcesValid({}, { [ResourceType.PEBBLE]: 1 })
      ).to.be(false);
      expect(
        player.isPaidResourcesValid({}, { [ResourceType.RESIN]: 1 })
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 2 }
        )
      ).to.be(false);
    });

    it("wrong resources", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 2, [ResourceType.TWIG]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.RESIN]: 2, [ResourceType.TWIG]: 1 },
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.PEBBLE]: 2, [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 2, [ResourceType.PEBBLE]: 1 },
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
    });

    it("overpay resources", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 3, [ResourceType.RESIN]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 },
          null,
          false /* errorIfOverpay */
        )
      ).to.be(true);
      expect(() => {
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 3, [ResourceType.RESIN]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 },
          null
        );
      }).to.throwException(/overpay/);
    });

    it("BERRY discount", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 0 },
          { [ResourceType.BERRY]: 2 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 0 },
          { [ResourceType.BERRY]: 2 },
          ResourceType.BERRY
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 4 },
          ResourceType.BERRY
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 0 },
          { [ResourceType.BERRY]: 4 },
          ResourceType.BERRY
        )
      ).to.be(false);
      expect(() => {
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 2 },
          ResourceType.BERRY
        );
      }).to.throwException(/overpay/);
    });

    it("ANY discount", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          {},
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          {},
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 },
          "ANY"
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 1 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY"
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 0 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY"
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.PEBBLE]: 5 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY"
        )
      ).to.be(false);
      expect(() => {
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 2 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY"
        );
      }).to.throwException(/overpay/);
    });
  });
});
