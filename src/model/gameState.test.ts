import expect from "expect.js";
import { GameState } from "./gameState";
import {
  Season,
  CardName,
  GameInput,
  GameInputType,
  LocationName,
  EventName,
  PlayerStatus,
  ResourceType,
  GameInputPlayCard,
} from "./types";
import { Event } from "./event";
import { Card } from "./card";
import {
  testInitialGameState,
  multiStepGameInputTest,
  playCardInput,
} from "./testHelpers";

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

  describe("PLAY_CARD", () => {
    it("should be able to pay for the card to play it", () => {
      const card = Card.fromName(CardName.FARM);
      const gameInput = playCardInput(card.name);
      let player = gameState.getActivePlayer();

      player.cardsInHand.push(card.name);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

      expect(gameState.getPlayableCards()).to.eql([]);

      player.gainResources(card.baseCost);
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, fromMeadow: false },
      ]);
    });

    it("should be not be able to play cards if city is full", () => {
      const card = Card.fromName(CardName.FARM);

      let player = gameState.getActivePlayer();
      player.cardsInHand.push(card.name);
      player.gainResources(card.baseCost);

      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, fromMeadow: false },
      ]);

      // Fill up city
      for (var i = 0; i < 15; i++) {
        player.addToCity(CardName.FARM);
      }
      expect(gameState.getPlayableCards()).to.eql([]);
    });

    it("should be able to play constructions if city is full (w/ crane)", () => {
      let player = gameState.getActivePlayer();

      player.cardsInHand.push(CardName.FARM);
      player.gainResources(Card.fromName(CardName.FARM).baseCost);
      player.cardsInHand.push(CardName.MINE);
      player.gainResources(Card.fromName(CardName.MINE).baseCost);

      player.cardsInHand.push(CardName.WIFE);
      player.gainResources(Card.fromName(CardName.WIFE).baseCost);
      player.cardsInHand.push(CardName.KING);
      player.gainResources(Card.fromName(CardName.KING).baseCost);

      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, fromMeadow: false },
        { card: CardName.MINE, fromMeadow: false },
        { card: CardName.WIFE, fromMeadow: false },
        { card: CardName.KING, fromMeadow: false },
      ]);

      // Fill up city
      player.addToCity(CardName.CRANE);
      for (var i = 0; i < 14; i++) {
        player.addToCity(CardName.FARM);
      }

      // Only constructions
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, fromMeadow: false },
        { card: CardName.MINE, fromMeadow: false },
      ]);

      expect(() => {
        multiStepGameInputTest(gameState, [playCardInput(CardName.MINE)]);
      }).to.throwException(/unable to add/i);

      expect(player.hasCardInCity(CardName.CRANE)).to.be(true);
      expect(player.hasCardInCity(CardName.MINE)).to.be(false);

      gameState = multiStepGameInputTest(gameState, [
        playCardInput(CardName.MINE, {
          paymentOptions: {
            resources: {
              [ResourceType.PEBBLE]: 0,
              [ResourceType.RESIN]: 0,
              [ResourceType.TWIG]: 0,
            },
            cardToUse: CardName.CRANE,
          },
        }),
      ]);
      player = gameState.getPlayer(player.playerId);
      expect(player.hasCardInCity(CardName.CRANE)).to.be(false);
      expect(player.hasCardInCity(CardName.MINE)).to.be(true);
    });

    it("should be able to play critters if city is full (w/ innkeeper)", () => {
      let player = gameState.getActivePlayer();

      player.cardsInHand.push(CardName.FARM);
      player.gainResources(Card.fromName(CardName.FARM).baseCost);
      player.cardsInHand.push(CardName.MINE);
      player.gainResources(Card.fromName(CardName.MINE).baseCost);

      player.cardsInHand.push(CardName.WIFE);
      player.gainResources(Card.fromName(CardName.WIFE).baseCost);
      player.cardsInHand.push(CardName.KING);
      player.gainResources(Card.fromName(CardName.KING).baseCost);

      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, fromMeadow: false },
        { card: CardName.MINE, fromMeadow: false },
        { card: CardName.WIFE, fromMeadow: false },
        { card: CardName.KING, fromMeadow: false },
      ]);

      // Fill up city
      player.addToCity(CardName.INNKEEPER);
      for (var i = 0; i < 14; i++) {
        player.addToCity(CardName.FARM);
      }

      // Only critters
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.WIFE, fromMeadow: false },
        { card: CardName.KING, fromMeadow: false },
      ]);

      expect(() => {
        multiStepGameInputTest(gameState, [playCardInput(CardName.WIFE)]);
      }).to.throwException(/unable to add/i);

      expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(true);
      expect(player.hasCardInCity(CardName.WIFE)).to.be(false);
      gameState = multiStepGameInputTest(gameState, [
        playCardInput(CardName.WIFE, {
          paymentOptions: {
            resources: {
              [ResourceType.BERRY]: 0,
            },
            cardToUse: CardName.INNKEEPER,
          },
        }),
      ]);
      player = gameState.getPlayer(player.playerId);
      expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(false);
      expect(player.hasCardInCity(CardName.WIFE)).to.be(true);
    });

    it("should be able to play FOOL if city is full", () => {
      let player = gameState.getActivePlayer();
      player.cardsInHand.push(CardName.FOOL);
      player.gainResources(Card.fromName(CardName.FOOL).baseCost);
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FOOL, fromMeadow: false },
      ]);

      // Fill up city
      for (var i = 0; i < 15; i++) {
        player.addToCity(CardName.FARM);
      }
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FOOL, fromMeadow: false },
      ]);
    });

    it("should be able to play RUINS if city is full (w/ construction)", () => {
      let player = gameState.getActivePlayer();
      player.cardsInHand.push(CardName.RUINS);
      player.gainResources(Card.fromName(CardName.RUINS).baseCost);

      // no construction to destroy
      expect(gameState.getPlayableCards()).to.eql([]);

      // Fill up city
      for (var i = 0; i < 15; i++) {
        player.addToCity(CardName.FARM);
      }
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.RUINS, fromMeadow: false },
      ]);

      expect(player.hasCardInCity(CardName.RUINS)).to.be(false);
      gameState = multiStepGameInputTest(gameState, [
        playCardInput(CardName.RUINS, {
          paymentOptions: {
            resources: {},
          },
        }),
        {
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.PLAY_CARD,
          cardOptions: player.getPlayedCardInfos(CardName.FARM),
          cardContext: CardName.RUINS,
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [player.getPlayedCardInfos(CardName.FARM)[0]],
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);
      expect(player.hasCardInCity(CardName.RUINS)).to.be(true);
    });
  });

  describe("VISIT_DESTINATION_CARD", () => {
    it("sanity test", () => {
      const player = gameState.getActivePlayer();
      expect(gameState.getVisitableDestinationCards()).to.eql([]);

      expect(gameState.getPossibleGameInputs()).to.eql([
        {
          inputType: GameInputType.PLACE_WORKER,
          clientOptions: {
            location: null,
          },
        },
      ]);

      player.addToCity(CardName.UNIVERSITY);
      expect(gameState.getVisitableDestinationCards()).to.eql([
        player.getFirstPlayedCard(CardName.UNIVERSITY),
      ]);

      const player2 = gameState.players[1];
      player2.addToCity(CardName.QUEEN);
      player2.addToCity(CardName.INN);
      player2.addToCity(CardName.UNIVERSITY);

      expect(gameState.getVisitableDestinationCards()).to.eql([
        player.getFirstPlayedCard(CardName.UNIVERSITY),
        player2.getFirstPlayedCard(CardName.INN),
      ]);

      expect(gameState.getPossibleGameInputs()).to.eql([
        {
          inputType: GameInputType.PLACE_WORKER,
          clientOptions: {
            location: null,
          },
        },
        {
          inputType: GameInputType.VISIT_DESTINATION_CARD,
          clientOptions: {
            playedCard: null,
          },
        },
      ]);

      player2.placeWorkerOnCard(
        gameState,
        player2.getFirstPlayedCard(CardName.INN)
      );

      expect(gameState.getVisitableDestinationCards()).to.eql([
        player.getFirstPlayedCard(CardName.UNIVERSITY),
      ]);

      expect(() => {
        multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player2.getFirstPlayedCard(CardName.UNIVERSITY),
            },
          },
        ]);
      }).to.throwException(/cannot place worker on card/i);

      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.UNIVERSITY)
      );

      expect(gameState.getVisitableDestinationCards()).to.eql([]);

      expect(gameState.getPossibleGameInputs()).to.eql([
        {
          inputType: GameInputType.PLACE_WORKER,
          clientOptions: {
            location: null,
          },
        },
      ]);
    });
  });

  describe("CLAIM_EVENT", () => {
    it("should handle CLAIM_EVENT game input", () => {
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

      expect(gameState.getClaimableEvents()).to.eql([
        EventName.BASIC_FOUR_PRODUCTION,
      ]);

      // player1 should be able to claim event
      const gameInput: GameInput = {
        inputType: GameInputType.CLAIM_EVENT as const,
        clientOptions: {
          event: EventName.BASIC_FOUR_PRODUCTION,
        },
      };
      gameState = gameState.next(gameInput);
      player1 = gameState.getPlayer(player1.playerId);

      expect(player1.numAvailableWorkers).to.be(1);
      expect(!!player1.claimedEvents[EventName.BASIC_FOUR_PRODUCTION]).to.be(
        true
      );

      expect(gameState.getClaimableEvents()).to.eql([]);

      // player2 should not be able to claim event
      let event = Event.fromName(EventName.BASIC_FOUR_PRODUCTION);
      expect(event.canPlay(gameState, gameInput)).to.be(false);
    });
  });

  describe("PREPARE_FOR_SEASON", () => {
    it("should activate production in WINTER", () => {
      let player = gameState.getActivePlayer();
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.MINE);
      player.addToCity(CardName.MINE);
      expect(player.currentSeason).to.be(Season.WINTER);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

      // Use up all workers
      gameState.locationsMap[LocationName.BASIC_TWO_CARDS_AND_ONE_VP]!.push(
        player.playerId,
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);

      const gameState2 = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PREPARE_FOR_SEASON,
        },
      ]);

      player = gameState2.getPlayer(player.playerId);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);
      expect(player.numAvailableWorkers).to.be(3);
    });

    it("should activate production in SUMMER", () => {
      let player = gameState.getActivePlayer();
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.MINE);
      player.addToCity(CardName.MINE);

      player.nextSeason();
      player.nextSeason();

      expect(player.currentSeason).to.be(Season.SUMMER);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

      // Use up all workers
      gameState.locationsMap[LocationName.BASIC_TWO_CARDS_AND_ONE_VP]!.push(
        player.playerId,
        player.playerId,
        player.playerId,
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);

      const gameState2 = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PREPARE_FOR_SEASON,
        },
      ]);

      player = gameState2.getPlayer(player.playerId);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);
      expect(player.numAvailableWorkers).to.be(6);
    });

    it("should draw 2 cards from the meadow in SPRING", () => {
      let player = gameState.getActivePlayer();
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.MINE);
      player.addToCity(CardName.MINE);

      player.nextSeason();

      // Use up all workers
      gameState.locationsMap[LocationName.BASIC_ONE_BERRY]!.push(
        player.playerId,
        player.playerId,
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);

      const topOfDeck = [
        CardName.FARM,
        CardName.MINE,
        CardName.QUEEN,
        CardName.KING,
        CardName.CASTLE,
        CardName.TEACHER,
        CardName.HISTORIAN,
        CardName.INN,
        CardName.LOOKOUT,
        CardName.POST_OFFICE,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((x) => gameState.deck.addToStack(x));

      expect(player.currentSeason).to.be(Season.SPRING);
      expect(player.cardsInHand).to.eql([]);

      gameState.replenishMeadow();
      expect(gameState.meadowCards).to.eql([
        CardName.FARM,
        CardName.MINE,
        CardName.QUEEN,
        CardName.KING,
        CardName.CASTLE,
        CardName.TEACHER,
        CardName.HISTORIAN,
        CardName.INN,
      ]);

      const gameState2 = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PREPARE_FOR_SEASON,
        },
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.PREPARE_FOR_SEASON,
          cardOptions: gameState.meadowCards,
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            selectedCards: [CardName.MINE, CardName.QUEEN],
          },
        },
      ]);

      player = gameState2.getPlayer(player.playerId);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.numAvailableWorkers).to.be(4);
      expect(player.cardsInHand).to.eql([CardName.MINE, CardName.QUEEN]);
      expect(gameState2.meadowCards).to.eql([
        CardName.FARM,
        CardName.KING,
        CardName.CASTLE,
        CardName.TEACHER,
        CardName.HISTORIAN,
        CardName.INN,
        CardName.LOOKOUT,
        CardName.POST_OFFICE,
      ]);
    });

    it("should prompt to activate CLOCK_TOWER before recalling workers", () => {
      let player = gameState.getActivePlayer();
      player.addToCity(CardName.CLOCK_TOWER);
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.MINE);
      player.addToCity(CardName.MINE);
      expect(player.currentSeason).to.be(Season.WINTER);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

      // Use up all workers
      gameState.locationsMap[LocationName.BASIC_ONE_BERRY]!.push(
        player.playerId,
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);

      const gameStateNoActivate = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PREPARE_FOR_SEASON,
        },
        {
          cardContext: CardName.CLOCK_TOWER,
          inputType: GameInputType.SELECT_WORKER_PLACEMENT,
          mustSelectOne: false,
          options: [
            {
              location: LocationName.BASIC_ONE_BERRY,
            },
            {
              location: LocationName.BASIC_ONE_BERRY,
            },
          ],
          clientOptions: {
            selectedOption: null,
          },
          prevInputType: GameInputType.PREPARE_FOR_SEASON,
        },
      ]);
      player = gameStateNoActivate.getPlayer(player.playerId);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);
      expect(player.numAvailableWorkers).to.be(3);
      expect(player.getPlayedCardInfos(CardName.CLOCK_TOWER)?.[0]).to.eql({
        cardName: CardName.CLOCK_TOWER,
        cardOwnerId: player.playerId,
        resources: {
          [ResourceType.VP]: 3,
        },
        usedForCritter: false,
      });

      const gameStateWithActivate = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PREPARE_FOR_SEASON,
        },
        {
          cardContext: CardName.CLOCK_TOWER,
          inputType: GameInputType.SELECT_WORKER_PLACEMENT,
          mustSelectOne: false,
          options: [
            {
              location: LocationName.BASIC_ONE_BERRY,
            },
            {
              location: LocationName.BASIC_ONE_BERRY,
            },
          ],
          clientOptions: {
            selectedOption: {
              location: LocationName.BASIC_ONE_BERRY,
            },
          },
          prevInputType: GameInputType.PREPARE_FOR_SEASON,
        },
      ]);
      player = gameStateWithActivate.getPlayer(player.playerId);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);
      expect(player.numAvailableWorkers).to.be(3);
      expect(player.getPlayedCardInfos(CardName.CLOCK_TOWER)?.[0]).to.eql({
        cardName: CardName.CLOCK_TOWER,
        cardOwnerId: player.playerId,
        resources: {
          [ResourceType.VP]: 2,
        },
        usedForCritter: false,
      });
    });

    it("should work for CLOCK_TOWER + multiple multi-step productions", () => {
      let player = gameState.getActivePlayer();
      player.addToCity(CardName.CLOCK_TOWER);
      player.addToCity(CardName.TEACHER);
      player.addToCity(CardName.CHIP_SWEEP);
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.HUSBAND);
      player.addToCity(CardName.WIFE);
      expect(player.currentSeason).to.be(Season.WINTER);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

      // Use up all workers
      gameState.locationsMap[LocationName.BASIC_ONE_BERRY]!.push(
        player.playerId,
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);

      let intermediateGameState = gameState.next({
        inputType: GameInputType.PREPARE_FOR_SEASON,
      });

      const clockTowerInput = {
        cardContext: CardName.CLOCK_TOWER,
        inputType: GameInputType.SELECT_WORKER_PLACEMENT as const,
        prevInputType: GameInputType.PREPARE_FOR_SEASON,
        mustSelectOne: false,
        options: [
          {
            location: LocationName.BASIC_ONE_BERRY,
          },
          {
            location: LocationName.BASIC_ONE_BERRY,
          },
        ],
        clientOptions: {
          selectedOption: {
            location: LocationName.BASIC_ONE_BERRY,
          },
        },
      };

      const husbandInput = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        prevInputType: GameInputType.SELECT_WORKER_PLACEMENT,
        cardContext: CardName.HUSBAND,
        maxResources: 1,
        minResources: 1,
        clientOptions: {
          resources: {
            [ResourceType.BERRY]: 1,
          },
        },
      };

      const chipSweepInput = {
        inputType: GameInputType.SELECT_PLAYED_CARDS as const,
        prevInputType: GameInputType.SELECT_WORKER_PLACEMENT,
        cardContext: CardName.CHIP_SWEEP,
        maxToSelect: 1,
        minToSelect: 1,
        cardOptions: [
          ...player.getPlayedCardInfos(CardName.TEACHER),
          ...player.getPlayedCardInfos(CardName.FARM),
          ...player.getPlayedCardInfos(CardName.HUSBAND),
        ],
        clientOptions: {
          selectedCards: player.getPlayedCardInfos(CardName.FARM),
        },
      };

      const teacherInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.SELECT_WORKER_PLACEMENT,
        cardContext: CardName.TEACHER,
        cardOptions: [CardName.TEACHER, CardName.TEACHER],
        maxToSelect: 1,
        minToSelect: 1,
        clientOptions: {
          selectedCards: [CardName.TEACHER],
        },
      };

      const teacherSelectPlayerInput = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInputType: GameInputType.SELECT_CARDS,
        prevInput: teacherInput,
        cardContext: CardName.TEACHER,
        playerOptions: [gameState.players[1].playerId],
        mustSelectOne: true,
        clientOptions: {
          selectedPlayer: gameState.players[1].playerId,
        },
      };
      intermediateGameState = intermediateGameState.next(clockTowerInput);
      intermediateGameState = intermediateGameState.next(husbandInput);
      intermediateGameState = intermediateGameState.next(chipSweepInput);
      intermediateGameState = intermediateGameState.next(teacherInput);
      intermediateGameState = intermediateGameState.next(
        teacherSelectPlayerInput
      );

      player = intermediateGameState.getPlayer(player.playerId);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(4);
      expect(player.numAvailableWorkers).to.be(3);
      expect(player.cardsInHand).to.eql([CardName.TEACHER]);
      expect(player.getPlayedCardInfos(CardName.CLOCK_TOWER)?.[0]).to.eql({
        cardName: CardName.CLOCK_TOWER,
        cardOwnerId: player.playerId,
        resources: {
          [ResourceType.VP]: 2,
        },
        usedForCritter: false,
      });
    });
  });

  describe("GAME_END", () => {
    it("remove player from list of remaining players once they're done", () => {
      gameState = testInitialGameState({ numPlayers: 3 });
      let player1 = gameState.getActivePlayer();
      player1.nextSeason();
      player1.nextSeason();
      player1.nextSeason();
      player1.placeWorkerOnLocation(LocationName.BASIC_ONE_STONE);
      player1.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
      player1.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
      player1.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
      player1.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
      player1.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);

      expect(player1.currentSeason).to.be(Season.AUTUMN);
      expect(player1.numAvailableWorkers).to.be(0);
      expect(gameState.players.length).to.be(3);

      gameState = gameState.next({ inputType: GameInputType.GAME_END });
      player1 = gameState.getPlayer(player1.playerId);
      expect(player1.playerStatus).to.be(PlayerStatus.GAME_ENDED);
    });
  });
});
