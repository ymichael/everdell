import expect from "expect.js";
import { Location } from "./location";
import { GameState } from "./gameState";
import { Player } from "./player";
import { testInitialGameState, multiStepGameInputTest } from "./testHelpers";
import {
  Season,
  LocationName,
  LocationType,
  GameInputType,
  GameInputPlaceWorker,
  CardName,
  TrainCarTileName,
  ResourceType,
  VisitorName,
} from "./types";

const placeWorkerInput = (location: LocationName): GameInputPlaceWorker => {
  return {
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location,
    },
  };
};

describe("Location", () => {
  let gameState: GameState;
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState({ meadowCards: [] });
    player = gameState.getActivePlayer();
  });

  describe("fromName", () => {
    it("should return the expect Location instances", () => {
      Object.values(LocationName).forEach((loc) => {
        expect(Location.fromName(loc as LocationName).name).to.be(loc);
      });
    });
  });

  describe("Available workers", () => {
    it("should not allow players w/o workers", () => {
      const location = Location.fromName(LocationName.BASIC_ONE_BERRY);
      const gameInput = placeWorkerInput(location.name);
      expect(location.canPlay(gameState, gameInput)).to.be(true);

      const numAvailableWorkers = player.numAvailableWorkers;
      for (let i = 0; i < numAvailableWorkers; i++) {
        // Place workers on unlimited location
        player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
      }
      expect(location.canPlay(gameState, gameInput)).to.be(false);
    });
  });

  describe("Location Occupancy", () => {
    it("should allow unlimited workers on BASIC_ONE_BERRY", () => {
      const location = Location.fromName(LocationName.BASIC_ONE_BERRY);
      const gameInput = placeWorkerInput(location.name);

      expect(location.canPlay(gameState, gameInput)).to.be(true);

      [, gameState] = multiStepGameInputTest(gameState, [gameInput]);
      expect(location.canPlay(gameState, gameInput)).to.be(true);
    });

    it("should not allow unlimited workers on BASIC_ONE_BERRY_AND_ONE_CARD", () => {
      const location = Location.fromName(
        LocationName.BASIC_ONE_BERRY_AND_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);

      expect(location.canPlay(gameState, gameInput)).to.be(true);

      [, gameState] = multiStepGameInputTest(gameState, [gameInput]);
      expect(location.canPlay(gameState, gameInput)).to.be(false);
    });

    it("should allow 2 workers on FOREST_TWO_BERRY_ONE_CARD if 4+ players", () => {
      const location = Location.fromName(
        LocationName.FOREST_TWO_BERRY_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);

      gameState = testInitialGameState({ numPlayers: 4 });
      gameState.locationsMap[LocationName.FOREST_TWO_BERRY_ONE_CARD] = [];

      expect(location.canPlay(gameState, gameInput)).to.be(true);

      [, gameState] = multiStepGameInputTest(gameState, [gameInput]);
      expect(location.canPlay(gameState, gameInput)).to.be(true);

      [, gameState] = multiStepGameInputTest(gameState, [gameInput]);
      expect(location.canPlay(gameState, gameInput)).to.be(false);
    });

    it("should NOT allow 2 workers from the same player on FOREST_TWO_BERRY_ONE_CARD if 4+ players", () => {
      const location = Location.fromName(
        LocationName.FOREST_TWO_BERRY_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);

      gameState = testInitialGameState({ numPlayers: 4 });
      gameState.locationsMap[LocationName.FOREST_TWO_BERRY_ONE_CARD] = [];

      player = gameState.getActivePlayer();

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      // Next player can visit location
      expect(location.canPlay(gameState, gameInput)).to.be(true);

      gameState.nextPlayer();
      gameState.nextPlayer();
      gameState.nextPlayer();
      expect(gameState.getActivePlayer().playerId).to.be(player.playerId);

      // Same player cannot
      expect(location.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);
      }).to.throwException(/Cannot visit the same forest location twice/);
    });
  });

  describe("BASIC_ONE_BERRY_AND_ONE_CARD", () => {
    it("should give the player 1 berry and on card after placing worker", () => {
      const location = Location.fromName(
        LocationName.BASIC_ONE_BERRY_AND_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);

      expect(location.canPlay(gameState, gameInput)).to.be(true);

      gameState.deck.addToStack(CardName.FARM);

      expect(player.numAvailableWorkers).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.numCardsInHand).to.be(0);

      const nextGameState = gameState.next(gameInput);
      expect(location.canPlay(nextGameState, gameInput)).to.be(false);
      expect(location.canPlay(nextGameState, gameInput)).to.be(false);

      player = nextGameState.getPlayer(player.playerId);
      expect(player.numAvailableWorkers).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      expect(player.cardsInHand).to.eql([CardName.FARM]);
    });
  });

  describe("FOREST_TWO_WILD", () => {
    it("player can specify 2 wild resources", () => {
      const location = Location.fromName(LocationName.FOREST_TWO_WILD);
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.FOREST_TWO_WILD] = [];

      expect(location.canPlay(gameState, gameInput)).to.be(true);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: false,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_TWO_WILD,
          maxResources: 2,
          minResources: 2,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
              [ResourceType.RESIN]: 1,
            },
          },
        },
      ]);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
    });
  });

  describe("FOREST_TWO_CARDS_ONE_WILD", () => {
    it("player draws 2 cards + gets 1 wild resource", () => {
      const location = Location.fromName(
        LocationName.FOREST_TWO_CARDS_ONE_WILD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.FOREST_TWO_CARDS_ONE_WILD] = [];

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.numCardsInHand).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_TWO_CARDS_ONE_WILD,
          options: [
            ResourceType.BERRY,
            ResourceType.TWIG,
            ResourceType.RESIN,
            ResourceType.PEBBLE,
          ],
          clientOptions: {
            selectedOption: ResourceType.TWIG,
          },
        },
      ]);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.numCardsInHand).to.be(2);
    });
  });

  describe("FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD", () => {
    it("player can discard cards and get resources", () => {
      const location = Location.fromName(
        LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD
      ] = [];
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.HUSBAND);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.WIFE);

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.numCardsInHand).to.be(4);
      expect(gameState.discardPile.length).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.DISCARD_CARDS,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext:
            LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
          minCards: 0,
          maxCards: 3,
          clientOptions: {
            cardsToDiscard: [CardName.FARM, CardName.WIFE, CardName.WIFE],
          },
        },
        {
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: false,
          prevInputType: GameInputType.DISCARD_CARDS,
          locationContext:
            LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
          maxResources: 3,
          minResources: 3,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
              [ResourceType.RESIN]: 2,
            },
          },
        },
      ]);

      expect(gameState.discardPile.length).to.be(3);
      expect([CardName.WIFE, CardName.WIFE, CardName.FARM]).to.eql([
        gameState.discardPile.drawInner(),
        gameState.discardPile.drawInner(),
        gameState.discardPile.drawInner(),
      ]);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(2);
      expect(player.numCardsInHand).to.be(1);
    });

    it("player cannot discard more than 3 cards to get resources", () => {
      const location = Location.fromName(
        LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD
      ] = [];
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.HUSBAND);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.WIFE);

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.numCardsInHand).to.be(4);
      expect(gameState.discardPile.length).to.be(0);

      expect(() => {
        multiStepGameInputTest(gameState, [
          gameInput,
          {
            inputType: GameInputType.DISCARD_CARDS,
            prevInputType: GameInputType.PLACE_WORKER,
            locationContext:
              LocationName.FOREST_DISCARD_UP_TO_THREE_CARDS_TO_GAIN_WILD_PER_CARD,
            minCards: 0,
            maxCards: 3,
            clientOptions: {
              cardsToDiscard: [
                CardName.FARM,
                CardName.WIFE,
                CardName.WIFE,
                CardName.HUSBAND,
              ],
            },
          },
        ]);
      }).to.throwException(/Discarding too many cards/i);
    });
  });

  describe("FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD", () => {
    it("player can visit FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD", () => {
      const location = Location.fromName(
        LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD
      ] = [];
      player.addCardToHand(gameState, CardName.BARD);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.FOOL);
      player.addCardToHand(gameState, CardName.BARGE_TOAD);
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.HUSBAND);

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.numCardsInHand).to.be(6);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.DISCARD_CARDS,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext:
            LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD,
          minCards: 0,
          maxCards: 8,
          clientOptions: {
            cardsToDiscard: [
              CardName.FARM,
              CardName.FOOL,
              CardName.INN,
              CardName.BARD,
            ],
          },
        },
      ]);

      // player gained 8 cards but already had 2 in hand + can't have more than 8 cards in hand
      expect(player.numCardsInHand).to.be(8);
    });
  });

  describe(LocationName.FOREST_ACTIVATE_2_PRODUCTION, () => {
    const name = LocationName.FOREST_ACTIVATE_2_PRODUCTION;
    it("cannot be played if player has no PRODUCTION", () => {
      gameState.locationsMap[name] = [];
      expect(() => {
        multiStepGameInputTest(gameState, [placeWorkerInput(name)]);
      }).to.throwException(/no useful production cards to activate/i);
    });

    it("should allow the player to active 2 PRODUCTION", () => {
      gameState.locationsMap[name] = [];

      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.MINE);
      [player, gameState] = multiStepGameInputTest(
        gameState,
        [placeWorkerInput(name)],
        { autoAdvance: true }
      );

      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
    });

    it("should allow the player to choose which PRODUCTION to activate", () => {
      gameState.locationsMap[name] = [];

      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.MINE);
      player.addToCity(gameState, CardName.CHIP_SWEEP);

      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

      [player, gameState] = multiStepGameInputTest(
        gameState,
        [
          placeWorkerInput(name),
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.PLACE_WORKER,
            cardOptions: [
              player.getFirstPlayedCard(CardName.FARM),
              player.getFirstPlayedCard(CardName.MINE),
              player.getFirstPlayedCard(CardName.CHIP_SWEEP),
            ],
            locationContext: name,
            maxToSelect: 2,
            minToSelect: 2,
            clientOptions: {
              selectedCards: [
                player.getFirstPlayedCard(CardName.FARM),
                player.getFirstPlayedCard(CardName.MINE),
              ],
            },
          },
        ],
        { autoAdvance: true }
      );

      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
    });
  });

  describe(LocationName.FOREST_RESIN_PEBBLE_OR_FOUR_CARDS, () => {
    const name = LocationName.FOREST_RESIN_PEBBLE_OR_FOUR_CARDS;
    it("should allow the player to draw 4 CARD", () => {
      gameState.locationsMap[name] = [];
      expect(player.numCardsInHand).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        placeWorkerInput(name),
        {
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: name,
          options: ["1 RESIN & 1 PEBBLE", "4 CARD"],
          clientOptions: {
            selectedOption: "4 CARD",
          },
        },
      ]);

      expect(player.numCardsInHand).to.be(4);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
    });

    it("should allow the player to gain 1 RESIN & 1 PEBBLE", () => {
      gameState.locationsMap[name] = [];
      expect(player.numCardsInHand).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        placeWorkerInput(name),
        {
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: name,
          options: ["1 RESIN & 1 PEBBLE", "4 CARD"],
          clientOptions: {
            selectedOption: "1 RESIN & 1 PEBBLE",
          },
        },
      ]);

      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.numCardsInHand).to.be(0);
    });
  });

  describe(LocationName.FOREST_DISCARD_2_MEADOW_DRAW_2_MEADOW_GAIN_ANY, () => {
    const name = LocationName.FOREST_DISCARD_2_MEADOW_DRAW_2_MEADOW_GAIN_ANY;

    it("should allow player to discard 2, draw 2 from the Meadow and gain 1 ANY", () => {
      gameState.locationsMap[name] = [];

      gameState.meadowCards.push(
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.MINE,
        CardName.MINE,
        CardName.MINE,
        CardName.MINE
      );

      gameState.deck.addToStack(CardName.RANGER);
      gameState.deck.addToStack(CardName.RANGER);

      expect(player.numCardsInHand).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      [player, gameState] = multiStepGameInputTest(gameState, [
        placeWorkerInput(name),
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.PLACE_WORKER,
          cardOptions: gameState.meadowCards,
          maxToSelect: 2,
          minToSelect: 2,
          locationContext: name,
          clientOptions: {
            selectedCards: [CardName.MINE, CardName.FARM],
          },
        },
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.SELECT_CARDS,
          cardOptions: [
            CardName.FARM,
            CardName.FARM,
            CardName.FARM,
            CardName.MINE,
            CardName.MINE,
            CardName.MINE,
            CardName.RANGER,
            CardName.RANGER,
          ],
          maxToSelect: 2,
          minToSelect: 2,
          locationContext: name,
          clientOptions: {
            selectedCards: [CardName.RANGER, CardName.RANGER],
          },
        },
        {
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: GameInputType.SELECT_CARDS,
          options: ["BERRY", "TWIG", "RESIN", "PEBBLE"],
          locationContext: name,
          clientOptions: { selectedOption: "PEBBLE" },
        },
      ]);
      expect(player.numCardsInHand).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
    });
  });

  describe("HAVEN", () => {
    it("player can visit the haven", () => {
      const location = Location.fromName(LocationName.HAVEN);
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.HAVEN] = [];
      player.addCardToHand(gameState, CardName.BARD);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.FOOL);
      player.addCardToHand(gameState, CardName.BARGE_TOAD);
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.HUSBAND);

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.numCardsInHand).to.be(6);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.DISCARD_CARDS,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.HAVEN,
          minCards: 0,
          maxCards: player.numCardsInHand,
          clientOptions: {
            cardsToDiscard: [
              CardName.FARM,
              CardName.FOOL,
              CardName.INN,
              CardName.BARD,
            ],
          },
        },
        {
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: false,
          prevInputType: GameInputType.DISCARD_CARDS,
          locationContext: LocationName.HAVEN,
          maxResources: 2,
          minResources: 2,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
              [ResourceType.RESIN]: 1,
            },
          },
        },
      ]);

      expect(gameState.getActivePlayer().playerId).not.to.be.eql(
        player.playerId
      );

      // player gained 8 cards but already had 2 in hand + can't have more than 8 cards in hand
      expect(player.numCardsInHand).to.be(2);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
    });
  });

  describe("FOREST_COPY_BASIC_ONE_CARD", () => {
    it("player can visit FOREST_COPY_BASIC_ONE_CARD", () => {
      const location = Location.fromName(
        LocationName.FOREST_COPY_BASIC_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.FOREST_COPY_BASIC_ONE_CARD] = [];
      player.addCardToHand(gameState, CardName.BARD);
      player.addCardToHand(gameState, CardName.INN);

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_COPY_BASIC_ONE_CARD,
          locationOptions: Location.byType(LocationType.BASIC),
          clientOptions: {
            selectedLocation: LocationName.BASIC_ONE_BERRY,
          },
        },
      ]);

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      expect(player.numCardsInHand).to.be(3);
    });
  });

  describe(LocationName.FOREST_PAY_THREE_TWIG_GAIN_THREE_ANY, () => {
    const name = LocationName.FOREST_PAY_THREE_TWIG_GAIN_THREE_ANY;
    it("should allow player to pay 3 TWIG to gain 2 ANY", () => {
      gameState.locationsMap[name] = [];
      player.gainResources(gameState, { [ResourceType.TWIG]: 3 });
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(3);

      [player, gameState] = multiStepGameInputTest(gameState, [
        placeWorkerInput(name),
        {
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: false,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_PAY_THREE_TWIG_GAIN_THREE_ANY,
          maxResources: 3,
          minResources: 3,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
              [ResourceType.RESIN]: 1,
              [ResourceType.PEBBLE]: 1,
            },
          },
        },
      ]);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
    });

    it("should not allow player to visit if they don't have 3 TWIG", () => {
      gameState.locationsMap[name] = [];

      expect(() => {
        gameState.next(placeWorkerInput(name));
      }).to.throwException(/Must be able to play 3 TWIG/i);
    });
  });

  describe("FOREST_COPY_ANY_FOREST_LOCATION", () => {
    it("player can visit FOREST_COPY_ANY_FOREST_LOCATION", () => {
      const location = Location.fromName(
        LocationName.FOREST_COPY_ANY_FOREST_LOCATION
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.FOREST_COPY_ANY_FOREST_LOCATION] = [];

      player.addCardToHand(gameState, CardName.BARD);
      player.addCardToHand(gameState, CardName.INN);

      expect(location.canPlay(gameState, gameInput)).to.be(true);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_COPY_ANY_FOREST_LOCATION,
          locationOptions: Location.byType(LocationType.FOREST).filter(
            (loc) => loc != LocationName.FOREST_COPY_ANY_FOREST_LOCATION
          ),
          clientOptions: {
            selectedLocation: LocationName.FOREST_FOUR_TWIG,
          },
        },
      ]);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(4);
      expect(player.numCardsInHand).to.be(2);
    });
    it("player cannot copy FOREST_COPY_ANY_FOREST_LOCATION by visiting it", () => {
      const location = Location.fromName(
        LocationName.FOREST_COPY_ANY_FOREST_LOCATION
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.FOREST_COPY_ANY_FOREST_LOCATION] = [];

      gameState = gameState.next(gameInput);
      expect(() => {
        gameState.next({
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_COPY_ANY_FOREST_LOCATION,
          locationOptions: Location.byType(LocationType.FOREST).filter(
            (loc) => loc != LocationName.FOREST_COPY_ANY_FOREST_LOCATION
          ),
          clientOptions: {
            selectedLocation: LocationName.FOREST_COPY_ANY_FOREST_LOCATION,
          },
        });
      }).to.throwException(/Invalid location selected/i);
    });
    it("player cannot copy a basic location", () => {
      const location = Location.fromName(
        LocationName.FOREST_COPY_ANY_FOREST_LOCATION
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.FOREST_COPY_ANY_FOREST_LOCATION] = [];

      gameState = gameState.next(gameInput);
      expect(() => {
        gameState.next({
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.FOREST_COPY_ANY_FOREST_LOCATION,
          locationOptions: Location.byType(LocationType.FOREST).filter(
            (loc) => loc != LocationName.FOREST_COPY_ANY_FOREST_LOCATION
          ),
          clientOptions: {
            selectedLocation: LocationName.BASIC_ONE_BERRY,
          },
        });
      }).to.throwException(/Invalid location selected/i);

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
    });
  });

  describe("FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS", () => {
    it("player can visit FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS (only one playable card)", () => {
      const meadow = [
        CardName.HUSBAND,
        CardName.RANGER,
        CardName.WIFE,
        CardName.CEMETARY,
        CardName.THEATRE,
        CardName.EVERTREE,
        CardName.HUSBAND,
        CardName.HUSBAND,
      ];
      gameState = testInitialGameState({ meadowCards: meadow });

      const location = Location.fromName(
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      );

      player = gameState.getActivePlayer();
      player.gainResources(gameState, { [ResourceType.BERRY]: 5 });
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(5);
      expect(player.hasCardInCity(CardName.HUSBAND)).to.be(false);

      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ] = [];

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.PLACE_WORKER,
        cardOptions: meadow,
        maxToSelect: 2,
        minToSelect: 2,
        locationContext:
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
        clientOptions: {
          selectedCards: [CardName.HUSBAND, CardName.EVERTREE],
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.SELECT_CARDS,
          prevInput: selectCardsInput,
          cardOptions: [CardName.HUSBAND],
          maxToSelect: 1,
          minToSelect: 1,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          cardOptionsUnfiltered: [CardName.HUSBAND, CardName.EVERTREE],
          clientOptions: {
            selectedCards: [CardName.HUSBAND],
          },
        },
        {
          inputType: GameInputType.SELECT_PAYMENT_FOR_CARD,
          prevInputType: GameInputType.SELECT_CARDS,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          card: CardName.HUSBAND,
          clientOptions: {
            card: CardName.HUSBAND,
            paymentOptions: { resources: { [ResourceType.BERRY]: 2 } },
          },
        },
      ]);

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
      expect(player.cardsInHand).to.eql([CardName.EVERTREE]);
      expect(player.hasCardInCity(CardName.HUSBAND)).to.be(true);
    });

    it("player can visit FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS (2 playable cards)", () => {
      const meadow = [
        CardName.HUSBAND,
        CardName.RANGER,
        CardName.WIFE,
        CardName.CEMETARY,
        CardName.THEATRE,
        CardName.EVERTREE,
        CardName.HUSBAND,
        CardName.HUSBAND,
      ];
      gameState = testInitialGameState({ meadowCards: meadow });

      const location = Location.fromName(
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      );

      player = gameState.getActivePlayer();
      player.gainResources(gameState, { [ResourceType.BERRY]: 5 });
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(5);
      expect(player.hasCardInCity(CardName.HUSBAND)).to.be(false);

      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ] = [];

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.PLACE_WORKER,
        cardOptions: meadow,
        maxToSelect: 2,
        minToSelect: 2,
        locationContext:
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
        clientOptions: {
          selectedCards: [CardName.HUSBAND, CardName.WIFE],
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.SELECT_CARDS,
          prevInput: selectCardsInput,
          cardOptions: [CardName.HUSBAND, CardName.WIFE],
          maxToSelect: 1,
          minToSelect: 1,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          cardOptionsUnfiltered: [CardName.HUSBAND, CardName.WIFE],
          clientOptions: {
            selectedCards: [CardName.HUSBAND],
          },
        },
        {
          inputType: GameInputType.SELECT_PAYMENT_FOR_CARD,
          prevInputType: GameInputType.SELECT_CARDS,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          card: CardName.HUSBAND,
          clientOptions: {
            card: CardName.HUSBAND,
            paymentOptions: { resources: { [ResourceType.BERRY]: 2 } },
          },
        },
      ]);

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
      expect(player.cardsInHand).to.eql([CardName.WIFE]);
      expect(player.hasCardInCity(CardName.HUSBAND)).to.be(true);
    });

    it("player can visit FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS (at max hand)", () => {
      const meadow = [
        CardName.HUSBAND,
        CardName.INNKEEPER,
        CardName.WIFE,
        CardName.CEMETARY,
        CardName.THEATRE,
        CardName.EVERTREE,
        CardName.HUSBAND,
        CardName.HUSBAND,
      ];
      gameState = testInitialGameState({ meadowCards: meadow });

      const location = Location.fromName(
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      );

      player = gameState.getActivePlayer();
      const cardsInHand = [
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
      ];

      // Player hand is full
      player.cardsInHand = cardsInHand;

      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ] = [];

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.PLACE_WORKER,
        cardOptions: meadow,
        maxToSelect: 2,
        minToSelect: 2,
        locationContext:
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
        clientOptions: {
          selectedCards: [CardName.HUSBAND, CardName.INNKEEPER],
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.SELECT_CARDS,
          prevInput: selectCardsInput,
          cardOptions: [CardName.INNKEEPER],
          maxToSelect: 1,
          minToSelect: 1,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          cardOptionsUnfiltered: [CardName.HUSBAND, CardName.INNKEEPER],
          clientOptions: {
            selectedCards: [CardName.INNKEEPER],
          },
        },
      ]);

      expect(player.cardsInHand).to.eql(cardsInHand);
      expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(true);
    });

    it("if unique card already in city, can take from meadow but can't play", () => {
      const meadow = [
        CardName.HUSBAND,
        CardName.RANGER,
        CardName.WIFE,
        CardName.CEMETARY,
        CardName.THEATRE,
        CardName.EVERTREE,
        CardName.HUSBAND,
        CardName.HUSBAND,
      ];
      gameState = testInitialGameState({ meadowCards: meadow });

      const location = Location.fromName(
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      );

      player = gameState.getActivePlayer();
      player.addToCity(gameState, CardName.RANGER);
      player.gainResources(gameState, { [ResourceType.BERRY]: 5 });
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(5);
      expect(player.hasCardInCity(CardName.HUSBAND)).to.be(false);

      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ] = [];

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.PLACE_WORKER,
        cardOptions: meadow,
        maxToSelect: 2,
        minToSelect: 2,
        locationContext:
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
        clientOptions: {
          selectedCards: [CardName.HUSBAND, CardName.RANGER],
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.SELECT_CARDS,
          prevInput: selectCardsInput,
          cardOptions: [CardName.HUSBAND],
          maxToSelect: 1,
          minToSelect: 1,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          cardOptionsUnfiltered: [CardName.HUSBAND, CardName.RANGER],
          clientOptions: {
            selectedCards: [CardName.HUSBAND],
          },
        },
        {
          inputType: GameInputType.SELECT_PAYMENT_FOR_CARD,
          prevInputType: GameInputType.SELECT_CARDS,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          card: CardName.HUSBAND,
          clientOptions: {
            card: CardName.HUSBAND,
            paymentOptions: { resources: { [ResourceType.BERRY]: 2 } },
          },
        },
      ]);

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
      expect(player.cardsInHand).to.eql([CardName.RANGER]);
      expect(player.hasCardInCity(CardName.HUSBAND)).to.be(true);
    });

    it("cannot visit if player cannot play any meadow cards for 1 less", () => {
      const meadow = [
        CardName.HUSBAND,
        CardName.RANGER,
        CardName.WIFE,
        CardName.CEMETARY,
        CardName.THEATRE,
        CardName.EVERTREE,
        CardName.HUSBAND,
        CardName.HUSBAND,
      ];
      gameState = testInitialGameState({ meadowCards: meadow });

      const location = Location.fromName(
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      );

      player = gameState.getActivePlayer();

      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ] = [];

      expect(() => gameState.next(gameInput)).to.throwException(/cannot play/i);
    });

    it("cannot visit edge case", () => {
      const meadow = [
        // No space for these
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,

        // Cannot afford
        CardName.WANDERER,
      ];

      gameState = testInitialGameState({ meadowCards: meadow });
      const location = Location.fromName(
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      );

      player = gameState.getActivePlayer();
      player.gainResources(gameState, {
        [ResourceType.TWIG]: 5,
        [ResourceType.PEBBLE]: 5,
        [ResourceType.RESIN]: 5,
      });
      for (let i = 0; i < 15; i++) {
        player.addToCity(gameState, CardName.HUSBAND);
      }

      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ] = [];
      expect(() => gameState.next(gameInput)).to.throwException(/cannot play/i);
    });

    it("cannot visit if player has no space in city for cards in meadow", () => {
      const meadow = [
        CardName.HUSBAND,
        CardName.RANGER,
        CardName.FARM,
        CardName.CEMETARY,
        CardName.THEATRE,
        CardName.EVERTREE,
        CardName.HUSBAND,
        CardName.HUSBAND,
      ];
      gameState = testInitialGameState({ meadowCards: meadow });

      const location = Location.fromName(
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      );

      player = gameState.getActivePlayer();
      player.addToCityMulti(gameState, [
        CardName.HUSBAND,
        CardName.RANGER,
        CardName.FARM,
        CardName.CEMETARY,
        CardName.THEATRE,
        CardName.EVERTREE,
        CardName.HUSBAND,
        CardName.HUSBAND,
        CardName.HUSBAND,
        CardName.POSTAL_PIGEON,
        CardName.FARM,
        CardName.FARM,
        CardName.POSTAL_PIGEON,
        CardName.POSTAL_PIGEON,
        CardName.HUSBAND,
      ]);
      player.gainResources(gameState, { [ResourceType.BERRY]: 5 });

      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ] = [];

      expect(() => gameState.next(gameInput)).to.throwException(/cannot play/i);
    });

    it("can visit if city is full but there is a playable card in meadow", () => {
      const meadow = [
        CardName.HUSBAND,
        CardName.RANGER,
        CardName.WIFE,
        CardName.CEMETARY,
        CardName.THEATRE,
        CardName.EVERTREE,
        CardName.HUSBAND,
        CardName.HUSBAND,
      ];
      gameState = testInitialGameState({ meadowCards: meadow });

      const location = Location.fromName(
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      );

      player = gameState.getActivePlayer();
      player.addToCityMulti(gameState, [
        CardName.HUSBAND,
        CardName.RANGER,
        CardName.FARM,
        CardName.CEMETARY,
        CardName.THEATRE,
        CardName.EVERTREE,
        CardName.HUSBAND,
        CardName.HUSBAND,
        CardName.HUSBAND,
        CardName.POSTAL_PIGEON,
        CardName.FARM,
        CardName.FARM,
        CardName.POSTAL_PIGEON,
        CardName.POSTAL_PIGEON,
        CardName.HUSBAND,
      ]);
      player.gainResources(gameState, { [ResourceType.BERRY]: 5 });

      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ] = [];

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.PLACE_WORKER,
        cardOptions: meadow,
        maxToSelect: 2,
        minToSelect: 2,
        locationContext:
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
        clientOptions: {
          selectedCards: [CardName.WIFE, CardName.THEATRE],
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.SELECT_CARDS,
          prevInput: selectCardsInput,
          cardOptions: [CardName.WIFE],
          maxToSelect: 1,
          minToSelect: 1,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          cardOptionsUnfiltered: [CardName.WIFE, CardName.THEATRE],
          clientOptions: {
            selectedCards: [CardName.WIFE],
          },
        },
        {
          inputType: GameInputType.SELECT_PAYMENT_FOR_CARD,
          prevInputType: GameInputType.SELECT_CARDS,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          card: CardName.WIFE,
          clientOptions: {
            card: CardName.WIFE,
            paymentOptions: { resources: { [ResourceType.BERRY]: 1 } },
          },
        },
      ]);

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(4);
      expect(player.cardsInHand).to.eql([CardName.THEATRE]);
      expect(player.hasCardInCity(CardName.WIFE)).to.be(true);
    });

    it("must choose at least one playable card", () => {
      const meadow = [
        CardName.HUSBAND,
        CardName.RANGER,
        CardName.WIFE,
        CardName.CEMETARY,
        CardName.THEATRE,
        CardName.EVERTREE,
        CardName.HUSBAND,
        CardName.HUSBAND,
      ];
      gameState = testInitialGameState({ meadowCards: meadow });

      const location = Location.fromName(
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      );

      player = gameState.getActivePlayer();
      player.gainResources(gameState, { [ResourceType.BERRY]: 5 });
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(5);

      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ] = [];

      gameState = gameState.next(gameInput);

      expect(() => {
        gameState.next({
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.PLACE_WORKER,
          cardOptions: meadow,
          maxToSelect: 2,
          minToSelect: 2,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          clientOptions: {
            selectedCards: [CardName.CEMETARY, CardName.EVERTREE],
          },
        });
      }).to.throwException(/must choose at least/i);
    });

    it("doesn't prompt for payment if card is already free", () => {
      const meadow = [
        CardName.HUSBAND,
        CardName.RANGER,
        CardName.WIFE,
        CardName.CEMETARY,
        CardName.THEATRE,
        CardName.EVERTREE,
        CardName.HUSBAND,
        CardName.CRANE,
      ];
      gameState = testInitialGameState({ meadowCards: meadow });

      const location = Location.fromName(
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      );

      player = gameState.getActivePlayer();
      expect(player.hasCardInCity(CardName.CRANE)).to.be(false);
      expect(player.numCardsInHand).to.be(0);

      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
      ] = [];

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.PLACE_WORKER,
        cardOptions: meadow,
        maxToSelect: 2,
        minToSelect: 2,
        locationContext:
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
        clientOptions: {
          selectedCards: [CardName.CEMETARY, CardName.CRANE],
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInput: selectCardsInput,
          prevInputType: GameInputType.SELECT_CARDS,
          cardOptions: [CardName.CRANE],
          maxToSelect: 1,
          minToSelect: 1,
          locationContext:
            LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
          cardOptionsUnfiltered: [CardName.CEMETARY, CardName.CRANE],
          clientOptions: { selectedCards: [CardName.CRANE] },
        },
      ]);
      expect(player.hasCardInCity(CardName.CRANE)).to.be(true);
      expect(player.hasCardInCity(CardName.CEMETARY)).to.be(false);
      expect(player.numCardsInHand).to.be(1);
    });
  });

  describe("Knoll", () => {
    beforeEach(() => {
      gameState = testInitialGameState({
        meadowCards: [
          CardName.ARCHITECT,
          CardName.BARD,
          CardName.BARGE_TOAD,
          CardName.CASTLE,
          CardName.CEMETARY,
          CardName.CHAPEL,
          CardName.CHIP_SWEEP,
          CardName.CLOCK_TOWER,
        ],
        stationCards: [CardName.COURTHOUSE, CardName.CRANE, CardName.DOCTOR],
        trainCarTiles: [
          TrainCarTileName.ONE_BERRY,
          TrainCarTileName.ONE_RESIN,
          TrainCarTileName.ONE_PEBBLE,
        ],
        gameOptions: { newleaf: { station: true, knoll: true } },
      });
    });

    it("player can visit", () => {
      const location = Location.fromName(LocationName.KNOLL);
      gameState.locationsMap[location.name] = [];

      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        placeWorkerInput(location.name),
        {
          clientOptions: {
            selectedCards: [
              { card: CardName.CRANE, source: "STATION", sourceIdx: 1 },
              { card: CardName.CHIP_SWEEP, source: "MEADOW", sourceIdx: 6 },
              { card: CardName.CLOCK_TOWER, source: "MEADOW", sourceIdx: 7 },
            ],
          },
        },
        {
          clientOptions: {
            selectedCards: [
              { card: CardName.DOCTOR, source: "STATION", sourceIdx: 2 },
              { card: CardName.ARCHITECT, source: "MEADOW", sourceIdx: 0 },
              { card: CardName.BARD, source: "MEADOW", sourceIdx: 1 },
            ],
          },
        },
        { clientOptions: { trainCarTileIdx: 1 } },
      ]);

      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.numCardsInHand).to.be(3);
      expect(player.cardsInHand).to.eql([
        CardName.DOCTOR,
        CardName.ARCHITECT,
        CardName.BARD,
      ]);
    });
  });

  describe("STATION", () => {
    beforeEach(() => {
      gameState = testInitialGameState({
        visitors: [VisitorName.BIM_LITTLE, VisitorName.DIM_DUSTLIGHT],
        gameOptions: { newleaf: { visitors: true } },
      });
    });

    it("player can visit and claim visitor", () => {
      const visitorStack = [
        VisitorName.BIM_LITTLE,
        VisitorName.DIM_DUSTLIGHT,
        VisitorName.FRIN_STICKLY,
      ];

      gameState = testInitialGameState({
        visitors: visitorStack,
        gameOptions: { newleaf: { visitors: true } },
      });

      const location = Location.fromName(LocationName.STATION);
      gameState.locationsMap[location.name] = [];

      [player, gameState] = multiStepGameInputTest(gameState, [
        placeWorkerInput(location.name),
        // selecting a visitor to discard
        {
          inputType: GameInputType.SELECT_VISITOR,
          prevInputType: GameInputType.PLACE_WORKER,
          locationContext: LocationName.STATION,
          visitorOptions: [VisitorName.BIM_LITTLE, VisitorName.DIM_DUSTLIGHT],
          clientOptions: {
            selectedVisitor: VisitorName.DIM_DUSTLIGHT,
          },
        },
        // selecting a visitor to keep
        {
          inputType: GameInputType.SELECT_VISITOR,
          prevInputType: GameInputType.SELECT_VISITOR,
          locationContext: LocationName.STATION,
          visitorOptions: [VisitorName.BIM_LITTLE, VisitorName.FRIN_STICKLY],
          clientOptions: {
            selectedVisitor: VisitorName.FRIN_STICKLY,
          },
        },
      ]);

      expect(player.claimedVisitors).to.eql([VisitorName.FRIN_STICKLY]);
    });
  });

  [
    LocationName.JOURNEY_TWO,
    LocationName.JOURNEY_THREE,
    LocationName.JOURNEY_FOUR,
    LocationName.JOURNEY_FIVE,
  ].forEach((locationName) => {
    describe(`JOURNEY: ${locationName}`, () => {
      it("cannot be played until autumn", () => {
        const location = Location.fromName(locationName);
        const gameInput = placeWorkerInput(locationName);
        player.cardsInHand = [
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
        ];

        expect(player.currentSeason).to.be(Season.WINTER);
        expect(location.canPlay(gameState, gameInput)).to.be(false);

        player.nextSeason();
        expect(player.currentSeason).to.be(Season.SPRING);
        expect(location.canPlay(gameState, gameInput)).to.be(false);

        player.nextSeason();
        expect(player.currentSeason).to.be(Season.SUMMER);
        expect(location.canPlay(gameState, gameInput)).to.be(false);

        player.nextSeason();
        expect(player.currentSeason).to.be(Season.AUTUMN);
        expect(location.canPlay(gameState, gameInput)).to.be(true);
      });

      it("requires X cards in hand", () => {
        const location = Location.fromName(locationName);
        const gameInput = placeWorkerInput(locationName);

        expect(player.currentSeason).to.be(Season.WINTER);
        player.nextSeason();
        player.nextSeason();
        player.nextSeason();
        expect(player.currentSeason).to.be(Season.AUTUMN);

        expect(location.canPlay(gameState, gameInput)).to.be(false);

        player.addCardToHand(gameState, CardName.RUINS);
        expect(location.canPlay(gameState, gameInput)).to.be(false);

        player.cardsInHand = [
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
        ];
        expect(location.canPlay(gameState, gameInput)).to.be(true);
      });
    });
  });
});
