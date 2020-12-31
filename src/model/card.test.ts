import expect from "expect.js";
import { Card } from "./card";
import { GameState } from "./gameState";
import merge from "lodash/merge";
import { testInitialGameState, multiStepGameInputTest } from "./testHelpers";
import {
  CardType,
  ResourceType,
  GameInputType,
  GameInputPlayCard,
  CardName,
} from "./types";

const playCardInput = (
  card: CardName,
  overrides: any = {}
): GameInputPlayCard => {
  return merge(
    {
      inputType: GameInputType.PLAY_CARD,
      card,
      fromMeadow: false,
      paymentOptions: {
        resources: Card.fromName(card).baseCost,
      },
    },
    overrides
  );
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
      expect(card.cardType).to.be(CardType.DESTINATION);

      const isOpenDestination = card.isOpenDestination;
      expect(isOpenDestination).to.be(true);
    });

    it("Queen should be marked as a destination, but not open", () => {
      const card = Card.fromName(CardName.QUEEN);
      expect(card.cardType).to.be(CardType.DESTINATION);

      const isOpenDestination = card.isOpenDestination;
      expect(isOpenDestination).to.be(false);
    });

    it("Storehouse is not a destination card, but can have a worker placed on it", () => {
      let card = Card.fromName(CardName.STOREHOUSE);
      expect(card.cardType).to.be(CardType.PRODUCTION);
      expect(card.canTakeWorker()).to.be(true);

      card = Card.fromName(CardName.POST_OFFICE);
      expect(card.cardType).to.be(CardType.DESTINATION);
      expect(card.canTakeWorker()).to.be(true);
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

      it("should spend resources after playing it", () => {
        const card = Card.fromName(CardName.FARM);
        const gameInput = playCardInput(card.name);
        let player = gameState.getActivePlayer();

        expect(player.getNumResource(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResource(ResourceType.RESIN)).to.be(0);
        player.gainResources(card.baseCost);
        expect(player.getNumResource(ResourceType.TWIG)).to.be(2);
        expect(player.getNumResource(ResourceType.RESIN)).to.be(1);

        player.cardsInHand = [card.name];
        expect(card.canPlay(gameState, gameInput)).to.be(true);

        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);

        expect(player.cardsInHand).to.eql([]);
        expect(player.hasPlayedCard(CardName.FARM)).to.be(true);
        expect(player.getNumResource(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResource(ResourceType.RESIN)).to.be(0);
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

    describe(CardName.WANDERER, () => {
      it("should gain 3 cards when played", () => {
        const card = Card.fromName(CardName.WANDERER);
        const gameInput = playCardInput(card.name);
        let player = gameState.getActivePlayer();

        gameState.deck.addToStack(CardName.FARM);
        gameState.deck.addToStack(CardName.FARM);
        gameState.deck.addToStack(CardName.FARM);

        player.cardsInHand.push(card.name);
        player.gainResources(card.baseCost);
        expect(player.cardsInHand).to.eql([card.name]);

        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);
        expect(player.getNumResource(ResourceType.BERRY)).to.be(0);
        expect(player.cardsInHand).to.eql([
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
        ]);
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
        const gameInput = playCardInput(card.name);
        let player = gameState.getActivePlayer();

        player.cardsInHand = [CardName.BARD, CardName.FARM, CardName.RUINS];

        player.gainResources(card.baseCost);
        expect(player.getNumResource(ResourceType.VP)).to.be(0);

        const gameState2 = gameState.next(gameInput);
        player = gameState2.getPlayer(player.playerId);
        expect(player.playerId).to.be(gameState2.getActivePlayer().playerId);
        expect(gameState2.pendingGameInputs).to.eql([
          {
            inputType: GameInputType.DISCARD_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.BARD,
            minCards: 0,
            maxCards: 5,
            clientOptions: {
              cardsToDiscard: [],
            },
          },
        ]);

        const gameState3 = gameState2.next({
          inputType: GameInputType.DISCARD_CARDS,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.BARD,
          minCards: 0,
          maxCards: 5,
          clientOptions: {
            cardsToDiscard: [CardName.FARM, CardName.RUINS],
          },
        });
        player = gameState3.getPlayer(player.playerId);
        expect(player.playerId).to.not.be(
          gameState3.getActivePlayer().playerId
        );
        expect(player.getNumResource(ResourceType.VP)).to.be(2);
        expect(player.cardsInHand).to.eql([]);
      });

      it("should not allow more than 5 discarded cards", () => {
        const card = Card.fromName(CardName.BARD);
        const gameInput = playCardInput(card.name);

        let player = gameState.getActivePlayer();
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

        const gameState2 = gameState.next(gameInput);
        player = gameState2.getPlayer(player.playerId);
        expect(player.playerId).to.be(gameState2.getActivePlayer().playerId);
        expect(gameState2.pendingGameInputs).to.eql([
          {
            inputType: GameInputType.DISCARD_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.BARD,
            minCards: 0,
            maxCards: 5,
            clientOptions: {
              cardsToDiscard: [],
            },
          },
        ]);

        expect(() => {
          gameState2.next({
            inputType: GameInputType.DISCARD_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.BARD,
            minCards: 0,
            maxCards: 5,
            clientOptions: {
              cardsToDiscard: [
                CardName.BARD,
                CardName.FARM,
                CardName.RUINS,
                CardName.FARM,
                CardName.RUINS,
                CardName.FARM,
              ],
            },
          });
        }).to.throwException(/too many cards/);

        expect(() => {
          gameState2.next({
            inputType: GameInputType.DISCARD_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.BARD,
            minCards: 0,
            maxCards: 5,
            clientOptions: {
              // Player doesn't have queen
              cardsToDiscard: [CardName.QUEEN],
            },
          });
        }).to.throwException(/unable to discard/i);
        expect(player.getNumResource(ResourceType.VP)).to.be(0);
      });
    });

    describe(CardName.HUSBAND, () => {
      it("should do nothing if there's no available wife", () => {
        const card = Card.fromName(CardName.HUSBAND);
        const player = gameState.getActivePlayer();
        // Add husband & wife to city
        player.addToCity(CardName.WIFE);
        player.addToCity(CardName.HUSBAND);

        player.cardsInHand = [CardName.HUSBAND];
        player.gainResources(card.baseCost);
        multiStepGameInputTest(gameState, [playCardInput(card.name)]);
      });

      it("should gain a wild resource if there's a available wife", () => {
        const card = Card.fromName(CardName.HUSBAND);
        let player = gameState.getActivePlayer();

        player.cardsInHand = [CardName.HUSBAND];
        player.addToCity(CardName.WIFE);
        player.gainResources(card.baseCost);

        const gameState2 = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_RESOURCES,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.HUSBAND,
            numResources: 1,
            clientOptions: {
              resources: {
                [ResourceType.BERRY]: 1,
              },
            },
          },
        ]);
        player = gameState2.getPlayer(player.playerId);
        expect(player.getNumResource(ResourceType.BERRY)).to.be(1);
      });
    });

    describe(CardName.POSTAL_PIGEON, () => {
      it("should allow the player to select a card to play", () => {
        const card = Card.fromName(CardName.POSTAL_PIGEON);
        let player = gameState.getActivePlayer();
        player.gainResources(card.baseCost);
        player.cardsInHand.push(card.name);

        gameState.deck.addToStack(CardName.FARM);
        gameState.deck.addToStack(CardName.MINE);

        expect(gameState.discardPile.length).to.eql(0);
        expect(gameState.pendingGameInputs).to.eql([]);
        expect(player.hasPlayedCard(card.name)).to.be(false);
        expect(player.hasPlayedCard(CardName.MINE)).to.be(false);

        const gameState3 = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_CARD,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POSTAL_PIGEON,
            mustSelectOne: false,
            cardOptions: [CardName.MINE, CardName.FARM],
            cardOptionsUnfiltered: [CardName.MINE, CardName.FARM],
            clientOptions: {
              selectedCard: CardName.MINE,
            },
          },
        ]);

        player = gameState3.getPlayer(player.playerId);
        expect(player.hasPlayedCard(card.name)).to.be(true);
        expect(player.hasPlayedCard(CardName.MINE)).to.be(true);
        expect(gameState3.discardPile.length).to.eql(1);
        expect(gameState3.pendingGameInputs).to.eql([]);
      });

      it("should only allow the player to select eligible cards", () => {
        const card = Card.fromName(CardName.POSTAL_PIGEON);
        let player = gameState.getActivePlayer();
        player.gainResources(card.baseCost);
        player.cardsInHand.push(card.name);

        // Add cards that have too high vp
        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.QUEEN);

        expect(gameState.discardPile.length).to.eql(0);
        expect(gameState.pendingGameInputs).to.eql([]);
        expect(player.hasPlayedCard(card.name)).to.be(false);
        expect(player.hasPlayedCard(CardName.MINE)).to.be(false);

        const gameState3 = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_CARD,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POSTAL_PIGEON,
            mustSelectOne: false,
            cardOptions: [],
            cardOptionsUnfiltered: [CardName.QUEEN, CardName.KING],
            clientOptions: {
              selectedCard: null,
            },
          },
        ]);

        player = gameState3.getPlayer(player.playerId);
        expect(player.hasPlayedCard(card.name)).to.be(true);
        expect(gameState3.discardPile.length).to.eql(2);
      });
    });

    describe(CardName.CHIP_SWEEP, () => {
      it("should allow the player to select a card to play", () => {
        const card = Card.fromName(CardName.CHIP_SWEEP);

        let player = gameState.getActivePlayer();

        player.addToCity(CardName.MINE);
        player.addToCity(CardName.FARM);

        // Make sure we can play this card
        player.gainResources(card.baseCost);
        player.cardsInHand.push(card.name);

        expect(player.hasPlayedCard(card.name)).to.be(false);
        expect(player.getNumResource(ResourceType.PEBBLE)).to.be(0);

        const gameState3 = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_CARD,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.CHIP_SWEEP,
            mustSelectOne: true,
            cardOptions: [CardName.MINE, CardName.FARM],
            cardOptionsUnfiltered: [CardName.MINE, CardName.FARM],
            clientOptions: {
              selectedCard: CardName.MINE,
            },
          },
        ]);

        player = gameState3.getPlayer(player.playerId);
        expect(player.getNumResource(ResourceType.PEBBLE)).to.be(1);
      });
    });

    describe(CardName.FOOL, () => {
      it("should allow the player to select player to target", () => {
        let player = gameState.getActivePlayer();
        const targetPlayerId = gameState.players[1].playerId;
        const card = Card.fromName(CardName.FOOL);

        // Make sure we can play this card
        player.gainResources(card.baseCost);
        player.cardsInHand.push(card.name);

        const gameState3 = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.FOOL,
            mustSelectOne: true,
            playerOptions: [targetPlayerId],
            clientOptions: {
              selectedPlayer: targetPlayerId,
            },
          },
        ]);

        player = gameState3.getPlayer(player.playerId);
        expect(player.hasPlayedCard(card.name)).to.be(false);
        expect(
          gameState3.getPlayer(targetPlayerId).hasPlayedCard(card.name)
        ).to.be(true);
      });
    });
  });
});
