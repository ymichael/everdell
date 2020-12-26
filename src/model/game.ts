import { generate as uuid } from "short-uuid";
import { Player, createPlayer } from "./player";
import { initialLocationsMap } from "./location";
import { initialEventMap } from "./event";
import { GameState } from "./gameState";
import { getGameJSONById, saveGameJSONById } from "./db";

class Game {
  public gameId: string;
  private gameSecret: string;
  private gameState: GameState;

  constructor(gameId: string, gameSecret: string, gameState: GameState) {
    this.gameId = gameId;
    this.gameSecret = gameSecret;
    this.gameState = gameState;
  }

  get gameSecretUNSAFE(): string {
    return this.gameSecret;
  }

  save(): void {
    saveGameJSONById(this.gameId, this.toJSON(true /* includePrivate */));
  }

  toJSON(includePrivate: boolean): object {
    return {
      gameId: this.gameId,
      gameState: this.gameState.toJSON(includePrivate),
      ...(includePrivate
        ? {
            gameSecret: this.gameSecret,
          }
        : {}),
    };
  }

  getPlayerBySecret(playerSecret: string): Player | undefined {
    return this.gameState.players.find(
      (p) => p.playerSecretUNSAFE === playerSecret
    );
  }

  static fromJSON(gameJSON: any): Game | null {
    return new Game(
      gameJSON.gameId,
      gameJSON.gameSecret,
      GameState.fromJSON(gameJSON.gameState)
    );
  }
}

export const createGame = (playerNames: string[]): Game => {
  if (playerNames.length === 0) {
    throw new Error(
      `Unable to create a game with ${playerNames.length} players`
    );
  }
  const gameId = uuid();
  const gameSecret = uuid();
  console.log(`Creating game: ${gameId}`);
  const players = playerNames.map((name) => createPlayer(name));
  const game = new Game(
    gameId,
    gameSecret,
    new GameState({
      activePlayerId: players[0].playerId,
      players,
      meadowCards: [],
      discardPile: [],
      deck: [],
      locationsMap: initialLocationsMap(),
      eventsMap: initialEventMap(),
      pendingGameInput: null,
    })
  );

  game.save();
  return game;
};

export const getGameById = async (gameId: string): Promise<Game | null> => {
  const gameJSON = await getGameJSONById(gameId);
  return gameJSON ? Game.fromJSON(gameJSON) : null;
};
