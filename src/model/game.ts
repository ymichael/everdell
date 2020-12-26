import { v4 as uuid4 } from "uuid";
import { createPlayer } from "./player";
import { GameState } from "./gameState";
import { getGameJSONById, saveGameJSONById } from "./db";

class Game {
  public gameId: string;
  private gameState: GameState;

  constructor(gameId: string, gameState: GameState) {
    this.gameId = gameId;
    this.gameState = gameState;
  }

  save(): void {
    saveGameJSONById(this.gameId, this.toJSON(true /* includePrivate */));
  }

  toJSON(includePrivate: boolean): object {
    return {
      gameId: this.gameId,
      gameState: this.gameState.toJSON(includePrivate),
    };
  }

  static fromJSON(gameJSON: any): Game | null {
    return new Game(gameJSON.gameId, GameState.fromJSON(gameJSON.gameState));
  }
}

export const createGame = (playerNames: string[]): Game => {
  if (playerNames.length === 0) {
    throw new Error(
      `Unable to create a game with ${playerNames.length} players`
    );
  }
  const gameId = uuid4();
  console.log(`Creating game: ${gameId}`);
  const players = playerNames.map((name) => createPlayer(name));
  const game = new Game(
    gameId,
    new GameState(players[0].playerId, players, [], [], [], [], [], null)
  );

  game.save();
  return game;
};

createGame(["test1", "test2"]);

export const getGameById = async (gameId: string): Promise<Game | null> => {
  const gameJSON = await getGameJSONById(gameId);
  return gameJSON ? Game.fromJSON(gameJSON) : null;
};
