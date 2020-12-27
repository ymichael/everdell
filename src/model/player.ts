import { CardName, Season, ResourceType, OwnableResourceType } from "./types";
import { GameState } from "./gameState";
import { Location } from "./location";
import { generate as uuid } from "short-uuid";

const MAX_HAND_SIZE = 8;

export class Player {
  private playerSecret: string;

  public name: string;
  public playerId: string;
  public playedCards: CardName[];
  public cardsInHand: CardName[];
  public resources: Record<OwnableResourceType, number>;
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

  discardCard(cardName: CardName): void {
    const idx = this.cardsInHand.indexOf(cardName);
    if (idx === -1) {
      throw new Error(`Unable to discard ${cardName}`);
    } else {
      this.cardsInHand.splice(idx, 1);
    }
  }

  drawCards(gameState: GameState, count: number): void {
    for (let i = 0; i < count; i++) {
      const drawnCard = gameState.drawCard();
      if (this.cardsInHand.length < MAX_HAND_SIZE) {
        this.cardsInHand.push(drawnCard);
      } else {
        gameState.discardPile.addToStack(drawnCard);
      }
    }
  }

  gainResources({
    VP = 0,
    TWIG = 0,
    BERRY = 0,
    PEBBLE = 0,
    RESIN = 0,
  }: {
    [ResourceType.VP]?: number;
    [ResourceType.TWIG]?: number;
    [ResourceType.BERRY]?: number;
    [ResourceType.PEBBLE]?: number;
    [ResourceType.RESIN]?: number;
  }): void {
    if (VP) {
      this.resources[ResourceType.VP] += VP;
    }
    if (TWIG) {
      this.resources[ResourceType.TWIG] += TWIG;
    }
    if (BERRY) {
      this.resources[ResourceType.BERRY] += BERRY;
    }
    if (PEBBLE) {
      this.resources[ResourceType.PEBBLE] += PEBBLE;
    }
    if (RESIN) {
      this.resources[ResourceType.RESIN] += RESIN;
    }
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
