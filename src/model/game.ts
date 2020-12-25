import { v4 as uuid4 } from "uuid";
import { IGame, IPlayer, IGameState } from "./types";
import { createPlayer } from "./player";

class Game implements IGame {
  private _gameState: IGameState;

  constructor(readonly gameId: string, players: IPlayer[]) {
    this._gameState = {
      activePlayer: players[0],
      players,
      locations: [],
      events: [],
      meadowCards: [],
      pendingGameInput: null,
    };
  }

  get gameState(): IGameState {
    return this._gameState;
  }

  toJSON(): object {
    return {
      gameId: this.gameId,
      gameState: {
        players: this._gameState.players.map((p) =>
          p.toJSON(false /* includePrivate */)
        ),
      },
    };
  }
}

export const createGame = (playerNames: string[]): Game => {
  if (playerNames.length === 0) {
    throw new Error(
      `Unable to create a game with ${playerNames.length} players`
    );
  }

  const gameId = uuid4();
  const game = new Game(
    gameId,
    playerNames.map((name) => createPlayer(name))
  );
  gameById[gameId] = game;
  console.log(`Creating game: ${gameId}`);
  return game;
};

// TODO persist to db
const gameById: Record<string, Game> = {};
gameById["test"] = createGame(["one", "two"]);

export const getGameById = (gameId: string): Game | null => {
  return gameById[gameId] || null;
};
