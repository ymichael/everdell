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
});
