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
  LocationType,
} from "./types";
import { Event } from "./event";
import { Card } from "./card";
import { Location } from "./location";
import { Player } from "./player";
import {
  testInitialGameState,
  multiStepGameInputTest,
  playCardInput,
} from "./testHelpers";

describe("GameState", () => {
  let gameState: GameState;
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState();
    player = gameState.getActivePlayer();
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

  describe("getPlayableLocations", () => {
    it("should account for active player numAvailableWorkers", () => {
      expect(gameState.getPlayableLocations()).to.eql([
        ...Location.byType(LocationType.BASIC),
        ...Location.byType(LocationType.HAVEN),
      ]);

      // Use up all workers
      const player = gameState.getActivePlayer();
      gameState.locationsMap[LocationName.BASIC_ONE_BERRY]!.push(
        player.playerId,
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);

      expect(gameState.getPlayableLocations()).to.eql([]);
      expect(
        gameState.getPlayableLocations({
          checkCanPlaceWorker: false,
        })
      ).to.eql([
        ...Location.byType(LocationType.BASIC),
        ...Location.byType(LocationType.HAVEN),
      ]);
    });

    it("should account for location occupancy restrictions", () => {
      expect(gameState.getPlayableLocations()).to.eql([
        ...Location.byType(LocationType.BASIC),
        ...Location.byType(LocationType.HAVEN),
      ]);

      // Use put one worker on exclusive location
      const player = gameState.getActivePlayer();
      gameState.locationsMap[LocationName.BASIC_ONE_STONE]!.push(
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_STONE);

      expect(gameState.getPlayableLocations()).to.eql([
        ...Location.byType(LocationType.BASIC).filter(
          (x) => x !== LocationName.BASIC_ONE_STONE
        ),
        ...Location.byType(LocationType.HAVEN),
      ]);
      expect(
        gameState.getPlayableLocations({
          checkCanPlaceWorker: false,
        })
      ).to.eql([
        ...Location.byType(LocationType.BASIC),
        ...Location.byType(LocationType.HAVEN),
      ]);
    });

    it("should account for forest location occupancy restrictions", () => {
      gameState = testInitialGameState({ numPlayers: 4 });

      // Add one forest location
      gameState.locationsMap[LocationName.FOREST_TWO_WILD] = [];

      const player = gameState.getActivePlayer();

      expect(gameState.getPlayableLocations()).to.eql([
        ...Location.byType(LocationType.BASIC),
        ...Location.byType(LocationType.HAVEN),
        LocationName.FOREST_TWO_WILD,
      ]);
      // Put one worker on exclusive forest location
      gameState.locationsMap[LocationName.FOREST_TWO_WILD]!.push(
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.FOREST_TWO_WILD);

      expect(gameState.getPlayableLocations()).to.eql([
        ...Location.byType(LocationType.BASIC),
        ...Location.byType(LocationType.HAVEN),
        LocationName.FOREST_TWO_WILD,
      ]);

      // Put another one worker on exclusive forest location
      gameState.locationsMap[LocationName.FOREST_TWO_WILD]!.push(
        gameState.players[1].playerId
      );
      gameState.players[1].placeWorkerOnLocation(LocationName.FOREST_TWO_WILD);

      expect(gameState.getPlayableLocations()).to.eql([
        ...Location.byType(LocationType.BASIC),
        ...Location.byType(LocationType.HAVEN),
      ]);
    });
  });

  describe("nextPlayer", () => {
    it("should change active player to the next player", () => {
      gameState = testInitialGameState({ numPlayers: 4 });
      const player0Id = gameState.players[0].playerId;
      const player1Id = gameState.players[1].playerId;
      const player2Id = gameState.players[2].playerId;
      const player3Id = gameState.players[3].playerId;

      expect(gameState.getActivePlayer().playerId).to.be(player0Id);
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player1Id);
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player2Id);
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player3Id);
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player0Id);
    });

    it("should account for GAME_END", () => {
      gameState = testInitialGameState({ numPlayers: 4 });
      const player0Id = gameState.players[0].playerId;
      const player1Id = gameState.players[1].playerId;
      const player2Id = gameState.players[2].playerId;
      const player3Id = gameState.players[3].playerId;

      expect(gameState.getActivePlayer().playerId).to.be(player0Id);
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player1Id);

      gameState.getActivePlayer().playerStatus = PlayerStatus.GAME_ENDED;
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player2Id);
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player3Id);
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player0Id);

      // Skips player1
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player2Id);

      gameState.getActivePlayer().playerStatus = PlayerStatus.GAME_ENDED;
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player3Id);

      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player0Id);

      // Skips player1 & player2
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player3Id);

      gameState.getActivePlayer().playerStatus = PlayerStatus.GAME_ENDED;
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player0Id);

      // Skips everyone else
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player0Id);

      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player0Id);

      gameState.getActivePlayer().playerStatus = PlayerStatus.GAME_ENDED;
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player0Id);
    });
  });

  describe("PLAY_CARD", () => {
    it("should be able to pay for the card to play it", () => {
      const card = Card.fromName(CardName.FARM);
      const player = gameState.getActivePlayer();

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

      const player = gameState.getActivePlayer();
      player.cardsInHand.push(card.name);
      player.gainResources(card.baseCost);

      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, fromMeadow: false },
      ]);

      // Fill up city
      for (let i = 0; i < 15; i++) {
        player.addToCity(CardName.FARM);
      }
      expect(gameState.getPlayableCards()).to.eql([]);
    });

    it("should be able to play constructions if city is full (w/ crane)", () => {
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
      for (let i = 0; i < 14; i++) {
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

      [player, gameState] = multiStepGameInputTest(gameState, [
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
      for (let i = 0; i < 14; i++) {
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
      [player, gameState] = multiStepGameInputTest(gameState, [
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
      const player = gameState.getActivePlayer();
      player.cardsInHand.push(CardName.FOOL);
      player.gainResources(Card.fromName(CardName.FOOL).baseCost);
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FOOL, fromMeadow: false },
      ]);

      // Fill up city
      for (let i = 0; i < 15; i++) {
        player.addToCity(CardName.FARM);
      }
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FOOL, fromMeadow: false },
      ]);
    });

    it("should be able to play RUINS if city is full (w/ construction)", () => {
      player.cardsInHand.push(CardName.RUINS);
      player.gainResources(Card.fromName(CardName.RUINS).baseCost);

      // no construction to destroy
      expect(gameState.getPlayableCards()).to.eql([]);

      // Fill up city
      for (let i = 0; i < 15; i++) {
        player.addToCity(CardName.FARM);
      }
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.RUINS, fromMeadow: false },
      ]);

      expect(player.hasCardInCity(CardName.RUINS)).to.be(false);
      [player, gameState] = multiStepGameInputTest(gameState, [
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
      expect(gameState.getVisitableDestinationCards()).to.eql([]);

      player.addToCity(CardName.FARM);
      expect(gameState.getVisitableDestinationCards()).to.eql([
        player.getFirstPlayedCard(CardName.UNIVERSITY),
      ]);

      const player2 = gameState.players[1];
      player2.addToCity(CardName.QUEEN);
      player2.addToCity(CardName.INN);
      player2.addToCity(CardName.UNIVERSITY);

      expect(gameState.getVisitableDestinationCards()).to.eql([
        player.getFirstPlayedCard(CardName.UNIVERSITY),
      ]);

      gameState.meadowCards.push(CardName.FARM);

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
      const event = Event.fromName(EventName.BASIC_FOUR_PRODUCTION);
      expect(event.canPlay(gameState, gameInput)).to.be(false);
    });
  });

  describe("PREPARE_FOR_SEASON", () => {
    it("should activate production in WINTER", () => {
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

      [player, gameState] = multiStepGameInputTest(gameState, [
        { inputType: GameInputType.PREPARE_FOR_SEASON },
      ]);

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);
      expect(player.numAvailableWorkers).to.be(3);
    });

    it("WINTER: should auto advance MONK/DOCTOR/WOODCARVER/PEDDLER if there are no other pending inputs", () => {
      player.addToCity(CardName.MONK);
      player.addToCity(CardName.DOCTOR);
      player.addToCity(CardName.WOODCARVER);
      player.addToCity(CardName.PEDDLER);

      expect(player.currentSeason).to.be(Season.WINTER);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

      // Use up all workers
      gameState.locationsMap[LocationName.BASIC_TWO_CARDS_AND_ONE_VP]!.push(
        player.playerId,
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);

      [player, gameState] = multiStepGameInputTest(
        gameState,
        [{ inputType: GameInputType.PREPARE_FOR_SEASON }],
        { autoAdvance: true }
      );

      player = gameState.getPlayer(player.playerId);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
      expect(player.numAvailableWorkers).to.be(3);
    });

    it("WINTER: should NOT auto advance MONK/DOCTOR/WOODCARVER/PEDDLER if there are other pending inputs", () => {
      player.addToCity(CardName.MONK);
      player.addToCity(CardName.DOCTOR);
      player.addToCity(CardName.WOODCARVER);
      player.addToCity(CardName.PEDDLER);
      player.addToCity(CardName.FARM);

      expect(player.currentSeason).to.be(Season.WINTER);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

      // Use up all workers
      gameState.locationsMap[LocationName.BASIC_TWO_CARDS_AND_ONE_VP]!.push(
        player.playerId,
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);

      [player, gameState] = multiStepGameInputTest(
        gameState,
        [
          { inputType: GameInputType.PREPARE_FOR_SEASON },
          {
            inputType: GameInputType.SELECT_RESOURCES,
            toSpend: true,
            prevInputType: GameInputType.PREPARE_FOR_SEASON,
            cardContext: CardName.DOCTOR,
            maxResources: 3,
            minResources: 0,
            specificResource: ResourceType.BERRY,
            clientOptions: { resources: { [ResourceType.BERRY]: 1 } },
          },
        ],
        { autoAdvance: true, skipMultiPendingInputCheck: true }
      );

      player = gameState.getPlayer(player.playerId);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
      expect(player.numAvailableWorkers).to.be(3);
    });

    it("WINTER: should NOT auto advance MONK/DOCTOR/WOODCARVER/PEDDLER if there are other pending inputs", () => {
      player.addToCity(CardName.MONK);
      player.addToCity(CardName.DOCTOR);
      player.addToCity(CardName.WOODCARVER);
      player.addToCity(CardName.PEDDLER);
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.MINE);

      expect(player.currentSeason).to.be(Season.WINTER);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

      // Use up all workers
      gameState.locationsMap[LocationName.BASIC_TWO_CARDS_AND_ONE_VP]!.push(
        player.playerId,
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);

      [player, gameState] = multiStepGameInputTest(
        gameState,
        [
          { inputType: GameInputType.PREPARE_FOR_SEASON },
          {
            inputType: GameInputType.SELECT_RESOURCES,
            toSpend: true,
            prevInputType: GameInputType.PREPARE_FOR_SEASON,
            cardContext: CardName.DOCTOR,
            maxResources: 3,
            minResources: 0,
            specificResource: ResourceType.BERRY,
            clientOptions: { resources: { [ResourceType.BERRY]: 1 } },
          },
          {
            inputType: GameInputType.SELECT_RESOURCES,
            toSpend: true,
            prevInputType: GameInputType.PREPARE_FOR_SEASON,
            cardContext: CardName.PEDDLER,
            maxResources: 2,
            minResources: 0,
            clientOptions: {
              resources: {
                [ResourceType.PEBBLE]: 1,
              },
            },
          },
          {
            inputType: GameInputType.SELECT_RESOURCES,
            toSpend: false,
            prevInputType: GameInputType.SELECT_RESOURCES,
            cardContext: CardName.PEDDLER,
            maxResources: 1,
            minResources: 1,
            clientOptions: {
              resources: {
                [ResourceType.TWIG]: 1,
              },
            },
          },
          {
            inputType: GameInputType.SELECT_RESOURCES,
            toSpend: true,
            prevInputType: GameInputType.PREPARE_FOR_SEASON,
            cardContext: CardName.WOODCARVER,
            maxResources: 3,
            minResources: 0,
            specificResource: ResourceType.TWIG,
            clientOptions: {
              resources: {
                [ResourceType.TWIG]: 1,
              },
            },
          },
        ],
        { autoAdvance: true, skipMultiPendingInputCheck: true }
      );

      player = gameState.getPlayer(player.playerId);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(2);
      expect(player.numAvailableWorkers).to.be(3);
    });

    it("should activate production in SUMMER", () => {
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

      [player, gameState] = multiStepGameInputTest(gameState, [
        { inputType: GameInputType.PREPARE_FOR_SEASON },
      ]);

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);
      expect(player.numAvailableWorkers).to.be(6);
    });

    it("should draw 2 cards from the meadow in SPRING", () => {
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

      [player, gameState] = multiStepGameInputTest(gameState, [
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

      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.numAvailableWorkers).to.be(4);
      expect(player.cardsInHand).to.eql([CardName.MINE, CardName.QUEEN]);
      expect(gameState.meadowCards).to.eql([
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

  describe("gameLog", () => {
    it("should report game end information", () => {
      gameState.players[0].addToCity(CardName.FARM); // 1
      gameState.players[0].addToCity(CardName.QUEEN); // 4
      gameState.players[0].addToCity(CardName.KING); // 4 + 0 events
      gameState.players[0].gainResources({
        [ResourceType.VP]: 5,
      });

      gameState.players[1].addToCity(CardName.ARCHITECT); // 2 + 2
      gameState.players[1].addToCity(CardName.HISTORIAN); // 1
      gameState.players[1].addToCity(CardName.HUSBAND); // 2
      gameState.players[1].addToCity(CardName.WIFE); // 2 + 3 (for husband)
      gameState.players[1].gainResources({
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 1,
      });

      gameState.players.forEach((player) => {
        player.nextSeason();
        player.nextSeason();
        player.nextSeason();
      });
      expect(gameState.gameLog).eql([
        { entry: [{ type: "text", text: "Game created with 2 players." }] },
        { entry: [{ type: "text", text: "Dealing cards to each player." }] },
        { entry: [{ type: "text", text: "Dealing cards to the Meadow." }] },
      ]);
      gameState = gameState.next({ inputType: GameInputType.GAME_END });
      gameState = gameState.next({ inputType: GameInputType.GAME_END });
      expect(gameState.gameLog).eql([
        { entry: [{ type: "text", text: "Game created with 2 players." }] },
        { entry: [{ type: "text", text: "Dealing cards to each player." }] },
        { entry: [{ type: "text", text: "Dealing cards to the Meadow." }] },
        {
          entry: [
            gameState.players[0].getGameTextPart(),
            { type: "text", text: " took the game end action." },
          ],
        },
        {
          entry: [
            gameState.players[1].getGameTextPart(),
            { type: "text", text: " took the game end action." },
          ],
        },
        { entry: [{ type: "text", text: "Game over" }] },
        {
          entry: [
            gameState.players[0].getGameTextPart(),
            { type: "text", text: " has 14 points." },
          ],
        },
        {
          entry: [
            gameState.players[1].getGameTextPart(),
            { type: "text", text: " has 12 points." },
          ],
        },
      ]);
    });
  });
});
