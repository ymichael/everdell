import expect from "expect.js";
import { Card } from "./card";
import { GameState } from "./gameState";
import { testInitialGameState } from "./testHelpers";
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
    gameState = testInitialGameState();
  });

  describe("fromName", () => {
    it("should return the expect Card instances", () => {
      for (const card in CardName) {
        expect(Card.fromName(card as CardName).name).to.be(card);
      }
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

  describe("Card Specific", () => {
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
          nextGameState
            .getPlayer(player.playerId)
            .getNumResource(ResourceType.VP)
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

    describe(CardName.POSTAL_PIGEON, () => {
      it("should allow the player to select a card to play", () => {
        const card = Card.fromName(CardName.POSTAL_PIGEON);
        const gameInput = playCardInput(card.name);
        let player = gameState.getActivePlayer();
        player.gainResources(card.baseCost);
        player.cardsInHand.push(card.name);

        gameState.deck.addToStack(CardName.FARM);
        gameState.deck.addToStack(CardName.MINE);

        expect(gameState.discardPile.length).to.eql(0);
        expect(gameState.pendingGameInputs).to.eql([]);
        expect(player.hasPlayedCard(card.name)).to.be(false);
        expect(player.hasPlayedCard(CardName.MINE)).to.be(false);

        const gameState2 = gameState.next(gameInput);
        // Active player remains the same
        expect(player.playerId).to.be(gameState2.getActivePlayer().playerId);
        expect(gameState2.pendingGameInputs).to.eql([
          {
            card: "POSTAL_PIGEON",
            inputType: "MULTI_STEP",
            pickedCard: "MINE",
            prevInputType: "PLAY_CARD",
            revealedCards: ["MINE", "FARM"],
          },
          {
            card: "POSTAL_PIGEON",
            inputType: "MULTI_STEP",
            pickedCard: "FARM",
            prevInputType: "PLAY_CARD",
            revealedCards: ["MINE", "FARM"],
          },
          {
            card: "POSTAL_PIGEON",
            inputType: "MULTI_STEP",
            pickedCard: null,
            prevInputType: "PLAY_CARD",
            revealedCards: ["MINE", "FARM"],
          },
        ]);

        player = gameState2.getActivePlayer();
        expect(player.hasPlayedCard(card.name)).to.be(true);

        const gameState3 = gameState2.next(gameState2.pendingGameInputs[0]);

        // Active player changes
        expect(player.playerId).to.not.be(
          gameState3.getActivePlayer().playerId
        );

        player = gameState3.getPlayer(player.playerId);
        expect(player.hasPlayedCard(card.name)).to.be(true);
        expect(player.hasPlayedCard(CardName.MINE)).to.be(true);
        expect(gameState3.discardPile.length).to.eql(1);
        expect(gameState3.pendingGameInputs).to.eql([]);
      });

      it("should only allow the player to select eligible cards", () => {
        const card = Card.fromName(CardName.POSTAL_PIGEON);
        const gameInput = playCardInput(card.name);
        let player = gameState.getActivePlayer();
        player.gainResources(card.baseCost);
        player.cardsInHand.push(card.name);

        // Add cards that have too high vp
        gameState.deck.addToStack(CardName.QUEEN);
        gameState.deck.addToStack(CardName.KING);

        expect(gameState.discardPile.length).to.eql(0);
        expect(gameState.pendingGameInputs).to.eql([]);
        expect(player.hasPlayedCard(card.name)).to.be(false);

        const gameState2 = gameState.next(gameInput);
        // Active player remains the same
        expect(player.playerId).to.be(gameState2.getActivePlayer().playerId);
        expect(gameState2.pendingGameInputs).to.eql([
          {
            card: "POSTAL_PIGEON",
            inputType: "MULTI_STEP",
            pickedCard: null,
            prevInputType: "PLAY_CARD",
            revealedCards: ["KING", "QUEEN"],
          },
        ]);
      });
    });
  });
});
