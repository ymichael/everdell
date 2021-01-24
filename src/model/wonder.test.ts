import expect from "expect.js";
import { Wonder } from "./wonder";
import { Player } from "./player";
import { GameState } from "./gameState";
import { testInitialGameState, multiStepGameInputTest } from "./testHelpers";
import {
  WonderName,
  ExpansionType,
  GameInputType,
  GameInputClaimWonder,
  CardName,
  ResourceType,
} from "./types";

const claimWonderInput = (wonder: WonderName): GameInputClaimWonder => {
  return {
    inputType: GameInputType.CLAIM_WONDER,
    clientOptions: {
      wonder,
    },
  };
};

describe("Wonder", () => {
  let gameState: GameState;
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState();
    player = gameState.getActivePlayer();
  });

  describe("fromName", () => {
    it("should return the expect Wonder instances", () => {
      Object.values(WonderName).forEach((wdr) => {
        expect(Wonder.fromName(wdr as WonderName).name).to.be(wdr);
      });
    });
  });

  describe(WonderName.SUNBLAZE_BRIDGE, () => {
    it("can play SUNBLAZE_BRIDGE wonder", () => {
      const wonder = Wonder.fromName(WonderName.SUNBLAZE_BRIDGE);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);

      expect(wonder.canPlay(gameState, gameInput)).to.be(true);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_WONDER,
          wonderContext: WonderName.SUNBLAZE_BRIDGE,
          cardOptions: [CardName.FARM, CardName.INN, CardName.WIFE],
          maxToSelect: 3,
          minToSelect: 3,
          clientOptions: {
            selectedCards: [CardName.FARM, CardName.INN, CardName.WIFE],
          },
        },
      ]);

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(player.getPoints(gameState)).to.be(10);
    });
    it("can't be claimed if someone else claimed already", () => {
      const wonder = Wonder.fromName(WonderName.SUNBLAZE_BRIDGE);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);

      const player2 = gameState.players[1];
      player2.gainResources({
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 3,
      });
      player2.addCardToHand(gameState, CardName.FARM);
      player2.addCardToHand(gameState, CardName.INN);
      player2.addCardToHand(gameState, CardName.WIFE);

      expect(wonder.canPlay(gameState, gameInput)).to.be(true);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_WONDER,
          wonderContext: WonderName.SUNBLAZE_BRIDGE,
          cardOptions: [CardName.FARM, CardName.INN, CardName.WIFE],
          maxToSelect: 3,
          minToSelect: 3,
          clientOptions: {
            selectedCards: [CardName.FARM, CardName.INN, CardName.WIFE],
          },
        },
      ]);

      expect(gameState.getActivePlayer()).to.be(
        gameState.getPlayer(player2.playerId)
      );
      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(player.getPoints(gameState)).to.be(10);
    });
  });
});
