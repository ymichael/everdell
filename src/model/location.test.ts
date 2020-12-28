import expect from "expect.js";
import { Location } from "./location";
import { GameState } from "./gameState";
import { createPlayer } from "./player";
import { Season, LocationName, GameInputType } from "./types";

describe("Location", () => {
  describe("fromName", () => {
    it("should return the expect Location instances", () => {
      for (const loc in LocationName) {
        expect(Location.fromName(loc as LocationName).name).to.be(loc);
      }
    });
  });

  describe("canPlay basic", () => {
    it("HAVEN cannot be played until autumn", () => {
      let gameState = GameState.initialGameState({
        players: [createPlayer("One"), createPlayer("Two")],
      });
      const berryLocation = Location.fromName(LocationName.BASIC_ONE_BERRY);
      expect(
        berryLocation.canPlay(gameState, {
          inputType: GameInputType.PLACE_WORKER,
          location: LocationName.BASIC_ONE_BERRY,
        })
      ).to.be(true);

      const journeyLocation = Location.fromName(LocationName.JOURNEY_TWO);
      expect(gameState.getActivePlayer().currentSeason).to.be(Season.WINTER);
      expect(
        journeyLocation.canPlay(gameState, {
          inputType: GameInputType.PLACE_WORKER,
          location: LocationName.JOURNEY_TWO,
        })
      ).to.be(false);

      gameState.getActivePlayer().currentSeason = Season.AUTUMN;
      expect(
        journeyLocation.canPlay(gameState, {
          inputType: GameInputType.PLACE_WORKER,
          location: LocationName.JOURNEY_TWO,
        })
      ).to.be(true);
    });
  });
});
