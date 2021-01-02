import expect from "expect.js";
import { Game } from "./game";
import { GameState } from "./gameState";
import { GameInputType, Season, CardName, ResourceType } from "./types";
import { testInitialGameState } from "./testHelpers";

describe("Game", () => {
  let game: Game;
  let gameState: GameState;

  beforeEach(() => {
    gameState = testInitialGameState();
    game = new Game("testGameId", "testGameSecret", gameState);
  });

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
    game.applyGameInput({ inputType: GameInputType.GAME_END });
    game.applyGameInput({ inputType: GameInputType.GAME_END });
    expect(game.toJSON(false).gameLogBuffer).eql([
      { text: "Player #0 took GAME_END action." },
      { text: "Player #1 took GAME_END action." },
      { text: "Game over" },
      { text: "Player #0 has 14 points." },
      { text: "Player #1 has 12 points." },
    ]);
  });
});
