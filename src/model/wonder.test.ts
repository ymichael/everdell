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
      expect(player.getPoints(gameState)).to.be(20);
      expect(player.cardsInHand.length).to.be(0);
    });

    it("can't claim if you don't have enough resources", () => {
      const wonder = Wonder.fromName(WonderName.SUNBLAZE_BRIDGE);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 1,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/afford this wonder/i);
    });

    it("can't claim if you don't have enough cards", () => {
      const wonder = Wonder.fromName(WonderName.SUNBLAZE_BRIDGE);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.WIFE);

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/need to discard/i);
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

      let player2 = gameState.players[1];
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
      expect(player.getPoints(gameState)).to.be(20);
    });
  });

  describe(WonderName.STARFALLS_FLAME, () => {
    it("can play STARFALLS_FLAME wonder", () => {
      const wonder = Wonder.fromName(WonderName.STARFALLS_FLAME);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 3,
        [ResourceType.PEBBLE]: 3,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.POSTAL_PIGEON);

      expect(wonder.canPlay(gameState, gameInput)).to.be(true);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_WONDER,
          wonderContext: WonderName.STARFALLS_FLAME,
          cardOptions: [
            CardName.FARM,
            CardName.INN,
            CardName.WIFE,
            CardName.POSTAL_PIGEON,
          ],
          maxToSelect: 3,
          minToSelect: 3,
          clientOptions: {
            selectedCards: [CardName.FARM, CardName.INN, CardName.WIFE],
          },
        },
      ]);

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(player.getPoints(gameState)).to.be(25);
      expect(player.cardsInHand.length).to.be(1);
      expect(player.cardsInHand).to.eql([CardName.POSTAL_PIGEON]);
    });

    it("can't claim if you don't have enough resources", () => {
      const wonder = Wonder.fromName(WonderName.STARFALLS_FLAME);
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

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/afford this wonder/i);
    });

    it("can't claim if you don't have enough cards", () => {
      const wonder = Wonder.fromName(WonderName.STARFALLS_FLAME);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 3,
        [ResourceType.PEBBLE]: 3,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.WIFE);

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/need to discard/i);
    });
  });

  describe(WonderName.HOPEWATCH_GATE, () => {
    it("can play HOPEWATCH_GATE wonder", () => {
      const wonder = Wonder.fromName(WonderName.HOPEWATCH_GATE);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 1,
        [ResourceType.PEARL]: 2,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.POSTAL_PIGEON);

      expect(wonder.canPlay(gameState, gameInput)).to.be(true);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_WONDER,
          wonderContext: WonderName.HOPEWATCH_GATE,
          cardOptions: [
            CardName.FARM,
            CardName.INN,
            CardName.WIFE,
            CardName.POSTAL_PIGEON,
          ],
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            selectedCards: [CardName.FARM, CardName.INN],
          },
        },
      ]);

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(player.getPoints(gameState)).to.be(10);
      expect(player.cardsInHand.length).to.be(2);
      expect(player.cardsInHand).to.eql([
        CardName.WIFE,
        CardName.POSTAL_PIGEON,
      ]);
    });

    it("can't claim if you don't have enough resources", () => {
      const wonder = Wonder.fromName(WonderName.HOPEWATCH_GATE);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 1,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/afford this wonder/i);
    });

    it("can't claim if you don't have enough cards", () => {
      const wonder = Wonder.fromName(WonderName.HOPEWATCH_GATE);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 3,
        [ResourceType.PEBBLE]: 3,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/need to discard/i);
    });
  });

  describe(WonderName.MISTRISE_FOUNTAIN, () => {
    it("can play MISTRISE_FOUNTAIN wonder", () => {
      const wonder = Wonder.fromName(WonderName.MISTRISE_FOUNTAIN);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 3,
        [ResourceType.PEARL]: 2,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.POSTAL_PIGEON);

      expect(wonder.canPlay(gameState, gameInput)).to.be(true);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_WONDER,
          wonderContext: WonderName.MISTRISE_FOUNTAIN,
          cardOptions: [CardName.FARM, CardName.INN, CardName.POSTAL_PIGEON],
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            selectedCards: [CardName.FARM, CardName.INN],
          },
        },
      ]);

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(player.getPoints(gameState)).to.be(15);
      expect(player.cardsInHand.length).to.be(1);
      expect(player.cardsInHand).to.eql([CardName.POSTAL_PIGEON]);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
    });

    it("can't claim if you don't have enough resources", () => {
      const wonder = Wonder.fromName(WonderName.MISTRISE_FOUNTAIN);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 1,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/afford this wonder/i);
    });

    it("can't claim if you don't have enough cards", () => {
      const wonder = Wonder.fromName(WonderName.MISTRISE_FOUNTAIN);
      const gameInput = claimWonderInput(wonder.name);

      player.gainResources({
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 3,
        [ResourceType.PEBBLE]: 3,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);

      expect(wonder.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/need to discard/i);
    });
  });
});
