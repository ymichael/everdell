import { generate as uuid } from "short-uuid";
import { Player, createPlayer } from "./player";
import { GameState } from "./gameState";
import { GameOptions, GameInput } from "./types";
import { GameJSON } from "./jsonTypes";
import { getGameJSONById, saveGameJSONById } from "./db";
import cloneDeep from "lodash/cloneDeep";

export class Game {
  public gameId: string;
  private gameSecret: string;
  private gameState: GameState;
  private gameOptionsDeprecated: Partial<GameOptions>;

  constructor({
    gameId,
    gameSecret,
    gameState,
    gameOptions = null,
  }: {
    gameId: string;
    gameSecret: string;
    gameState: GameState;
    gameOptions?: Partial<GameOptions> | null;
  }) {
    this.gameId = gameId;
    this.gameSecret = gameSecret;
    this.gameState = gameState;
    this.gameOptionsDeprecated = gameOptions || {};
  }

  get gameSecretUNSAFE(): string {
    return this.gameSecret;
  }

  isGameOver(): boolean {
    return this.gameState.isGameOver();
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
      // Deprecated, remove after 3/1/21
      gameOptions: this.gameOptionsDeprecated,
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

export const createGameFromGameState = async (
  gameState: GameState
): Promise<Game> => {
  const game = new Game({
    gameId: uuid(),
    gameSecret: uuid(),
    gameState,
  });
  await game.save();
  return game;
};

export const createGame = async (
  playerNames: string[],
  gameOptions: Partial<GameOptions> = {
    realtimePoints: false,
  }
): Promise<Game> => {
  if (playerNames.length < 2 || playerNames.length > 4) {
    throw new Error(
      `Unable to create a game with ${playerNames.length} players`
    );
  }
  const players = playerNames.map((name) => createPlayer(name));
  const gameState = GameState.initialGameState({ players, gameOptions });
  const game = await createGameFromGameState(gameState);
  console.log(`Game created: ${game.gameId}`);
  return game;
};

export const getGameById = async (gameId: string): Promise<Game | null> => {
  const gameJSON = await getGameJSONById(gameId);
  return gameJSON ? Game.fromJSON(gameJSON) : null;
};
