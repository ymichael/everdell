import expect from "expect.js";
import { Game } from "./game";
import { GameState } from "./gameState";
import { GameInputType, CardName, ResourceType } from "./types";
import { testInitialGameState } from "./testHelpers";

describe("Game", () => {
  let game: Game;
  let gameState: GameState;

  beforeEach(() => {
    gameState = testInitialGameState();
    game = new Game({
      gameId: "testGameId",
      gameSecret: "testGameSecret",
      gameState,
    });
  });

  // TODO move to gameState.test.ts
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
    expect(game.toJSON(false).gameState.gameLog).eql([
      { entry: [{ type: "text", text: "Game created with 2 players." }] },
      { entry: [{ type: "text", text: "Dealing cards to each player." }] },
      { entry: [{ type: "text", text: "Dealing cards to the Meadow." }] },
    ]);
    game.applyGameInput({ inputType: GameInputType.GAME_END });
    game.applyGameInput({ inputType: GameInputType.GAME_END });
    expect(game.toJSON(false).gameState.gameLog).eql([
      { entry: [{ type: "text", text: "Game created with 2 players." }] },
      { entry: [{ type: "text", text: "Dealing cards to each player." }] },
      { entry: [{ type: "text", text: "Dealing cards to the Meadow." }] },
      { entry: [{ type: "text", text: "Player #0 took GAME_END action." }] },
      { entry: [{ type: "text", text: "Player #1 took GAME_END action." }] },
      { entry: [{ type: "text", text: "Game over" }] },
      { entry: [{ type: "text", text: "Player #0 has 14 points." }] },
      { entry: [{ type: "text", text: "Player #1 has 12 points." }] },
    ]);
  });
});
