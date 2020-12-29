import expect from "expect.js";
import { GameState } from "./gameState";
import { CardName, GameInput, GameInputType, LocationName } from "./types";
import { testInitialGameState } from "./testHelpers";

describe("GameState", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = testInitialGameState();
  });

  describe("meadow", () => {
    it("should replenish meadow", () => {
      expect(gameState.meadowCards).to.eql([]);

      // Stack the deck
      const topOfDeck = [
        CardName.FARM,
        CardName.QUEEN,
        CardName.MINER_MOLE,
        CardName.MINE,
        CardName.FARM,
        CardName.QUEEN,
        CardName.MINER_MOLE,
        CardName.MINE,
        CardName.FARM,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      gameState.replenishMeadow();
      expect(gameState.meadowCards.length).to.be(8);
      expect(gameState.meadowCards).to.eql([
        CardName.FARM,
        CardName.QUEEN,
        CardName.MINER_MOLE,
        CardName.MINE,
        CardName.FARM,
        CardName.QUEEN,
        CardName.MINER_MOLE,
        CardName.MINE,
      ]);

      gameState.removeCardFromMeadow(CardName.FARM);
      expect(gameState.meadowCards.length).to.be(7);
      expect(gameState.meadowCards).to.eql([
        CardName.QUEEN,
        CardName.MINER_MOLE,
        CardName.MINE,
        CardName.FARM,
        CardName.QUEEN,
        CardName.MINER_MOLE,
        CardName.MINE,
      ]);

      gameState.replenishMeadow();
      expect(gameState.meadowCards.length).to.be(8);
      expect(gameState.meadowCards).to.eql([
        CardName.QUEEN,
        CardName.MINER_MOLE,
        CardName.MINE,
        CardName.FARM,
        CardName.QUEEN,
        CardName.MINER_MOLE,
        CardName.MINE,
        CardName.FARM,
      ]);
    });
  });
  describe("visiting destination cards", () => {
    const foo = "abc";
    it("should handle visit destination card", () => {
      // player1 is the active player
      const player1 = gameState.players[0];
      const player2 = gameState.players[1];
      player1.playedCards[CardName.INN] = [{}];
      player1.playedCards[CardName.LOOKOUT] = [{}];
      player1.playedCards[CardName.QUEEN] = [{}];

      player2.playedCards[CardName.INN] = [{}];
      player2.playedCards[CardName.POST_OFFICE] = [{}];
      player2.playedCards[CardName.FARM] = [{}];
      player2.playedCards[CardName.LOOKOUT] = [{}];

      expect(player1.numAvailableWorkers).to.be(2);
      expect(player2.numAvailableWorkers).to.be(2);

      // active player tries to visit one of their own cards
      let gameInput: GameInput = {
        inputType: GameInputType.VISIT_DESTINATION_CARD as const,
        playerId: player1.playerId,
        card: CardName.LOOKOUT,
        clientOptions: {
          location: LocationName.BASIC_ONE_BERRY,
        },
      };

      gameState.handleVisitDestinationCardGameInput(gameInput);
      expect(player1.numAvailableWorkers).to.be(1);
      const lookout = player1.playedCards[CardName.LOOKOUT];
      if (!lookout) {
        throw new Error("undefined card");
      }
      const workersOnLookout = lookout[0].workers || [];
      expect(workersOnLookout.length).to.be(1);

      // player1 cannot play another worker on lookout since it's occupied
      expect(() => {
        gameState.handleVisitDestinationCardGameInput(gameInput as any);
      }).to.throwException(/open space/i);

      // player1 cannot play on a closed location of player2
      gameInput = {
        inputType: GameInputType.VISIT_DESTINATION_CARD as const,
        playerId: player2.playerId,
        card: CardName.LOOKOUT,
        clientOptions: {
          location: LocationName.BASIC_ONE_BERRY,
        },
      };

      expect(() => {
        gameState.handleVisitDestinationCardGameInput(gameInput as any);
      }).to.throwException(/Cannot place worker/i);

      // player1 can play on an open location of player2
      gameInput = {
        inputType: GameInputType.VISIT_DESTINATION_CARD as const,
        playerId: player2.playerId,
        card: CardName.INN,
      };

      // TODO: bring this test back when open destinations are implemented
      //gameState.handleVisitDestinationCardGameInput(gameInput as any);
      //expect(player1.numAvailableWorkers).to.be(0);
    });
  });
});
