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
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
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

        player.addToCity(CardName.FARM);
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
            maxResources: 1,
            minResources: 1,
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

    describe(CardName.POST_OFFICE, () => {
      it("should not be visitable if player has less than 2 cards", () => {
        const card = Card.fromName(CardName.POST_OFFICE);
        const player = gameState.getActivePlayer();

        player.cardsInHand = [];
        player.addToCity(CardName.POST_OFFICE);

        const visitDestinationInput = {
          inputType: GameInputType.VISIT_DESTINATION_CARD as const,
          card: CardName.POST_OFFICE,
          playerId: player.playerId,
        };

        expect(card.canPlay(gameState, visitDestinationInput)).to.be(false);
        player.cardsInHand = [CardName.FARM, CardName.MONK];
        expect(card.canPlay(gameState, visitDestinationInput)).to.be(true);
      });

      it("should give another player 2 cards and draw max cards", () => {
        const card = Card.fromName(CardName.POST_OFFICE);
        let player = gameState.getActivePlayer();
        let targetPlayer = gameState.players[1];

        player.cardsInHand = [
          CardName.FARM,
          CardName.MINE,
          CardName.QUEEN,
          CardName.KING,
        ];
        player.addToCity(CardName.POST_OFFICE);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getPlayedCardInfos(CardName.POST_OFFICE)).to.eql([
          {
            playerId: player.playerId,
            cardName: CardName.POST_OFFICE,
            maxWorkers: 1,
            usedForCritter: false,
            workers: [],
          },
        ]);

        for (let i = 0; i < 8; i++) {
          gameState.deck.addToStack(CardName.MINER_MOLE);
        }

        const visitDestinationInput = {
          inputType: GameInputType.VISIT_DESTINATION_CARD as const,
          card: CardName.POST_OFFICE,
          playerId: player.playerId,
        };

        const selectPlayer = {
          inputType: GameInputType.SELECT_PLAYER as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD as const,
          cardContext: CardName.POST_OFFICE,
          playerOptions: [targetPlayer.playerId],
          mustSelectOne: true,
          clientOptions: {
            selectedPlayer: targetPlayer.playerId,
          },
        };

        const selectCardsToGiveAway = {
          inputType: GameInputType.SELECT_MULTIPLE_CARDS as const,
          prevInputType: GameInputType.SELECT_PLAYER as const,
          prevInput: selectPlayer,
          cardContext: CardName.POST_OFFICE,
          cardOptions: player.cardsInHand,
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            selectedCards: [CardName.MINE, CardName.QUEEN],
          },
        };

        const selectCardsToDiscard = {
          inputType: GameInputType.SELECT_MULTIPLE_CARDS as const,
          prevInputType: GameInputType.SELECT_MULTIPLE_CARDS as const,
          cardContext: CardName.POST_OFFICE,
          cardOptions: [CardName.FARM, CardName.KING],
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [CardName.FARM, CardName.KING],
          },
        };

        const gameState2 = multiStepGameInputTest(gameState, [
          visitDestinationInput,
          selectPlayer,
          selectCardsToGiveAway,
          selectCardsToDiscard,
        ]);

        player = gameState2.getPlayer(player.playerId);
        targetPlayer = gameState2.getPlayer(targetPlayer.playerId);
        expect(player.numAvailableWorkers).to.be(1);
        expect(player.getPlayedCardInfos(CardName.POST_OFFICE)).to.eql([
          {
            playerId: player.playerId,
            cardName: CardName.POST_OFFICE,
            maxWorkers: 1,
            usedForCritter: false,
            workers: [player.playerId],
          },
        ]);
        expect(targetPlayer.cardsInHand).to.eql([
          CardName.MINE,
          CardName.QUEEN,
        ]);
        expect(player.cardsInHand).to.eql([
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
        ]);
      });
    });

    describe(CardName.PEDDLER, () => {
      it("should do nothing if no resources", () => {
        const card = Card.fromName(CardName.PEDDLER);
        const player = gameState.getActivePlayer();

        player.cardsInHand = [CardName.PEDDLER];
        player.gainResources(card.baseCost);
        multiStepGameInputTest(gameState, [playCardInput(card.name)]);
      });

      it("should allow player to swap 2 resources", () => {
        const card = Card.fromName(CardName.PEDDLER);
        let player = gameState.getActivePlayer();

        player.cardsInHand = [CardName.PEDDLER];
        player.gainResources(card.baseCost);
        player.gainResources({
          [ResourceType.PEBBLE]: 1,
          [ResourceType.RESIN]: 1,
        });

        const gameState2 = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_RESOURCES,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.PEDDLER,
            maxResources: 2,
            minResources: 0,
            clientOptions: {
              resources: {
                [ResourceType.PEBBLE]: 1,
                [ResourceType.RESIN]: 1,
              },
            },
          },
          {
            inputType: GameInputType.SELECT_RESOURCES,
            prevInputType: GameInputType.SELECT_RESOURCES,
            cardContext: CardName.PEDDLER,
            maxResources: 2,
            minResources: 2,
            clientOptions: {
              resources: {
                [ResourceType.BERRY]: 2,
              },
            },
          },
        ]);
        player = gameState2.getPlayer(player.playerId);
        expect(player.getNumResource(ResourceType.BERRY)).to.be(2);
        expect(player.getNumResource(ResourceType.PEBBLE)).to.be(0);
        expect(player.getNumResource(ResourceType.RESIN)).to.be(0);
      });

      it("should not allow player to swap 2 non-existent resources", () => {
        const card = Card.fromName(CardName.PEDDLER);
        let player = gameState.getActivePlayer();

        player.cardsInHand = [CardName.PEDDLER];
        player.gainResources(card.baseCost);
        player.gainResources({
          [ResourceType.PEBBLE]: 1,
          [ResourceType.RESIN]: 1,
        });

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            {
              inputType: GameInputType.SELECT_RESOURCES,
              prevInputType: GameInputType.PLAY_CARD,
              cardContext: CardName.PEDDLER,
              maxResources: 2,
              minResources: 0,
              clientOptions: {
                resources: {
                  [ResourceType.PEBBLE]: 2,
                },
              },
            },
          ]);
        }).to.throwException(/insufficient/i);
      });

      it("should not allow player to swap more than 2 resources", () => {
        const card = Card.fromName(CardName.PEDDLER);
        let player = gameState.getActivePlayer();

        player.cardsInHand = [CardName.PEDDLER];
        player.gainResources(card.baseCost);
        player.gainResources({
          [ResourceType.PEBBLE]: 2,
          [ResourceType.RESIN]: 2,
        });

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            {
              inputType: GameInputType.SELECT_RESOURCES,
              prevInputType: GameInputType.PLAY_CARD,
              cardContext: CardName.PEDDLER,
              maxResources: 2,
              minResources: 0,
              clientOptions: {
                resources: {
                  [ResourceType.PEBBLE]: 2,
                  [ResourceType.RESIN]: 2,
                },
              },
            },
          ]);
        }).to.throwException(/too many/i);
      });
    });

    describe(CardName.MONK, () => {
      it("should do nothing if no resources", () => {
        const card = Card.fromName(CardName.MONK);
        const player = gameState.getActivePlayer();

        player.cardsInHand = [CardName.MONK];
        player.gainResources(card.baseCost);
        multiStepGameInputTest(gameState, [playCardInput(card.name)]);
      });

      it("should allow player to give up 2 berries for vp", () => {
        const card = Card.fromName(CardName.MONK);
        let player = gameState.getActivePlayer();
        expect(player.getNumResource(ResourceType.VP)).to.be(0);

        player.cardsInHand = [CardName.MONK];
        player.gainResources(card.baseCost);
        player.gainResources({
          [ResourceType.BERRY]: 2,
        });

        const selectResourceGameInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PLAY_CARD as const,
          cardContext: CardName.MONK,
          maxResources: 2,
          minResources: 0,
          specificResource: ResourceType.BERRY,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 2,
            },
          },
        };

        const targetPlayerId = gameState.players[1].playerId;
        expect(
          gameState.getPlayer(targetPlayerId).getNumResource(ResourceType.BERRY)
        ).to.be(0);
        const gameState2 = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          selectResourceGameInput,
          {
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.SELECT_RESOURCES,
            prevInput: selectResourceGameInput,
            cardContext: CardName.MONK,
            mustSelectOne: true,
            playerOptions: [targetPlayerId],
            clientOptions: {
              selectedPlayer: targetPlayerId,
            },
          },
        ]);
        player = gameState2.getPlayer(player.playerId);
        expect(player.getNumResource(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResource(ResourceType.VP)).to.be(4);
        expect(
          gameState2
            .getPlayer(targetPlayerId)
            .getNumResource(ResourceType.BERRY)
        ).to.be(2);
      });

      it("should not allow player to give up non-existent berries", () => {
        const card = Card.fromName(CardName.MONK);
        let player = gameState.getActivePlayer();
        expect(player.getNumResource(ResourceType.VP)).to.be(0);

        player.cardsInHand = [CardName.MONK];
        player.gainResources(card.baseCost);
        player.gainResources({
          [ResourceType.BERRY]: 1,
        });

        const selectResourceGameInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PLAY_CARD as const,
          cardContext: CardName.MONK,
          maxResources: 2,
          minResources: 0,
          specificResource: ResourceType.BERRY,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 2,
            },
          },
        };

        const targetPlayerId = gameState.players[1].playerId;

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            selectResourceGameInput,
            {
              inputType: GameInputType.SELECT_PLAYER,
              prevInputType: GameInputType.SELECT_RESOURCES,
              prevInput: selectResourceGameInput,
              cardContext: CardName.MONK,
              mustSelectOne: true,
              playerOptions: [targetPlayerId],
              clientOptions: {
                selectedPlayer: targetPlayerId,
              },
            },
          ]);
        }).to.throwException(/insufficient/i);
      });

      it("should not allow player to give more than 2 resources", () => {
        const card = Card.fromName(CardName.MONK);
        let player = gameState.getActivePlayer();
        expect(player.getNumResource(ResourceType.VP)).to.be(0);

        player.cardsInHand = [CardName.MONK];
        player.gainResources(card.baseCost);
        player.gainResources({
          [ResourceType.BERRY]: 4,
        });

        const selectResourceGameInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PLAY_CARD as const,
          cardContext: CardName.MONK,
          maxResources: 2,
          minResources: 0,
          specificResource: ResourceType.BERRY,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 4,
            },
          },
        };

        const targetPlayerId = gameState.players[1].playerId;

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            selectResourceGameInput,
            {
              inputType: GameInputType.SELECT_PLAYER,
              prevInputType: GameInputType.SELECT_RESOURCES,
              prevInput: selectResourceGameInput,
              cardContext: CardName.MONK,
              mustSelectOne: true,
              playerOptions: [targetPlayerId],
              clientOptions: {
                selectedPlayer: targetPlayerId,
              },
            },
          ]);
        }).to.throwException(/too many/i);
      });

      it("should not allow player to give themselves berries", () => {
        const card = Card.fromName(CardName.MONK);
        let player = gameState.getActivePlayer();
        expect(player.getNumResource(ResourceType.VP)).to.be(0);

        player.cardsInHand = [CardName.MONK];
        player.gainResources(card.baseCost);
        player.gainResources({
          [ResourceType.BERRY]: 4,
        });

        const selectResourceGameInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PLAY_CARD as const,
          cardContext: CardName.MONK,
          maxResources: 2,
          minResources: 0,
          specificResource: ResourceType.BERRY,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 2,
            },
          },
        };

        const targetPlayerId = gameState.players[1].playerId;

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            selectResourceGameInput,
            {
              inputType: GameInputType.SELECT_PLAYER,
              prevInputType: GameInputType.SELECT_RESOURCES,
              prevInput: selectResourceGameInput,
              cardContext: CardName.MONK,
              mustSelectOne: true,
              playerOptions: [targetPlayerId],
              clientOptions: {
                selectedPlayer: player.playerId,
              },
            },
          ]);
        }).to.throwException(/invalid/i);
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
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.MINE)).to.be(false);

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
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.MINE)).to.be(true);
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
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.MINE)).to.be(false);

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
        expect(player.hasCardInCity(card.name)).to.be(true);
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

        expect(player.hasCardInCity(card.name)).to.be(false);
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
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(
          gameState3.getPlayer(targetPlayerId).hasCardInCity(card.name)
        ).to.be(true);
      });
    });
  });
});
