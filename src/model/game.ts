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
}

export const createGame = (playerNames: string[]) => {
  return new Game(
    uuid4(),
    playerNames.map((name) => createPlayer(name))
  );
};
