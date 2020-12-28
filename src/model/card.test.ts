import expect from "expect.js";
import { Card } from "./card";
import { GameState } from "./gameState";
import { createPlayer } from "./player";
import {
  CardType,
  ResourceType,
  GameInputType,
  GameInput,
  CardName,
} from "./types";

const playCardInput = (card: CardName, overrides: any = {}): GameInput => {
  return {
    inputType: GameInputType.PLAY_CARD,
    card,
    fromMeadow: false,
    ...overrides,
  };
};

describe("Card", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = GameState.initialGameState({
      players: [createPlayer("One"), createPlayer("Two")],
    });
  });

  describe("fromName", () => {
    it("should return the expect Card instances", () => {
      for (const card in CardName) {
        expect(Card.fromName(card as CardName).name).to.be(card);
      }
    });
  });

  describe(CardName.FARM, () => {
    it("should have card to play it", () => {
      const card = Card.fromName(CardName.FARM);
      const gameInput = playCardInput(card.name);
      const player = gameState.getActivePlayer();
      player.gainResources(card.baseCost);

      player.cardsInHand = [];
      expect(card.canPlay(gameState, gameInput)).to.be(false);
      player.cardsInHand = [card.name];
      expect(card.canPlay(gameState, gameInput)).to.be(true);
    });

    it("should remove card from hand after playing it", () => {
      const card = Card.fromName(CardName.FARM);
      const gameInput = playCardInput(card.name);
      const player = gameState.getActivePlayer();
      player.gainResources(card.baseCost);

      player.cardsInHand = [];
      expect(card.canPlay(gameState, gameInput)).to.be(false);
      player.cardsInHand = [card.name];
      expect(card.canPlay(gameState, gameInput)).to.be(true);

      expect(player.cardsInHand).to.not.eql([]);
      const nextGameState = gameState.next(gameInput);
      expect(nextGameState.getPlayer(player.playerId).cardsInHand).to.eql([]);
    });

    it("should be able to pay for the card to play it", () => {
      const card = Card.fromName(CardName.FARM);
      const gameInput = playCardInput(card.name);
      const player = gameState.getActivePlayer();

      player.cardsInHand.push(card.name);

      expect(player.getNumResource(ResourceType.TWIG)).to.be(0);
      expect(player.getNumResource(ResourceType.RESIN)).to.be(0);
      expect(card.canPlay(gameState, gameInput)).to.be(false);

      player.gainResources(card.baseCost);
      expect(card.canPlay(gameState, gameInput)).to.be(true);
    });

    it("should gain 1 berry when played", () => {
      const card = Card.fromName(CardName.FARM);
      const gameInput = playCardInput(card.name);
      const player = gameState.getActivePlayer();

      player.cardsInHand.push(card.name);
      player.gainResources(card.baseCost);
      expect(player.getNumResource(ResourceType.BERRY)).to.be(0);
      const nextGameState = gameState.next(gameInput);
      expect(
        nextGameState
          .getPlayer(player.playerId)
          .getNumResource(ResourceType.BERRY)
      ).to.be(1);
    });
  });

  describe(CardName.GENERAL_STORE, () => {
    it("should gain 1 berry when played (w/o farm)", () => {
      const card = Card.fromName(CardName.GENERAL_STORE);
      const gameInput = playCardInput(card.name);
      const player = gameState.getActivePlayer();

      player.playedCards = {};
      player.cardsInHand.push(card.name);
      player.gainResources(card.baseCost);
      expect(player.getNumResource(ResourceType.BERRY)).to.be(0);
      const nextGameState = gameState.next(gameInput);
      expect(
        nextGameState
          .getPlayer(player.playerId)
          .getNumResource(ResourceType.BERRY)
      ).to.be(1);
    });

    it("should gain 2 berries when played (w farm)", () => {
      const card = Card.fromName(CardName.GENERAL_STORE);
      const gameInput = playCardInput(card.name);
      const player = gameState.getActivePlayer();

      player.playedCards[CardName.FARM] = [{}];
      player.cardsInHand.push(card.name);
      player.gainResources(card.baseCost);
      expect(player.getNumResource(ResourceType.BERRY)).to.be(0);
      const nextGameState = gameState.next(gameInput);
      expect(
        nextGameState
          .getPlayer(player.playerId)
          .getNumResource(ResourceType.BERRY)
      ).to.be(2);
    });
  });

  describe(CardName.BARD, () => {
    it("should gain vp corresponding to no. of discarded cards", () => {
      const card = Card.fromName(CardName.BARD);
      const gameInput = playCardInput(card.name, {
        clientOptions: {
          cardsToDiscard: [CardName.FARM, CardName.RUINS],
        },
      });
      const player = gameState.getActivePlayer();
      player.cardsInHand = [CardName.BARD, CardName.FARM, CardName.RUINS];
      player.gainResources(card.baseCost);
      expect(player.getNumResource(ResourceType.VP)).to.be(0);

      const nextGameState = gameState.next(gameInput);
      expect(
        nextGameState.getPlayer(player.playerId).getNumResource(ResourceType.VP)
      ).to.be(2);
      expect(nextGameState.getPlayer(player.playerId).cardsInHand).to.eql([]);
    });

    it("should not allow more than 5 discarded cards", () => {
      const card = Card.fromName(CardName.BARD);
      const gameInput = playCardInput(card.name, {
        clientOptions: {
          cardsToDiscard: [
            CardName.FARM,
            CardName.RUINS,
            CardName.FARM,
            CardName.RUINS,
            CardName.FARM,
            CardName.RUINS,
          ],
        },
      });
      const player = gameState.getActivePlayer();
      player.cardsInHand = [
        CardName.BARD,
        CardName.FARM,
        CardName.RUINS,
        CardName.FARM,
        CardName.RUINS,
        CardName.FARM,
        CardName.RUINS,
      ];
      player.gainResources(card.baseCost);
      expect(player.getNumResource(ResourceType.VP)).to.be(0);
      try {
        const nextGameState = gameState.next(gameInput);
        expect("Execption to be raised").to.be(null);
      } catch (e) {
        // ignore
      }
      expect(player.getNumResource(ResourceType.VP)).to.be(0);
    });
  });

  describe("Open / closed destinations", () => {
    it("Inn should be marked as an open destination", () => {
      const card = Card.fromName(CardName.INN);
      const cardInfo = card.getPlayedCardInfo();
      expect(card.cardType == CardType.DESTINATION);
      expect(cardInfo.isOpen);
    });

    it("Queen should be marked as a destination, but not open", () => {
      const card = Card.fromName(CardName.QUEEN);
      const cardInfo = card.getPlayedCardInfo();
      expect(card.cardType == CardType.DESTINATION);
      expect(!cardInfo.isOpen);
    });
  });
});
