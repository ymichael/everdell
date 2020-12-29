import {
  CardCost,
  CardName,
  CardType,
  EventName,
  Season,
  ResourceType,
  GameInput,
  GameInputType,
  PlayedCardInfo,
} from "./types";
import cloneDeep from "lodash/cloneDeep";
import { GameState } from "./gameState";
import { Card } from "./card";
import { Event } from "./event";
import { generate as uuid } from "short-uuid";
import { sumResources } from "./gameStatePlayHelpers";

const MAX_HAND_SIZE = 8;
const MAX_CITY_SIZE = 15;

export class Player {
  private playerSecret: string;

  public name: string;
  public playerId: string;
  public playedCards: Partial<Record<CardName, PlayedCardInfo[]>>;
  public cardsInHand: CardName[];
  readonly resources: Record<ResourceType, number>;
  public currentSeason: Season;
  public numWorkers: number;
  public numAvailableWorkers: number;
  public claimedEvents: Partial<Record<EventName, PlayedCardInfo>>;

  constructor({
    name,
    playerSecret = uuid(),
    playerId = uuid(),
    playedCards = {},
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
    claimedEvents = {},
  }: {
    name: string;
    playerSecret: string;
    playerId: string;
    playedCards: Partial<Record<CardName, PlayedCardInfo[]>>;
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
    claimedEvents: Partial<Record<EventName, PlayedCardInfo>>;
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
    this.claimedEvents = claimedEvents;
  }

  get playerSecretUNSAFE(): string {
    return this.playerSecret;
  }

  removeCardFromHand(cardName: CardName): void {
    const idx = this.cardsInHand.indexOf(cardName);
    if (idx === -1) {
      throw new Error(`Unable to discard ${cardName}`);
    } else {
      this.cardsInHand.splice(idx, 1);
    }
  }

  addToCity(cardName: CardName): void {
    if (!this.canAddToCity(cardName)) {
      throw new Error(`Unable to add ${cardName} to city`);
    }
    const card = Card.fromName(cardName);
    this.playedCards[cardName] = this.playedCards[cardName] || [];
    this.playedCards[cardName]!.push(card.getPlayedCardInfo());
  }

  occupyConstruction(cardName: CardName): void {
    const card = Card.fromName(cardName);
    if (!card.isConstruction) {
      throw new Error("Can only occupy construction");
    }
    let didOccupy = false;
    (this.playedCards[card.name] || []).forEach((playedCardInfo) => {
      if (!didOccupy && !playedCardInfo.isOccupied) {
        playedCardInfo.isOccupied = true;
        didOccupy = true;
      }
    });
    if (!didOccupy) {
      throw new Error("No unoccupied construction found");
    }
  }

  canAddToCity(cardName: CardName): boolean {
    const card = Card.fromName(cardName);
    if (card.isUnique && this.hasPlayedCard(card.name)) {
      return false;
    }

    // Can always play wanderer
    if (cardName === CardName.WANDERER) {
      return true;
    }

    // TODO: Innkeeper, husband/wife, ruins, dungeoning

    let numOccupiedSpacesInCity = 0;
    this.forEachPlayedCard(({ cardName }) => {
      if (cardName === CardName.WANDERER) {
        return;
      }
      numOccupiedSpacesInCity += 1;
    });

    // Only count each husband/wife pair once
    numOccupiedSpacesInCity -= this.numHusbandWifePairs();
    return numOccupiedSpacesInCity <= MAX_CITY_SIZE;
  }

  numHusbandWifePairs(): number {
    const numHusbands = (this.playedCards[CardName.HUSBAND] || []).length;
    const numWifes = (this.playedCards[CardName.WIFE] || []).length;
    return Math.min(numHusbands, numWifes);
  }

  removeCardFromCity(cardName: CardName): CardName[] {
    if (this.playedCards[cardName]) {
      this.playedCards[cardName]!.pop();
    } else {
      throw new Error(`Unable to remove ${cardName}`);
    }
    // TODO: handle cards that contain other cards (eg. dungeon)
    return [cardName];
  }

  claimEvent(eventName: EventName): void {
    const event = Event.fromName(eventName);
    this.claimedEvents[eventName] = event.getPlayedEventInfo();
  }

  getNumResource(resourceType: ResourceType): number {
    return this.resources[resourceType];
  }

  forEachPlayedCard(
    cb: (x: { cardName: CardName; playedCardInfo: PlayedCardInfo }) => void
  ): void {
    (Object.entries(this.playedCards) as [
      CardName,
      PlayedCardInfo[]
    ][]).forEach(([cardName, playedCards]) => {
      playedCards.forEach((playedCardInfo) => {
        cb({ cardName, playedCardInfo });
      });
    });
  }

  getNumCardType(cardType: CardType): number {
    let numCards = 0;
    this.forEachPlayedCard(({ cardName }) => {
      const card = Card.fromName(cardName as CardName);
      if (card.cardType === cardType) {
        numCards += 1;
      }
    });
    return numCards;
  }

  getPlayedCardType(cardType: CardType): CardName[] {
    let playedCardsOfType: CardName[] = [];
    this.forEachPlayedCard(({ cardName }) => {
      const card = Card.fromName(cardName as CardName);
      if (card.cardType === cardType) {
        playedCardsOfType.push(cardName);
      }
    });
    return playedCardsOfType;
  }

  // returns all destination cards that a player has played that have
  // room for another worker
  getAllAvailableDestinationCards(): CardName[] {
    let allAvailableDestinationCards: CardName[] = [];

    this.forEachPlayedCard(({ cardName }) => {
      let card = Card.fromName(cardName as CardName);
      if (card.cardType === CardType.DESTINATION) {
        let cardInfo = card.getPlayedCardInfo();

        let maxWorkers = cardInfo.maxWorkers || 1;
        let workers = cardInfo.workers || [];

        if (workers.length < maxWorkers) {
          allAvailableDestinationCards.push(cardName);
        }
      }
    });

    return allAvailableDestinationCards;
  }

  // returns all non-Open destination cards that were played by player and
  // are available for them to put a worker on
  getAvailableClosedDestinationCards(): CardName[] {
    let availableDestinationCards: CardName[] = [];

    this.forEachPlayedCard(({ cardName }) => {
      let card = Card.fromName(cardName as CardName);
      if (card.cardType === CardType.DESTINATION && !card.isOpenDestination) {
        let cardInfo = card.getPlayedCardInfo();

        let maxWorkers = cardInfo.maxWorkers || 1;
        let workers = cardInfo.workers || [];

        if (workers.length < maxWorkers) {
          availableDestinationCards.push(cardName);
        }
      }
    });
    return availableDestinationCards;
  }

  // returns all destination cards played by this player that are "open"
  // and are available to take other workers
  getAvailableOpenDestinationCards(): CardName[] {
    let openDestinationCards = this.getOpenDestinationCards();
    let openAvailableDestinations: CardName[] = [];

    openDestinationCards.forEach((cardName) => {
      let card = Card.fromName(cardName as CardName);
      let cardInfo = card.getPlayedCardInfo();

      let maxWorkers = cardInfo.maxWorkers || 1;
      let workers = cardInfo.workers || [];

      if (workers.length < maxWorkers) {
        openAvailableDestinations.push(cardName);
      }
    });

    return openAvailableDestinations;
  }

  // returns all destination cards played by this player that are "open"
  getOpenDestinationCards(): CardName[] {
    let openDestinationCards: CardName[] = [];

    this.forEachPlayedCard(({ cardName }) => {
      let card = Card.fromName(cardName as CardName);
      if (card.cardType === CardType.DESTINATION && !!card.isOpenDestination) {
        openDestinationCards.push(cardName);
      }
    });
    return openDestinationCards;
  }

  hasPlayedCard(cardName: CardName): boolean {
    return !!this.playedCards[cardName];
  }

  hasUnoccupiedConstruction(cardName: CardName): boolean {
    return !!(
      Card.fromName(cardName).isConstruction &&
      this.playedCards[cardName]?.some((playedCard) => !playedCard.isOccupied)
    );
  }

  canInvokeDungeon(): boolean {
    const playedDungeon = this.playedCards[CardName.DUNGEON]?.[0];
    if (!playedDungeon) {
      return false;
    }

    const numDungeoned = playedDungeon.pairedCards?.length || 0;
    const maxDungeoned = this.playedCards[CardName.RANGER] ? 2 : 1;

    // Need to have a critter to dungeon
    if (
      !(Object.keys(this.playedCards) as CardName[]).some((cardName) => {
        const card = Card.fromName(cardName);
        return (
          card.isCritter && (numDungeoned == 0 || cardName !== CardName.RANGER)
        );
      })
    ) {
      return false;
    }

    return numDungeoned < maxDungeoned;
  }

  canPlaceWorkerOnCard(cardName: CardName): boolean {
    if (this.numAvailableWorkers <= 0) {
      return false;
    }

    const card = Card.fromName(cardName);
    if (!this.playedCards[cardName] || !!card.isOpenDestination) {
      return false;
    }
    return this.playedCards[cardName]!.some((playedCard) => {
      const maxWorkers = playedCard.maxWorkers || 1;
      const numWorkers = playedCard.workers?.length || 0;
      return numWorkers < maxWorkers;
    });
  }

  drawMaxCards(gameState: GameState): void {
    this.drawCards(gameState, MAX_HAND_SIZE - this.cardsInHand.length);
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

  canAffordCard(cardName: CardName, isMeadowCard: boolean): boolean {
    const card = Card.fromName(cardName);

    // Check if you have the associated construction if card is a critter
    if (card.isCritter) {
      if (this.hasUnoccupiedConstruction(CardName.EVERTREE)) {
        return true;
      }
      if (
        card.associatedCard &&
        this.hasUnoccupiedConstruction(card.associatedCard)
      ) {
        return true;
      }
    }

    // Queen (below 3 vp free)
    if (card.baseVP <= 3 && this.canPlaceWorkerOnCard(CardName.QUEEN)) {
      return true;
    }

    // Innkeeper (3 berries less)
    if (
      card.baseCost[ResourceType.BERRY] &&
      card.isCritter &&
      this.hasPlayedCard(CardName.INNKEEPER) &&
      this.isPaidResourcesValid(
        this.resources,
        card.baseCost,
        ResourceType.BERRY,
        false
      )
    ) {
      return true;
    }
    const wildDiscount =
      // Dungeon
      this.canInvokeDungeon() ||
      // Inn
      (isMeadowCard && this.canPlaceWorkerOnCard(CardName.INN)) ||
      // Crane
      (card.isConstruction && this.hasPlayedCard(CardName.CRANE));
    return this.isPaidResourcesValid(
      this.resources,
      card.baseCost,
      wildDiscount ? "ANY" : null,
      false
    );
  }

  payForCard(cardName: CardName, gameInput: GameInput): void {}

  isPaidResourcesValid(
    paidResources: CardCost,
    cardCost: CardCost,
    // Discounts are exclusive so we use a single argument to represent them
    discount: ResourceType.BERRY | "ANY" | null = null,
    errorIfOverpay: boolean = true
  ): boolean {
    const needToPay = {
      [ResourceType.TWIG]: cardCost[ResourceType.TWIG] || 0,
      [ResourceType.BERRY]: cardCost[ResourceType.BERRY] || 0,
      [ResourceType.PEBBLE]: cardCost[ResourceType.PEBBLE] || 0,
      [ResourceType.RESIN]: cardCost[ResourceType.RESIN] || 0,
    };
    const payingWith = {
      [ResourceType.TWIG]: paidResources[ResourceType.TWIG] || 0,
      [ResourceType.BERRY]: paidResources[ResourceType.BERRY] || 0,
      [ResourceType.PEBBLE]: paidResources[ResourceType.PEBBLE] || 0,
      [ResourceType.RESIN]: paidResources[ResourceType.RESIN] || 0,
    };
    const outstandingOwed = {
      [ResourceType.TWIG]: 0,
      [ResourceType.BERRY]: 0,
      [ResourceType.PEBBLE]: 0,
      [ResourceType.RESIN]: 0,
    };
    (Object.entries(needToPay) as [keyof CardCost, number][]).forEach(
      ([resourceType, count]) => {
        // Berry discount
        if (discount === ResourceType.BERRY && discount === resourceType) {
          count = Math.max(count - 3, 0);
        }
        if (count <= payingWith[resourceType]) {
          payingWith[resourceType] -= count;
        } else {
          count -= payingWith[resourceType];
          payingWith[resourceType] = 0;
          outstandingOwed[resourceType] += count;
        }
      }
    );

    const outstandingOwedSum = sumResources(outstandingOwed);
    const payingWithSum = sumResources(payingWith);
    if (discount === "ANY" && outstandingOwedSum === 3) {
      return true;
    }

    // Can only use judge if no other discounts are in effect
    if (!discount && this.hasPlayedCard(CardName.JUDGE)) {
      if (outstandingOwedSum === 1) {
        if (payingWithSum >= 1) {
          if (errorIfOverpay && payingWithSum !== 1) {
            throw new Error("Cannot overpay for cards");
          }
          return true;
        }
      }
    }
    if (payingWithSum !== 0 && errorIfOverpay) {
      throw new Error("Cannot overpay for cards");
    }
    return outstandingOwedSum === 0;
  }

  isPaymentOptionsValid(cardName: CardName, gameInput: GameInput): boolean {
    if (gameInput.inputType !== GameInputType.PLAY_CARD) {
      throw new Error("Invalid input type");
    }
    if (!gameInput.paymentOptions || !gameInput.paymentOptions.resources) {
      throw new Error("Invalid input");
    }
    // Validate if payment options is valid
    const cardToPlay = Card.fromName(gameInput.card);
    const paymentOptions = gameInput.paymentOptions;
    const paymentResources = paymentOptions.resources;
    if (paymentOptions.cardToDungeon) {
      if (!this.canInvokeDungeon()) {
        throw new Error("Invalid paymentOptions: cannot use dungeon");
      }
      if (!Card.fromName(paymentOptions.cardToDungeon).isCritter) {
        throw new Error("Invalid paymentOptions: can only dungeon critter");
      }
    }
    if (paymentOptions.cardToUse) {
      const cardToUse = Card.fromName(paymentOptions.cardToUse);
      if (!this.hasPlayedCard(paymentOptions.cardToUse)) {
        throw new Error(
          `Invalid paymentOptions: cannot use ${paymentOptions.cardToUse}`
        );
      }
      if (paymentOptions.cardToUse === CardName.CRANE) {
        if (!cardToPlay.isConstruction) {
          throw new Error(
            `Invalid paymentOptions: Cannot use Crane on ${cardToPlay.name}`
          );
        }
      } else if (paymentOptions.cardToUse === CardName.INNKEEPER) {
        if (!cardToPlay.isCritter) {
          throw new Error(
            `Invalid paymentOptions: Cannot use Innkeeper on ${cardToPlay.name}`
          );
        }
      } else if (paymentOptions.cardToUse === CardName.INN) {
        // TODO check if we can place a worker here
        if (!gameInput.fromMeadow) {
          throw new Error(
            `Invalid paymentOptions: Cannot use Inn on non-meadow card`
          );
        }
      } else if (paymentOptions.cardToUse === CardName.QUEEN) {
        // TODO check if we can place a worker here
        if (cardToPlay.baseVP > 3) {
          throw new Error(
            `Invalid paymentOptions: Cannot use Queen to play ${cardToPlay.name}`
          );
        }
        return true;
      } else {
        throw new Error(
          `Unexpected paymentOptions.cardToUse: ${paymentOptions.cardToUse}`
        );
      }
    }
    return false;
  }

  spendResources({
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
      if (this.resources[ResourceType.VP] < VP) {
        throw new Error(`Insufficient ${ResourceType.VP}`);
      }
      this.resources[ResourceType.VP] -= VP;
    }
    if (TWIG) {
      if (this.resources[ResourceType.TWIG] < TWIG) {
        throw new Error(`Insufficient ${ResourceType.TWIG}`);
      }
      this.resources[ResourceType.TWIG] -= TWIG;
    }
    if (BERRY) {
      if (this.resources[ResourceType.BERRY] < BERRY) {
        throw new Error(`Insufficient ${ResourceType.BERRY}`);
      }
      this.resources[ResourceType.BERRY] -= BERRY;
    }
    if (PEBBLE) {
      if (this.resources[ResourceType.PEBBLE] < PEBBLE) {
        throw new Error(`Insufficient ${ResourceType.PEBBLE}`);
      }
      this.resources[ResourceType.PEBBLE] -= PEBBLE;
    }
    if (RESIN) {
      if (this.resources[ResourceType.RESIN] < RESIN) {
        throw new Error(`Insufficient ${ResourceType.RESIN}`);
      }
      this.resources[ResourceType.RESIN] -= RESIN;
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
    return cloneDeep({
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
    });
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
    playedCards: {},
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
    claimedEvents: {},
  });
  return player;
};
