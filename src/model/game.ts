import { generate as uuid } from "short-uuid";
import { Player, createPlayer } from "./player";
import { GameState } from "./gameState";
import { Location } from "./location";
import { Event } from "./event";
import { GameInput, GameInputType } from "./types";
import { GameJSON } from "./jsonTypes";
import { getGameJSONById, saveGameJSONById } from "./db";
import cloneDeep from "lodash/cloneDeep";

export class Game {
  public gameId: string;
  private gameSecret: string;
  private gameState: GameState;

  constructor({
    gameId,
    gameSecret,
    gameState,
  }: {
    gameId: string;
    gameSecret: string;
    gameState: GameState;
  }) {
    this.gameId = gameId;
    this.gameSecret = gameSecret;
    this.gameState = gameState;
  }

  get gameSecretUNSAFE(): string {
    return this.gameSecret;
  }

  getPlayer(playerId: string): Player {
    return this.gameState.getPlayer(playerId);
  }

  getActivePlayer(): Player {
    return this.gameState.getActivePlayer();
  }

  getGameInputs(): GameInput[] {
    return this.gameState.getPossibleGameInputs();
  }

  getGameStateId(): number {
    return this.gameState.gameStateId;
  }

  applyGameInput(gameInput: GameInput): void {
    this.gameState = this.gameState.next(gameInput);
  }

  async save(): Promise<void> {
    await saveGameJSONById(this.gameId, this.toJSON(true /* includePrivate */));
  }

  toJSON(includePrivate: boolean): GameJSON {
    return cloneDeep({
      gameId: this.gameId,
      gameSecret: "",
      gameState: this.gameState.toJSON(includePrivate),
      ...(includePrivate
        ? {
            gameSecret: this.gameSecret,
          }
        : {}),
    });
  }

  getPlayerBySecret(playerSecret: string): Player | undefined {
    return this.gameState.players.find(
      (p) => p.playerSecretUNSAFE === playerSecret
    );
  }

  static fromJSON(gameJSON: GameJSON): Game {
    return new Game({
      ...gameJSON,
      gameState: GameState.fromJSON(gameJSON.gameState),
    });
  }
}

export const createGame = async (playerNames: string[]): Promise<Game> => {
  if (playerNames.length < 2) {
    throw new Error(
      `Unable to create a game with ${playerNames.length} players`
    );
  }
  const gameId = uuid();
  const gameSecret = uuid();
  console.log(`Creating game: ${gameId}`);
  const players = playerNames.map((name) => createPlayer(name));
  const game = new Game({
    gameId,
    gameSecret,
    gameState: GameState.initialGameState({ players }),
  });

  await game.save();
  return game;
};

export const getGameById = async (gameId: string): Promise<Game | null> => {
  const gameJSON = await getGameJSONById(gameId);
  return gameJSON ? Game.fromJSON(gameJSON) : null;
};
