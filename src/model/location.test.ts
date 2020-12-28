import expect from "expect.js";
import { Location } from "./location";
import { GameState } from "./gameState";
import { testInitialGameState } from "./testHelpers";
import {
  Season,
  LocationName,
  GameInputType,
  GameInput,
  CardName,
} from "./types";

const placeWorkerInput = (location: LocationName): GameInput => {
  return {
    inputType: GameInputType.PLACE_WORKER,
    location,
  };
};

describe("Location", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = testInitialGameState();
  });

  describe("fromName", () => {
    it("should return the expect Location instances", () => {
      for (const loc in LocationName) {
        expect(Location.fromName(loc as LocationName).name).to.be(loc);
      }
    });
  });

  describe("Available workers", () => {
    it("should not allow players w/o workers", () => {
      const location = Location.fromName(LocationName.BASIC_ONE_BERRY);
      const gameInput = placeWorkerInput(location.name);
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      gameState.getActivePlayer().numAvailableWorkers = 0;
      expect(location.canPlay(gameState, gameInput)).to.be(false);
    });
  });

  describe("Location Occupancy", () => {
    it("should allow unlimited workers on BASIC_ONE_BERRY", () => {
      const location = Location.fromName(LocationName.BASIC_ONE_BERRY);
      const gameInput = placeWorkerInput(location.name);
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      const nextGameState = gameState.next(gameInput);
      expect(location.canPlay(nextGameState, gameInput)).to.be(true);
    });

    it("should not allow unlimited workers on BASIC_ONE_BERRY_AND_ONE_CARD", () => {
      const location = Location.fromName(
        LocationName.BASIC_ONE_BERRY_AND_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      const nextGameState = gameState.next(gameInput);
      expect(location.canPlay(nextGameState, gameInput)).to.be(false);
    });

    it("should allow 2 workers on FOREST_TWO_BERRY_ONE_CARD if 4+ players", () => {
      const gameState = testInitialGameState({ numPlayers: 4 });
      const location = Location.fromName(
        LocationName.FOREST_TWO_BERRY_ONE_CARD
      );
      const gameInput = placeWorkerInput(location.name);
      gameState.locationsMap[LocationName.FOREST_TWO_BERRY_ONE_CARD] = [];
      expect(location.canPlay(gameState, gameInput)).to.be(true);
      const gameState2 = gameState.next(gameInput);
      expect(location.canPlay(gameState2, gameInput)).to.be(true);
      const gameState3 = gameState2.next(gameInput);
      expect(location.canPlay(gameState3, gameInput)).to.be(false);
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
        expect(gameState.getActivePlayer().currentSeason).to.be(Season.WINTER);
        expect(location.canPlay(gameState, gameInput)).to.be(false);
        gameState.getActivePlayer().currentSeason = Season.AUTUMN;
        gameState.getActivePlayer().cardsInHand = [
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
        ];
        expect(location.canPlay(gameState, gameInput)).to.be(true);
      });

      it("requires X cards in hand", () => {
        const location = Location.fromName(locationName);
        const gameInput = placeWorkerInput(locationName);
        expect(gameState.getActivePlayer().currentSeason).to.be(Season.WINTER);
        expect(location.canPlay(gameState, gameInput)).to.be(false);

        gameState.getActivePlayer().currentSeason = Season.AUTUMN;
        gameState.getActivePlayer().cardsInHand = [CardName.RUINS];
        expect(location.canPlay(gameState, gameInput)).to.be(false);

        gameState.getActivePlayer().cardsInHand = [
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
