import expect from "expect.js";
import { GameState } from "./gameState";
import {
  CardName,
  GameInput,
  GameInputType,
  LocationName,
  EventName,
  ResourceType,
} from "./types";
import { Event } from "./event";
import { testInitialGameState, multiStepGameInputTest } from "./testHelpers";

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
    it("can visit LOOKOUT card", () => {
      let player1 = gameState.getActivePlayer();
      player1.addToCity(CardName.LOOKOUT);

      expect(player1.numAvailableWorkers).to.be(2);
      expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

      gameState = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.VISIT_DESTINATION_CARD,
          cardOwnerId: player1.playerId,
          card: CardName.LOOKOUT,
        },
        {
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.LOOKOUT,
          locationOptions: (Object.keys(
            gameState.locationsMap
          ) as unknown) as LocationName[],
          clientOptions: {
            selectedLocation: LocationName.BASIC_ONE_BERRY,
          },
        },
      ]);

      player1 = gameState.getPlayer(player1.playerId);

      expect(player1.numAvailableWorkers).to.be(1);
      expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
    });

    xit("should handle visit destination card", () => {
      // player1 is the active player
      const player1 = gameState.players[0];
      const player2 = gameState.players[1];
      player1.addToCity(CardName.INN);
      player1.addToCity(CardName.LOOKOUT);
      player1.addToCity(CardName.QUEEN);
      player2.addToCity(CardName.INN);
      player2.addToCity(CardName.POST_OFFICE);
      player2.addToCity(CardName.FARM);
      player2.addToCity(CardName.LOOKOUT);
      expect(player1.numAvailableWorkers).to.be(2);
      expect(player2.numAvailableWorkers).to.be(2);

      // active player tries to visit one of their own cards
      //   let gameInput: GameInput = {
      //     inputType: GameInputType.VISIT_DESTINATION_CARD as const,
      //     playerId: player1.playerId,
      //     card: CardName.LOOKOUT,
      //     clientOptions: {
      //       location: LocationName.BASIC_ONE_BERRY,
      //     },
      //   };
      //   gameState.handleVisitDestinationCardGameInput(gameInput);
      //   expect(player1.numAvailableWorkers).to.be(1);
      //   const lookout = player1.playedCards[CardName.LOOKOUT];
      //   if (!lookout) {
      //     throw new Error("undefined card");
      //   }
      //   const workersOnLookout = lookout[0].workers || [];
      //   expect(workersOnLookout.length).to.be(1);
      //   // player1 cannot play another worker on lookout since it's occupied
      //   expect(() => {
      //     gameState.handleVisitDestinationCardGameInput(gameInput as any);
      //   }).to.throwException(/open space/i);
      //   // player1 cannot play on a closed location of player2
      //   gameInput = {
      //     inputType: GameInputType.VISIT_DESTINATION_CARD as const,
      //     playerId: player2.playerId,
      //     card: CardName.LOOKOUT,
      //     clientOptions: {
      //       location: LocationName.BASIC_ONE_BERRY,
      //     },
      //   };
      //   expect(() => {
      //     gameState.handleVisitDestinationCardGameInput(gameInput as any);
      //   }).to.throwException(/Cannot place worker/i);
      //   // player1 can play on an open location of player2
      //   gameInput = {
      //     inputType: GameInputType.VISIT_DESTINATION_CARD as const,
      //     playerId: player2.playerId,
      //     card: CardName.INN,
      //   };
      //   // TODO: bring this test back when open destinations are implemented
      //   //gameState.handleVisitDestinationCardGameInput(gameInput as any);
      //   //expect(player1.numAvailableWorkers).to.be(0);
    });
  });

  describe("claiming events", () => {
    it("claim 4 production tags events", () => {
      // player1 is the active player
      let player1 = gameState.getActivePlayer();
      const player2 = gameState.players[1];

      player1.addToCity(CardName.MINE);
      player1.addToCity(CardName.MINE);
      player1.addToCity(CardName.FARM);
      player1.addToCity(CardName.FARM);
      player2.addToCity(CardName.MINE);
      player2.addToCity(CardName.MINE);
      player2.addToCity(CardName.FARM);
      player2.addToCity(CardName.FARM);

      expect(player1.numAvailableWorkers).to.be(2);
      expect(player2.numAvailableWorkers).to.be(2);

      // player1 should be able to claim event
      const gameInput: GameInput = {
        inputType: GameInputType.CLAIM_EVENT as const,
        event: EventName.BASIC_FOUR_PRODUCTION_TAGS,
      };
      gameState = gameState.next(gameInput);
      player1 = gameState.getPlayer(player1.playerId);

      expect(player1.numAvailableWorkers).to.be(1);
      expect(
        !!player1.claimedEvents[EventName.BASIC_FOUR_PRODUCTION_TAGS]
      ).to.be(true);

      // player2 should not be able to claim event
      let event = Event.fromName(EventName.BASIC_FOUR_PRODUCTION_TAGS);
      expect(event.canPlay(gameState, gameInput)).to.be(false);
    });
  });
});
