import { CardName, Season, ResourceType } from "./types";
import { generate as uuid } from "short-uuid";

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
    [ResourceType.PEBBLE]: number;
    [ResourceType.RESIN]: number;
  };
  public currentSeason: Season;
  public numWorkers: number;
  public numAvailableWorkers: number;

  constructor({
    name,
    playerSecret = uuid(),
    playerId = uuid(),
    playedCards = [],
    cardsInHand = [],
    resources = {
      [ResourceType.VP]: 0,
      [ResourceType.TWIG]: 0,
      [ResourceType.BERRY]: 0,
      [ResourceType.PEBBLE]: 0,
      [ResourceType.RESIN]: 0,
    },
    currentSeason = Season.WINTER,
    numWorkers = 2,
    numAvailableWorkers = 2,
  }: {
    name: string;
    playerSecret: string;
    playerId: string;
    playedCards: CardName[];
    cardsInHand: CardName[];
    resources: {
      [ResourceType.VP]: number;
      [ResourceType.TWIG]: number;
      [ResourceType.BERRY]: number;
      [ResourceType.PEBBLE]: number;
      [ResourceType.RESIN]: number;
    };
    currentSeason: Season;
    numWorkers: number;
    numAvailableWorkers: number;
  }) {
    this.playerId = playerId;
    this.playerSecret = playerSecret;
    this.name = name;
    this.playedCards = playedCards;
    this.cardsInHand = cardsInHand;
    this.resources = resources;
    this.currentSeason = currentSeason;
    this.numWorkers = numWorkers;
    this.numAvailableWorkers = numAvailableWorkers;
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
    const player = new Player(playerJSON);
    return player;
  }
}

export const createPlayer = (name: string): Player => {
  const player = new Player({
    name,
    playerSecret: uuid(),
    playerId: uuid(),
    playedCards: [],
    cardsInHand: [],
    resources: {
      [ResourceType.VP]: 0,
      [ResourceType.TWIG]: 0,
      [ResourceType.BERRY]: 0,
      [ResourceType.PEBBLE]: 0,
      [ResourceType.RESIN]: 0,
    },
    currentSeason: Season.WINTER,
    numWorkers: 2,
    numAvailableWorkers: 2,
  });
  return player;
};
