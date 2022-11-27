import expect from "expect.js";
import { GameState } from "./gameState";
import { defaultGameOptions } from "./gameOptions";
import {
  AdornmentName,
  CardName,
  EventName,
  GameInput,
  GameInputType,
  LocationName,
  LocationType,
  PlayerStatus,
  ResourceType,
  RiverDestinationSpotName,
  TrainCarTileName,
  TrainTicketStatus,
  Season,
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
    gameState = testInitialGameState({
      meadowCards: [],
    });
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
        CardName.SHOPKEEPER,
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

      gameState.removeCardFromMeadow(CardName.FARM);
      expect(gameState.meadowCards.length).to.be(6);
      expect(gameState.meadowCards).to.eql([
        CardName.QUEEN,
        CardName.MINER_MOLE,
        CardName.MINE,
        CardName.QUEEN,
        CardName.MINER_MOLE,
        CardName.MINE,
      ]);
    });
  });

  describe("station", () => {
    beforeEach(() => {
      gameState = testInitialGameState({
        stationCards: [],
        gameOptions: { newleaf: { station: true } },
      });
      player = gameState.getActivePlayer();
    });

    it("should replenish station", () => {
      expect(gameState.stationCards).to.eql([]);

      // Stack the deck
      const topOfDeck = [
        CardName.FARM,
        CardName.QUEEN,
        CardName.MINER_MOLE,
        CardName.KING,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      gameState.replenishStation();
      expect(gameState.stationCards.length).to.be(3);
      expect(gameState.stationCards).to.eql([
        CardName.FARM,
        CardName.QUEEN,
        CardName.MINER_MOLE,
      ]);

      // Remove card from the middle position
      gameState.stationCards[1] = null;
      expect(gameState.stationCards).to.eql([
        CardName.FARM,
        null,
        CardName.MINER_MOLE,
      ]);
      gameState.replenishStation();
      expect(gameState.stationCards).to.eql([
        CardName.FARM,
        CardName.KING,
        CardName.MINER_MOLE,
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

  describe("getPlayableAdornments", () => {
    beforeEach(() => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      player.adornmentsInHand.push(AdornmentName.BELL, AdornmentName.COMPASS);
    });

    it("should not return if player has no pearls", () => {
      expect(gameState.getPlayableAdornments()).to.eql([]);
    });

    it("should return if player has pearls", () => {
      player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
      expect(gameState.getPlayableAdornments()).to.eql(player.adornmentsInHand);
    });
  });

  describe("getPlayableAmbassadorLocations", () => {
    beforeEach(() => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
    });

    it("should not return anything if player has no unused ambassador", () => {
      player.useAmbassador();
      expect(gameState.getPlayableAmbassadorLocations()).to.eql([]);
    });

    it("should return SHOAL if player has unused ambassador and can visit", () => {
      player.addCardToHand(gameState, CardName.HUSBAND);
      player.addCardToHand(gameState, CardName.WIFE);

      player.gainResources(gameState, { [ResourceType.TWIG]: 2 });

      expect(gameState.getPlayableAmbassadorLocations()).to.eql([
        { type: "spot", spot: RiverDestinationSpotName.SHOAL },
      ]);
    });

    it("should not return SHOAL if player doesn't have enough cards", () => {
      player.gainResources(gameState, { [ResourceType.TWIG]: 2 });

      expect(gameState.getPlayableAmbassadorLocations()).to.eql([]);
    });

    it("should not return SHOAL if player doesn't have enough resources", () => {
      player.addCardToHand(gameState, CardName.HUSBAND);
      player.addCardToHand(gameState, CardName.WIFE);

      expect(gameState.getPlayableAmbassadorLocations()).to.eql([]);
    });

    it("should not return SHOAL if player doesn't any resources or cards", () => {
      expect(gameState.getPlayableAmbassadorLocations()).to.eql([]);
    });

    it("should return THREE_PRODUCTION if player has 3 PRODUCTION in city", () => {
      expect(gameState.getPlayableAmbassadorLocations()).to.eql([]);

      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);

      expect(gameState.getPlayableAmbassadorLocations()).to.eql([
        { type: "spot", spot: RiverDestinationSpotName.THREE_PRODUCTION },
      ]);
    });

    it("should return THREE_PRODUCTION and SHOAL if player has 3 PRODUCTION in city and enough resources and cards to visit SHOAL", () => {
      expect(gameState.getPlayableAmbassadorLocations()).to.eql([]);

      player.addCardToHand(gameState, CardName.HUSBAND);
      player.addCardToHand(gameState, CardName.WIFE);

      player.gainResources(gameState, { [ResourceType.TWIG]: 2 });

      expect(gameState.getPlayableAmbassadorLocations()).to.eql([
        { type: "spot", spot: RiverDestinationSpotName.SHOAL },
      ]);

      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);

      expect(gameState.getPlayableAmbassadorLocations()).to.eql([
        { type: "spot", spot: RiverDestinationSpotName.SHOAL },
        { type: "spot", spot: RiverDestinationSpotName.THREE_PRODUCTION },
      ]);
    });

    it("should return TWO_TRAVELER if player has 2 TRAVELER in city", () => {
      player.addToCity(gameState, CardName.RANGER);
      player.addToCity(gameState, CardName.WANDERER);

      expect(gameState.getPlayableAmbassadorLocations()).to.eql([
        { type: "spot", spot: RiverDestinationSpotName.TWO_TRAVELER },
      ]);

      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);

      expect(gameState.getPlayableAmbassadorLocations()).to.eql([
        { type: "spot", spot: RiverDestinationSpotName.THREE_PRODUCTION },
        { type: "spot", spot: RiverDestinationSpotName.TWO_TRAVELER },
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

  describe("getPlayableCards", () => {
    it("should return cards from both the Meadow and your Hand", () => {
      gameState.meadowCards.push(CardName.FARM, CardName.MINE);
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.MINE);
      player.gainResources(gameState, Card.fromName(CardName.FARM).baseCost);
      player.gainResources(gameState, Card.fromName(CardName.MINE).baseCost);

      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, source: "MEADOW" },
        { card: CardName.MINE, source: "MEADOW" },
        { card: CardName.FARM, source: "HAND" },
        { card: CardName.MINE, source: "HAND" },
      ]);
    });

    it("should return cards from the station", () => {
      gameState = testInitialGameState({
        meadowCards: [CardName.INN],
        stationCards: [CardName.FARM, CardName.MINE, CardName.MINE],
        gameOptions: {
          newleaf: { station: true },
        },
      });
      player = gameState.getActivePlayer();

      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.MINE);
      player.gainResources(gameState, Card.fromName(CardName.INN).baseCost);
      player.gainResources(gameState, Card.fromName(CardName.FARM).baseCost);
      player.gainResources(gameState, Card.fromName(CardName.MINE).baseCost);

      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.INN, source: "MEADOW" },
        { card: CardName.FARM, source: "STATION", stationIdx: 0 },
        { card: CardName.MINE, source: "STATION", stationIdx: 1 },
        { card: CardName.MINE, source: "STATION", stationIdx: 2 },
        { card: CardName.FARM, source: "HAND" },
        { card: CardName.MINE, source: "HAND" },
      ]);
    });
  });

  describe("getRemainingPlayers", () => {
    it("Should return all players not in GAME_ENDED state", () => {
      gameState = testInitialGameState({ numPlayers: 4 });
      const player0 = gameState.players[0];
      const player1 = gameState.players[1];
      const player2 = gameState.players[2];
      const player3 = gameState.players[3];

      let remainingPlayers = gameState.getRemainingPlayers();
      expect(remainingPlayers.length).to.be(4);
      expect(remainingPlayers).to.eql([player0, player1, player2, player3]);

      // player1 has ended
      gameState.getPlayer(player1.playerId).playerStatus =
        PlayerStatus.GAME_ENDED;
      remainingPlayers = gameState.getRemainingPlayers();
      expect(remainingPlayers.length).to.be(3);
      expect(remainingPlayers).to.eql([player0, player2, player3]);

      // player3 has ended
      gameState.getPlayer(player3.playerId).playerStatus =
        PlayerStatus.GAME_ENDED;
      remainingPlayers = gameState.getRemainingPlayers();
      expect(remainingPlayers.length).to.be(2);
      expect(remainingPlayers).to.eql([player0, player2]);

      // player0 has ended
      gameState.getPlayer(player0.playerId).playerStatus =
        PlayerStatus.GAME_ENDED;
      remainingPlayers = gameState.getRemainingPlayers();
      expect(remainingPlayers.length).to.be(1);
      expect(remainingPlayers).to.eql([player2]);

      // player2 has ended, no remaining players
      gameState.getPlayer(player2.playerId).playerStatus =
        PlayerStatus.GAME_ENDED;
      remainingPlayers = gameState.getRemainingPlayers();
      expect(remainingPlayers.length).to.be(0);
      expect(remainingPlayers).to.eql([]);
    });
  });

  describe("getRemainingPlayersExceptActivePlayer", () => {
    it("Should return all players not in GAME_ENDED state, excluding active player", () => {
      gameState = testInitialGameState({ numPlayers: 4 });
      const player0 = gameState.players[0];
      const player1 = gameState.players[1];
      const player2 = gameState.players[2];
      const player3 = gameState.players[3];

      // active player is player0
      let remainingPlayersExceptActivePlayer = gameState.getRemainingPlayersExceptActivePlayer();
      expect(remainingPlayersExceptActivePlayer.length).to.be(3);
      expect(remainingPlayersExceptActivePlayer).to.eql([
        player1,
        player2,
        player3,
      ]);

      // next player
      gameState.nextPlayer();
      remainingPlayersExceptActivePlayer = gameState.getRemainingPlayersExceptActivePlayer();
      expect(remainingPlayersExceptActivePlayer.length).to.be(3);
      expect(remainingPlayersExceptActivePlayer).to.eql([
        player0,
        player2,
        player3,
      ]);

      // put player2 in end state
      gameState.getPlayer(player2.playerId).playerStatus =
        PlayerStatus.GAME_ENDED;
      remainingPlayersExceptActivePlayer = gameState.getRemainingPlayersExceptActivePlayer();
      expect(remainingPlayersExceptActivePlayer.length).to.be(2);
      expect(remainingPlayersExceptActivePlayer).to.eql([player0, player3]);

      // next player
      gameState.nextPlayer();
      remainingPlayersExceptActivePlayer = gameState.getRemainingPlayersExceptActivePlayer();
      expect(remainingPlayersExceptActivePlayer.length).to.be(2);
      expect(remainingPlayersExceptActivePlayer).to.eql([player0, player1]);

      // put active player in end state
      gameState.getPlayer(player3.playerId).playerStatus =
        PlayerStatus.GAME_ENDED;
      remainingPlayersExceptActivePlayer = gameState.getRemainingPlayersExceptActivePlayer();
      expect(remainingPlayersExceptActivePlayer.length).to.be(2);
      expect(remainingPlayersExceptActivePlayer).to.eql([player0, player1]);
    });
    it("Should return empty list of only remaining player is the active player", () => {
      gameState = testInitialGameState({ numPlayers: 4 });
      const player0 = gameState.players[0];
      const player1 = gameState.players[1];
      const player2 = gameState.players[2];
      const player3 = gameState.players[3];

      // active player is player0
      let remainingPlayersExceptActivePlayer = gameState.getRemainingPlayersExceptActivePlayer();
      expect(remainingPlayersExceptActivePlayer.length).to.be(3);
      expect(remainingPlayersExceptActivePlayer).to.eql([
        player1,
        player2,
        player3,
      ]);

      // put player2 in end state
      gameState.getPlayer(player1.playerId).playerStatus =
        PlayerStatus.GAME_ENDED;
      gameState.getPlayer(player2.playerId).playerStatus =
        PlayerStatus.GAME_ENDED;
      gameState.getPlayer(player3.playerId).playerStatus =
        PlayerStatus.GAME_ENDED;
      remainingPlayersExceptActivePlayer = gameState.getRemainingPlayersExceptActivePlayer();
      expect(remainingPlayersExceptActivePlayer.length).to.be(0);
      expect(remainingPlayersExceptActivePlayer).to.eql([]);
    });
  });

  describe("PLAY_CARD", () => {
    it("should be able to pay for the card to play it", () => {
      const card = Card.fromName(CardName.FARM);

      player.addCardToHand(gameState, card.name);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

      expect(gameState.getPlayableCards()).to.eql([]);

      player.gainResources(gameState, card.baseCost);
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, source: "HAND" },
      ]);

      [player, gameState] = multiStepGameInputTest(gameState, [
        playCardInput(CardName.FARM, { source: "HAND" }),
      ]);
      expect(player.cardsInHand.length).to.be(0);
      expect(player.hasCardInCity(CardName.FARM)).to.be(true);
    });

    it("should be able to play card from the station", () => {
      const card = Card.fromName(CardName.FARM);
      gameState = testInitialGameState({
        meadowCards: [
          CardName.CASTLE,
          CardName.CASTLE,
          CardName.CASTLE,
          CardName.CASTLE,
          CardName.CASTLE,
          CardName.CASTLE,
          CardName.CASTLE,
          CardName.CASTLE,
        ],
        stationCards: [card.name],
        trainCarTiles: [
          TrainCarTileName.ONE_BERRY,
          TrainCarTileName.ONE_PEBBLE,
          TrainCarTileName.ONE_RESIN,
        ],
        gameOptions: { newleaf: { station: true } },
      });
      player = gameState.getActivePlayer();
      player.gainResources(gameState, card.baseCost);
      expect(player.numCardsInHand).to.be(0);
      expect(player.hasCardInCity(CardName.FARM)).to.be(false);

      const replenishedStationCards = [
        CardName.KING,
        CardName.KING,
        CardName.KING,
      ];
      replenishedStationCards.forEach((card) => {
        gameState.deck.addToStack(card);
      });

      expect(() => {
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(CardName.FARM, { source: "HAND" }),
        ]);
      }).to.throwException(/does not exist in your hand/i);
      expect(() => {
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(CardName.FARM, { source: "MEADOW" }),
        ]);
      }).to.throwException(/does not exist in the meadow/i);

      expect(() => {
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(CardName.FARM, { source: "STATION" }),
        ]);
      }).to.throwException(/invalid station card index/i);

      [player, gameState] = multiStepGameInputTest(gameState, [
        playCardInput(CardName.FARM, { source: "STATION", stationIdx: 0 }),
      ]);

      expect(player.hasCardInCity(CardName.FARM)).to.be(true);
      expect(gameState.stationCards).to.eql(replenishedStationCards);
    });

    it("should be able to gain train tile resources", () => {
      const card = Card.fromName(CardName.FARM);
      gameState = testInitialGameState({
        meadowCards: [],
        stationCards: [card.name, card.name, card.name],
        trainCarTiles: [
          TrainCarTileName.ONE_BERRY,
          TrainCarTileName.ONE_PEBBLE,
          TrainCarTileName.ONE_RESIN,
        ],
        gameOptions: { newleaf: { station: true } },
      });

      player = gameState.getActivePlayer();
      player.gainResources(gameState, card.baseCost);
      expect(player.numCardsInHand).to.be(0);
      expect(player.hasCardInCity(CardName.FARM)).to.be(false);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        playCardInput(CardName.FARM, { source: "STATION", stationIdx: 0 }),
      ]);

      expect(player.hasCardInCity(CardName.FARM)).to.be(true);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
    });

    it("should be able to gain train tile resources for the wild tile", () => {
      const card = Card.fromName(CardName.FARM);
      gameState = testInitialGameState({
        meadowCards: [],
        stationCards: [card.name, card.name, card.name],
        trainCarTiles: [
          TrainCarTileName.ONE_ANY,
          TrainCarTileName.ONE_PEBBLE,
          TrainCarTileName.ONE_RESIN,
          TrainCarTileName.TWO_TWIG,
        ],
        gameOptions: { newleaf: { station: true } },
      });

      player = gameState.getActivePlayer();
      player.gainResources(gameState, card.baseCost);
      expect(player.numCardsInHand).to.be(0);
      expect(player.hasCardInCity(CardName.FARM)).to.be(false);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(gameState.trainCarTileStack?.peekAt(0)).to.be(
        TrainCarTileName.ONE_ANY
      );

      [player, gameState] = multiStepGameInputTest(gameState, [
        playCardInput(CardName.FARM, { source: "STATION", stationIdx: 0 }),
        {
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          options: ["BERRY", "TWIG", "RESIN", "PEBBLE"],
          prevInputType: GameInputType.PLAY_CARD,
          trainCarTileContext: TrainCarTileName.ONE_ANY,
          clientOptions: {
            selectedOption: "BERRY",
          },
        },
      ]);

      expect(player.hasCardInCity(CardName.FARM)).to.be(true);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      expect(gameState.trainCarTileStack?.peekAt(0)).to.be(
        TrainCarTileName.TWO_TWIG
      );
    });

    it("should be not be able to play cards if city is full", () => {
      const card = Card.fromName(CardName.FARM);

      const player = gameState.getActivePlayer();
      player.addCardToHand(gameState, card.name);
      player.gainResources(gameState, card.baseCost);

      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, source: "HAND" },
      ]);

      // Fill up city
      for (let i = 0; i < 15; i++) {
        player.addToCity(gameState, CardName.FARM);
      }
      expect(gameState.getPlayableCards()).to.eql([]);
    });

    it("should be able to play constructions if city is full (w/ crane)", () => {
      player.addCardToHand(gameState, CardName.FARM);
      player.gainResources(gameState, Card.fromName(CardName.FARM).baseCost);
      player.addCardToHand(gameState, CardName.MINE);
      player.gainResources(gameState, Card.fromName(CardName.MINE).baseCost);

      player.addCardToHand(gameState, CardName.WIFE);
      player.gainResources(gameState, Card.fromName(CardName.WIFE).baseCost);
      player.addCardToHand(gameState, CardName.KING);
      player.gainResources(gameState, Card.fromName(CardName.KING).baseCost);

      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, source: "HAND" },
        { card: CardName.MINE, source: "HAND" },
        { card: CardName.WIFE, source: "HAND" },
        { card: CardName.KING, source: "HAND" },
      ]);

      // Fill up city
      player.addToCity(gameState, CardName.CRANE);
      for (let i = 0; i < 14; i++) {
        player.addToCity(gameState, CardName.FARM);
      }

      // Only constructions
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, source: "HAND" },
        { card: CardName.MINE, source: "HAND" },
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
      player.addCardToHand(gameState, CardName.FARM);
      player.gainResources(gameState, Card.fromName(CardName.FARM).baseCost);
      player.addCardToHand(gameState, CardName.MINE);
      player.gainResources(gameState, Card.fromName(CardName.MINE).baseCost);

      player.addCardToHand(gameState, CardName.WIFE);
      player.gainResources(gameState, Card.fromName(CardName.WIFE).baseCost);
      player.addCardToHand(gameState, CardName.KING);
      player.gainResources(gameState, Card.fromName(CardName.KING).baseCost);

      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FARM, source: "HAND" },
        { card: CardName.MINE, source: "HAND" },
        { card: CardName.WIFE, source: "HAND" },
        { card: CardName.KING, source: "HAND" },
      ]);

      // Fill up city
      player.addToCity(gameState, CardName.INNKEEPER);
      for (let i = 0; i < 14; i++) {
        player.addToCity(gameState, CardName.FARM);
      }

      // Only critters
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.WIFE, source: "HAND" },
        { card: CardName.KING, source: "HAND" },
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
      player.addCardToHand(gameState, CardName.FOOL);
      player.gainResources(gameState, Card.fromName(CardName.FOOL).baseCost);

      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FOOL, source: "HAND" },
      ]);

      // Fill up city
      for (let i = 0; i < 15; i++) {
        player.addToCity(gameState, CardName.FARM);
      }
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.FOOL, source: "HAND" },
      ]);
    });

    it("should be able to play RUINS if city is full (w/ construction)", () => {
      player.addCardToHand(gameState, CardName.RUINS);
      player.gainResources(gameState, Card.fromName(CardName.RUINS).baseCost);

      // no construction to destroy
      expect(gameState.getPlayableCards()).to.eql([]);

      // Fill up city
      for (let i = 0; i < 15; i++) {
        player.addToCity(gameState, CardName.FARM);
      }
      expect(gameState.getPlayableCards()).to.eql([
        { card: CardName.RUINS, source: "HAND" },
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
          cardOptions: player.getPlayedCardForCardName(CardName.FARM),
          cardContext: CardName.RUINS,
          playedCardContext: undefined,
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [player.getPlayedCardForCardName(CardName.FARM)[0]],
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

      player.addToCity(gameState, CardName.UNIVERSITY);
      expect(gameState.getVisitableDestinationCards()).to.eql([]);

      player.addToCity(gameState, CardName.FARM);
      expect(gameState.getVisitableDestinationCards()).to.eql([
        player.getFirstPlayedCard(CardName.UNIVERSITY),
      ]);

      const player2 = gameState.players[1];
      player2.addToCity(gameState, CardName.QUEEN);
      player2.addToCity(gameState, CardName.INN);
      player2.addToCity(gameState, CardName.UNIVERSITY);

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

      player1.addToCity(gameState, CardName.MINE);
      player1.addToCity(gameState, CardName.MINE);
      player1.addToCity(gameState, CardName.FARM);
      player1.addToCity(gameState, CardName.FARM);
      player2.addToCity(gameState, CardName.MINE);
      player2.addToCity(gameState, CardName.MINE);
      player2.addToCity(gameState, CardName.FARM);
      player2.addToCity(gameState, CardName.FARM);

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

  describe("PLAY_TRAIN_TICKET", () => {
    beforeEach(() => {
      gameState = testInitialGameState({
        stationCards: [],
        gameOptions: { newleaf: { ticket: true } },
      });
      player = gameState.getActivePlayer();
    });

    it("should not be usable if there's no recallable workers", () => {
      expect(player.hasValidTrainTicket()).to.be(true);
      expect(
        gameState
          .getPossibleGameInputs()
          .find((input) => input.inputType === GameInputType.PLAY_TRAIN_TICKET)
      ).to.not.be.ok();
    });

    it("should prompt to move an existing worker and trigger the new placement", () => {
      gameState.locationsMap[LocationName.BASIC_ONE_STONE]!.push(
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_STONE);
      expect(player.hasValidTrainTicket()).to.be(true);
      expect(player.trainTicketStatus).to.be(
        TrainTicketStatus.VALID_FROM_WINTER
      );

      expect(player.numAvailableWorkers).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);

      const playTrainTicket = {
        inputType: GameInputType.PLAY_TRAIN_TICKET as const,
        clientOptions: {
          selectedOption: {
            location: LocationName.BASIC_ONE_STONE,
          },
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        playTrainTicket,
        {
          inputType: GameInputType.SELECT_WORKER_PLACEMENT,
          prevInput: playTrainTicket,
          prevInputType: GameInputType.PLAY_TRAIN_TICKET,
          mustSelectOne: true,
          options: [
            { location: LocationName.BASIC_ONE_BERRY },
            { location: LocationName.BASIC_ONE_BERRY_AND_ONE_CARD },
            { location: LocationName.BASIC_ONE_RESIN_AND_ONE_CARD },
            { location: LocationName.BASIC_THREE_TWIGS },
            { location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP },
            { location: LocationName.BASIC_TWO_RESIN },
            { location: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD },
            { location: LocationName.HAVEN },
          ],
          clientOptions: {
            selectedOption: {
              location: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD,
            },
          },
        },
      ]);
      expect(
        gameState.locationsMap[LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]
      ).to.eql([player.playerId]);
      expect(player.numAvailableWorkers).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
      expect(player.numCardsInHand).to.be(1);
      expect(player.hasValidTrainTicket()).to.be(false);
      expect(player.trainTicketStatus).to.be(
        TrainTicketStatus.VALID_FROM_SUMMER
      );

      expect(player.currentSeason).to.be(Season.WINTER);
      expect(player.hasValidTrainTicket()).to.be(false);
      player.nextSeason();
      expect(player.currentSeason).to.be(Season.SPRING);
      expect(player.hasValidTrainTicket()).to.be(false);
      player.nextSeason();
      expect(player.currentSeason).to.be(Season.SUMMER);
      expect(player.hasValidTrainTicket()).to.be(true);
    });

    it("should not allow moving the worker back to the same location", () => {
      gameState.locationsMap[LocationName.BASIC_ONE_STONE]!.push(
        player.playerId
      );
      gameState.locationsMap[LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]!.push(
        player.playerId
      );
      player.placeWorkerOnLocation(LocationName.BASIC_ONE_STONE);
      player.placeWorkerOnLocation(LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD);
      expect(player.numAvailableWorkers).to.be(0);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      expect(player.numCardsInHand).to.be(0);
      expect(player.hasValidTrainTicket()).to.be(true);
      expect(player.trainTicketStatus).to.be(
        TrainTicketStatus.VALID_FROM_WINTER
      );

      const playTrainTicket = {
        inputType: GameInputType.PLAY_TRAIN_TICKET as const,
        clientOptions: {
          selectedOption: {
            location: LocationName.BASIC_ONE_STONE,
          },
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        playTrainTicket,
        {
          inputType: GameInputType.SELECT_WORKER_PLACEMENT,
          prevInput: playTrainTicket,
          prevInputType: GameInputType.PLAY_TRAIN_TICKET,
          trainTicketContext: true,
          mustSelectOne: true,
          options: [
            { location: LocationName.BASIC_ONE_BERRY },
            { location: LocationName.BASIC_ONE_BERRY_AND_ONE_CARD },
            { location: LocationName.BASIC_ONE_RESIN_AND_ONE_CARD },
            { location: LocationName.BASIC_THREE_TWIGS },
            { location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP },
            { location: LocationName.BASIC_TWO_RESIN },
            { location: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD },
            { location: LocationName.HAVEN },
          ],
          clientOptions: {
            selectedOption: {
              location: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD,
            },
          },
        },
      ]);
      expect(
        gameState.locationsMap[LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]
      ).to.eql([player.playerId, player.playerId]);
      expect(player.numAvailableWorkers).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
      expect(player.numCardsInHand).to.be(1);
    });
  });

  describe("PREPARE_FOR_SEASON", () => {
    it("should activate production in WINTER", () => {
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.MINE);
      player.addToCity(gameState, CardName.MINE);
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
      player.addToCity(gameState, CardName.MONK);
      player.addToCity(gameState, CardName.DOCTOR);
      player.addToCity(gameState, CardName.WOODCARVER);
      player.addToCity(gameState, CardName.PEDDLER);

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
      player.addToCity(gameState, CardName.MONK);
      player.addToCity(gameState, CardName.DOCTOR);
      player.addToCity(gameState, CardName.WOODCARVER);
      player.addToCity(gameState, CardName.PEDDLER);
      player.addToCity(gameState, CardName.FARM);

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
      player.addToCity(gameState, CardName.MONK);
      player.addToCity(gameState, CardName.DOCTOR);
      player.addToCity(gameState, CardName.WOODCARVER);
      player.addToCity(gameState, CardName.PEDDLER);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.MINE);

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
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.MINE);
      player.addToCity(gameState, CardName.MINE);

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

    it("SPRING: should draw 2 cards from the meadow", () => {
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.MINE);
      player.addToCity(gameState, CardName.MINE);

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

      gameState.meadowCards.push(
        CardName.FARM,
        CardName.MINE,
        CardName.QUEEN,
        CardName.KING,
        CardName.CASTLE,
        CardName.TEACHER,
        CardName.HISTORIAN,
        CardName.INN
      );

      const topOfDeck = [CardName.LOOKOUT, CardName.POST_OFFICE];
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

    it("SPRING: should only pick and keep 1 card if at max hand size - 1", () => {
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.MINE);
      player.addToCity(gameState, CardName.MINE);

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
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.HUSBAND);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.CASTLE);
      player.addCardToHand(gameState, CardName.PALACE);
      player.addCardToHand(gameState, CardName.KING);
      player.addCardToHand(gameState, CardName.EVERTREE);

      gameState.meadowCards.push(
        CardName.FARM,
        CardName.MINE,
        CardName.QUEEN,
        CardName.KING,
        CardName.CASTLE,
        CardName.TEACHER,
        CardName.HISTORIAN,
        CardName.INN
      );

      const topOfDeck = [CardName.LOOKOUT, CardName.POST_OFFICE];
      topOfDeck.reverse();
      topOfDeck.forEach((x) => gameState.deck.addToStack(x));

      expect(player.currentSeason).to.be(Season.SPRING);
      expect(player.cardsInHand).to.eql([
        CardName.FARM,
        CardName.HUSBAND,
        CardName.WIFE,
        CardName.CASTLE,
        CardName.PALACE,
        CardName.KING,
        CardName.EVERTREE,
      ]);

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
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [CardName.QUEEN],
          },
        },
      ]);

      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.numAvailableWorkers).to.be(4);
      expect(player.cardsInHand).to.eql([
        CardName.FARM,
        CardName.HUSBAND,
        CardName.WIFE,
        CardName.CASTLE,
        CardName.PALACE,
        CardName.KING,
        CardName.EVERTREE,
        CardName.QUEEN,
      ]);
      expect(gameState.meadowCards).to.eql([
        CardName.FARM,
        CardName.MINE,
        CardName.KING,
        CardName.CASTLE,
        CardName.TEACHER,
        CardName.HISTORIAN,
        CardName.INN,
        CardName.LOOKOUT,
      ]);
    });

    it("SPRING: should not take cards from meadow if already at max hand size", () => {
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.MINE);
      player.addToCity(gameState, CardName.MINE);

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
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.FARM);

      gameState.meadowCards.push(
        CardName.FARM,
        CardName.MINE,
        CardName.QUEEN,
        CardName.KING,
        CardName.CASTLE,
        CardName.TEACHER,
        CardName.HISTORIAN,
        CardName.INN
      );

      const topOfDeck = [CardName.LOOKOUT, CardName.POST_OFFICE];
      topOfDeck.reverse();
      topOfDeck.forEach((x) => gameState.deck.addToStack(x));

      expect(player.currentSeason).to.be(Season.SPRING);
      expect(player.cardsInHand).to.eql([
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
      ]);

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
        { inputType: GameInputType.PREPARE_FOR_SEASON },
      ]);

      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.numAvailableWorkers).to.be(4);
      expect(player.cardsInHand).to.eql([
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
      ]);
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
      gameState.players[0].addToCity(gameState, CardName.FARM); // 1
      gameState.players[0].addToCity(gameState, CardName.QUEEN); // 4
      gameState.players[0].addToCity(gameState, CardName.KING); // 4 + 0 events
      gameState.players[0].gainResources(gameState, {
        [ResourceType.VP]: 5,
      });

      gameState.players[1].addToCity(gameState, CardName.ARCHITECT); // 2 + 2
      gameState.players[1].addToCity(gameState, CardName.HISTORIAN); // 1
      gameState.players[1].addToCity(gameState, CardName.HUSBAND); // 2
      gameState.players[1].addToCity(gameState, CardName.WIFE); // 2 + 3 (for husband)
      gameState.players[1].gainResources(gameState, {
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
