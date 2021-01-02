import { generate as uuid } from "short-uuid";
import { Player, createPlayer } from "./player";
import { GameState } from "./gameState";
import { GameInput, GameInputType, GameLogEntry } from "./types";
import { GameJSON } from "./jsonTypes";
import { getGameJSONById, saveGameJSONById } from "./db";
import cloneDeep from "lodash/cloneDeep";

const MAX_GAME_LOG_BUFFER = 100;

export class Game {
  public gameId: string;
  private gameSecret: string;
  private gameState: GameState;
  private gameLogBuffer: GameLogEntry[];

  constructor(
    gameId: string,
    gameSecret: string,
    gameState: GameState,
    gameLogBuffer: GameLogEntry[] = []
  ) {
    this.gameId = gameId;
    this.gameSecret = gameSecret;
    this.gameState = gameState;
    this.gameLogBuffer = gameLogBuffer;
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

  private updateGameLog(gameInput: GameInput): void {
    const logSize = this.gameLogBuffer.length;
    if (logSize > MAX_GAME_LOG_BUFFER) {
      this.gameLogBuffer.splice(0, Math.floor(MAX_GAME_LOG_BUFFER / 2));
    }

    const player = this.gameState.getActivePlayer();
    switch (gameInput.inputType) {
      case GameInputType.PLAY_CARD:
        this.gameLogBuffer.push({
          text: `${player.name} played ${gameInput.card}`,
        });
        break;
      case GameInputType.PLACE_WORKER:
        this.gameLogBuffer.push({
          text: `${player.name} place a worker on ${gameInput.location}.`,
        });
        break;
      case GameInputType.CLAIM_EVENT:
        this.gameLogBuffer.push({
          text: `${player.name} claimed the ${gameInput.event} event.`,
        });
        break;
      case GameInputType.PREPARE_FOR_SEASON:
        this.gameLogBuffer.push({
          text: `${player.name} took the prepare for season action.`,
        });
        break;
      case GameInputType.SELECT_CARDS:
      case GameInputType.SELECT_PLAYED_CARDS:
      case GameInputType.SELECT_LOCATION:
      case GameInputType.SELECT_PAYMENT_FOR_CARD:
      case GameInputType.SELECT_WORKER_PLACEMENT:
      case GameInputType.SELECT_PLAYER:
      case GameInputType.SELECT_RESOURCES:
      case GameInputType.DISCARD_CARDS:
        this.gameLogBuffer.push({
          text: `[${
            gameInput.cardContext ||
            gameInput.eventContext ||
            gameInput.locationContext ||
            gameInput.prevInputType
          }] ${player.name} took ${gameInput.inputType} action.`,
        });
        break;
      case GameInputType.GAME_END:
      case GameInputType.VISIT_DESTINATION_CARD:
      default:
        this.gameLogBuffer.push({
          text: `${player.name} took ${gameInput.inputType} action.`,
        });
        break;
    }
  }

  private handleGameOver(): void {
    if (this.gameState.isGameOver()) {
      this.gameLogBuffer.push({ text: `Game over` });
      this.gameState.players.forEach((player) => {
        this.gameLogBuffer.push({
          text: `${player.name} has ${player.getPoints(
            this.gameState
          )} points.`,
        });
      });
    }
  }

  applyGameInput(gameInput: GameInput): void {
    this.updateGameLog(gameInput);
    this.gameState = this.gameState.next(gameInput);
    this.handleGameOver();
  }

  async save(): Promise<void> {
    await saveGameJSONById(this.gameId, this.toJSON(true /* includePrivate */));
  }

  toJSON(includePrivate: boolean): GameJSON {
    return cloneDeep({
      gameId: this.gameId,
      gameSecret: "",
      gameState: this.gameState.toJSON(includePrivate),
      gameLogBuffer: this.gameLogBuffer,
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
    return new Game(
      gameJSON.gameId,
      gameJSON.gameSecret,
      GameState.fromJSON(gameJSON.gameState),
      gameJSON.gameLogBuffer
    );
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
  const game = new Game(
    gameId,
    gameSecret,
    GameState.initialGameState({
      players,
    }),
    [
      { text: `Game created with ${players.length} players.` },
      { text: "Dealing cards to each player." },
      { text: "Dealing cards to the Meadow." },
    ]
  );

  await game.save();
  return game;
};

export const getGameById = async (gameId: string): Promise<Game | null> => {
  const gameJSON = await getGameJSONById(gameId);
  return gameJSON ? Game.fromJSON(gameJSON) : null;
};
