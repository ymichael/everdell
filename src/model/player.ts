import { CardName, Season, ResourceType } from "./types";
import { v4 as uuid4 } from "uuid";

export class Player {
  private playerSecret: string;

  public name: string;
  public playerId: string;
  public playedCards: CardName[];
  public cardsInHand: CardName[];
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
    playerSecret: string | null = null
  ) {
    this.playerId = playerId || uuid4();
    this.playerSecret = playerSecret || uuid4();
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

  get playerSecretUNSAFE(): string {
    return this.playerSecret;
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
            playerSecret: this.playerSecret,
            cardsInHand: this.cardsInHand,
          }
        : {}),
    };
  }

  static fromJSON(playerJSON: any): Player {
    const player = new Player(
      playerJSON.name,
      playerJSON.playerId,
      playerJSON.playerSecret
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
  return player;
};
