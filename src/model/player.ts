import { ICard, IPlayer, Season, ResourceType } from "./types";
import { v4 as uuid4 } from "uuid";

export class Player implements IPlayer {
  private playerKey: string;

  public name: string;
  public playerId: string;
  public playedCards: ICard[];
  public cardsInHand: ICard[];
  public resources: {
    [ResourceType.VP]: number;
    [ResourceType.TWIG]: number;
    [ResourceType.BERRY]: number;
    [ResourceType.STONE]: number;
    [ResourceType.RESIN]: number;
  };
  public currentSeason: Season;
  public numWorkers: number;
  public numAvailableWorkers: number;

  constructor(
    playerName: string,
    playerId: string | null = null,
    playerKey: string | null = null
  ) {
    this.playerId = playerId || uuid4();
    this.playerKey = playerKey || uuid4();
    this.name = playerName;
    this.playedCards = [];
    this.cardsInHand = [];
    this.resources = {
      [ResourceType.VP]: 0,
      [ResourceType.TWIG]: 0,
      [ResourceType.BERRY]: 0,
      [ResourceType.STONE]: 0,
      [ResourceType.RESIN]: 0,
    };
    this.currentSeason = Season.WINTER;
    this.numWorkers = 0;
    this.numAvailableWorkers = 0;
  }

  get playerKeyUNSAFE(): string {
    return this.playerKey;
  }

  toJSON(includePrivate: boolean): object {
    return {
      name: this.name,
      playerId: this.playerId,
      playedCards: this.playedCards,
      numCardsInHand: this.cardsInHand.length,
      resources: this.resources,
      numWorkers: this.numWorkers,
      numAvailableWorkers: this.numAvailableWorkers,
      currentSeason: this.currentSeason,
      ...(includePrivate
        ? {
            playerKey: this.playerKey,
            cardsInHand: this.cardsInHand,
          }
        : {}),
    };
  }

  static fromJSON(playerJSON: any): Player {
    const player = new Player(
      playerJSON.name,
      playerJSON.playerId,
      playerJSON.playerKey
    );
    player.playedCards = playerJSON.playedCards;
    player.resources = playerJSON.resources;
    player.numWorkers = playerJSON.numWorkers;
    player.numAvailableWorkers = playerJSON.numAvailableWorkers;
    player.currentSeason = playerJSON.currentSeason;
    return player;
  }
}

export const createPlayer = (name: string): Player => {
  const player = new Player(name);
  playerById[player.playerId] = player;
  playerByKey[player.playerKeyUNSAFE] = player;
  return player;
};

// TODO
const playerById: Record<string, Player> = {};
const playerByKey: Record<string, Player> = {};

export const getPlayerById = (playerId: string): Player | null => {
  return playerById[playerId] || null;
};

export const getPlayerByKey = (playerKey: string): Player | null => {
  return playerByKey[playerKey] || null;
};
