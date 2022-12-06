import isEqual from "lodash/isEqual";
import cloneDeep from "lodash/cloneDeep";
import omit from "lodash/omit";
import {
  AdornmentName,
  CardCost,
  CardName,
  CardType,
  CardWithSource,
  EventName,
  EventType,
  Season,
  ResourceType,
  GameInput,
  GameInputType,
  GameInputPlayCard,
  TextPartPlayer,
  PlayedCardInfo,
  PlayedEventInfo,
  WorkerPlacementInfo,
  LocationName,
  LocationType,
  PlayerStatus,
  IGameTextEntity,
  TrainTicketStatus,
  VisitorName,
} from "./types";
import { PlayerJSON } from "./jsonTypes";
import { GameState } from "./gameState";
import { Adornment } from "./adornment";
import { Visitor } from "./visitor";
import { Card } from "./card";
import { Event, oldEventEnums } from "./event";
import { Location } from "./location";
import { generate as uuid } from "short-uuid";
import { sumResources } from "./gameStatePlayHelpers";
import { assertUnreachable } from "../utils";

const CARDS_THAT_SHARE_SPACE: CardName[][] = [
  [CardName.HUSBAND, CardName.WIFE],
  [CardName.GREENHOUSE, CardName.FARM],
];

const CARDS_THAT_DONT_TAKE_SPACE: CardName[] = [
  CardName.AIR_BALLOON,
  CardName.EVER_WALL,
  CardName.MAIN_ROAD,
  CardName.MESSENGER,
  CardName.PIRATE,
  CardName.WANDERER,
];

export class Player implements IGameTextEntity {
  private playerSecret: string;

  readonly name: string;
  readonly playerId: string;

  readonly cardsInHand: CardName[];
  private _currentSeason: Season;
  private _numCardsInHand: number | null;

  private resources: Record<ResourceType, number>;
  readonly playedCards: Partial<Record<CardName, PlayedCardInfo[]>>;
  readonly claimedEvents: Partial<Record<EventName, PlayedEventInfo>>;

  private numWorkers: number;
  private placedWorkers: WorkerPlacementInfo[];

  private numAmbassadors: number;
  private _numGoldenLeaf: number;

  private playerStatus: PlayerStatus;

  private adornmentsInHand: AdornmentName[];
  private _numAdornmentsInHand: number | null;
  readonly playedAdornments: AdornmentName[];

  private reservedCard: CardName | "UNUSED" | "USED";
  private _trainTicketStatus: TrainTicketStatus | null;

  readonly claimedVisitors: VisitorName[];

  constructor({
    name,
    playerSecret = uuid(),
    playerId = uuid(),
    playedCards = {},
    cardsInHand = [],
    numCardsInHand = null,
    resources = {
      [ResourceType.VP]: 0,
      [ResourceType.TWIG]: 0,
      [ResourceType.BERRY]: 0,
      [ResourceType.PEBBLE]: 0,
      [ResourceType.RESIN]: 0,
      [ResourceType.PEARL]: 0,
    },
    currentSeason = Season.WINTER,
    numWorkers = 2,
    numGoldenLeaf = 0,
    numAmbassadors = 0,
    claimedEvents = {},
    placedWorkers = [],
    playerStatus = PlayerStatus.DURING_SEASON,
    adornmentsInHand = [],
    numAdornmentsInHand = null,
    playedAdornments = [],
    trainTicketStatus = null,
    reservedCard = "UNUSED",
    claimedVisitors = [],
  }: {
    name: string;
    playerSecret?: string;
    playerId?: string;
    playedCards?: Partial<Record<CardName, PlayedCardInfo[]>>;
    cardsInHand?: CardName[];
    numCardsInHand?: number | null;
    resources?: Record<ResourceType, number>;
    currentSeason?: Season;
    numWorkers?: number;
    numAmbassadors?: number;
    numGoldenLeaf?: number;
    claimedEvents?: Partial<Record<EventName, PlayedEventInfo>>;
    placedWorkers?: WorkerPlacementInfo[];
    playerStatus?: PlayerStatus;
    adornmentsInHand?: AdornmentName[];
    playedAdornments?: AdornmentName[];
    numAdornmentsInHand?: number | null;
    trainTicketStatus?: TrainTicketStatus | null;
    reservedCard?: CardName | "UNUSED" | "USED";
    claimedVisitors?: VisitorName[];
  }) {
    this.playerId = playerId;
    this.playerSecret = playerSecret;
    this.name = name;
    this.playedCards = playedCards;
    this.cardsInHand = cardsInHand;
    this.resources = resources;
    this._currentSeason = currentSeason;
    this.numWorkers = numWorkers;
    this.claimedEvents = claimedEvents;
    this.placedWorkers = placedWorkers;
    this.playerStatus = playerStatus;

    // pearlbrook only
    this.numAmbassadors = numAmbassadors;
    this.adornmentsInHand = adornmentsInHand;
    this.playedAdornments = playedAdornments;

    // newleaf only
    this._trainTicketStatus = trainTicketStatus;
    this._numGoldenLeaf = numGoldenLeaf;
    this.reservedCard = reservedCard;
    this.claimedVisitors = claimedVisitors;

    this._numCardsInHand = numCardsInHand;
    this._numAdornmentsInHand = numAdornmentsInHand;
  }

  get playerSecretUNSAFE(): string {
    return this.playerSecret;
  }

  getGameTextPart(): TextPartPlayer {
    return { type: "player", name: this.name };
  }

  drawCards(gameState: GameState, count: number): void {
    for (let i = 0; i < count; i++) {
      const drawnCard = gameState.drawCard();
      this.addCardToHand(gameState, drawnCard);
    }
  }

  updateStatus(status: PlayerStatus): void {
    // TODO validation
    this.playerStatus = status;
  }

  getStatus(): PlayerStatus {
    return this.playerStatus;
  }

  get maxCitySize(): number {
    const MAX_CITY_SIZE = 15;
    let citySize = MAX_CITY_SIZE;
    if (this.hasCardInCity(CardName.MAIN_ROAD)) {
      citySize += 1;
    }
    return citySize;
  }

  get maxHandSize(): number {
    const MAX_HAND_SIZE = 8;
    let additionalHandSize = 0;
    if (this.hasCardInCity(CardName.BRIDGE)) {
      additionalHandSize += this.getNumResourcesByType(ResourceType.PEARL);
    }
    if (this.hasCardInCity(CardName.BANK)) {
      const bank = this.getFirstPlayedCard(CardName.BANK);
      additionalHandSize += bank.resources![ResourceType.VP] as number;
    }
    return MAX_HAND_SIZE + additionalHandSize;
  }

  drawMaxCards(gameState: GameState): number {
    const numDrawn = this.maxHandSize - this.numCardsInHand;
    this.drawCards(gameState, numDrawn);
    return numDrawn;
  }

  addCardToHand(gameState: GameState, cardName: CardName): void {
    if (this.numCardsInHand < this.maxHandSize) {
      this.cardsInHand.push(cardName);
      if (this._numCardsInHand !== null) {
        this._numCardsInHand++;
      }
    } else {
      gameState.discardPile.addToStack(cardName);
    }
  }

  removeCardFromHand(
    gameState: GameState,
    cardName: CardName,
    addToDiscardPile: boolean = true
  ): void {
    const idx = this.cardsInHand.indexOf(cardName);
    if (idx === -1) {
      throw new Error(`Unable to discard ${cardName}`);
    } else {
      if (this._numCardsInHand !== null) {
        this._numCardsInHand--;
      }
      this.cardsInHand.splice(idx, 1);
    }
    if (addToDiscardPile) {
      gameState.discardPile.addToStack(cardName);
    }
  }

  getAdornmentsInHand(): AdornmentName[] {
    return [...this.adornmentsInHand];
  }

  addAdornmentCardToHand(adornmentName: AdornmentName): void {
    this.adornmentsInHand.push(adornmentName);
    if (this._numAdornmentsInHand !== null) {
      this._numAdornmentsInHand++;
    }
  }

  removeAdornmentCardFromHand(adornmentName: AdornmentName): void {
    const idx = this.adornmentsInHand.indexOf(adornmentName);
    if (idx === -1) {
      throw new Error(`Unable to discard ${adornmentName}`);
    }
    if (this._numAdornmentsInHand !== null) {
      this._numAdornmentsInHand--;
    }
    this.adornmentsInHand.splice(idx, 1);
  }

  addToCity(
    gameState: GameState,
    cardName: CardName,
    shouldRelocateMessengers = false
  ): PlayedCardInfo {
    if (!this.canAddToCity(cardName, true /* strict */)) {
      throw new Error(`Unable to add ${cardName} to city`);
    }
    const card = Card.fromName(cardName);
    this.playedCards[cardName] = this.playedCards[cardName] || [];
    const playedCard = card.getPlayedCardInfo(this.playerId);
    this.playedCards[cardName]!.push(playedCard);

    // If there's an unoccupied Messenger, and this card is a construction, pair them!
    const unpairedMessengers = this.getUnpairedMessengers();

    if (
      unpairedMessengers.length !== 0 &&
      card.isConstruction &&
      shouldRelocateMessengers
    ) {
      const unpairedMessenger = unpairedMessengers[0];
      this.relocateMessenger(gameState, this, unpairedMessenger, false);
    }

    return playedCard;
  }

  addToCityMulti(gameState: GameState, cards: CardName[]): void {
    cards.forEach((cardName) => this.addToCity(gameState, cardName));
  }

  removeCardFromCity(
    gameState: GameState,
    playedCardInfo: PlayedCardInfo,
    addToDiscardPile = true,
    shouldRelocateMessengers = true
  ): CardName[] {
    const player = gameState.getActivePlayer();
    const { cardName, pairedCards = [] } = playedCardInfo;

    const playedCards = this.playedCards[cardName];
    if (!playedCards) {
      throw new Error(`Unable to remove ${JSON.stringify(playedCardInfo)}`);
    }

    // Get the actual object so we can splice it out.
    const playedCardInfo_ = playedCards.find((x) => isEqual(x, playedCardInfo));
    if (!playedCardInfo_) {
      throw new Error(`Unable to find ${JSON.stringify(playedCardInfo)}`);
    }
    const idx = playedCards.indexOf(playedCardInfo_);
    if (idx === -1) {
      throw new Error(`Unable to find ${JSON.stringify(playedCardInfo)}`);
    }

    // Messenger
    if (playedCardInfo.shareSpaceWith) {
      // Removing a messenger, unset the corresponding construction.
      if (playedCardInfo.cardName === CardName.MESSENGER) {
        const sharedConstruction = (
          this.playedCards[playedCardInfo.shareSpaceWith] || []
        ).find(({ shareSpaceWith }) => {
          return shareSpaceWith === playedCardInfo.cardName;
        });
        if (!sharedConstruction) {
          throw new Error(
            "Couldn't find the Construction shared by the Messenger."
          );
        }
        player.updatePlayedCard(gameState, sharedConstruction, {
          shareSpaceWith: undefined,
        });
      } else {
        let sharedMessenger = (this.playedCards[CardName.MESSENGER] || []).find(
          ({ shareSpaceWith }) => {
            return shareSpaceWith === playedCardInfo.cardName;
          }
        );
        if (!sharedMessenger) {
          throw new Error(
            "Couldn't find the Messenger shared by the Construction."
          );
        }
        const cardOptions = player
          .getPlayedConstructions()
          .filter((playedCard) => {
            return !playedCard.shareSpaceWith;
          });

        if (cardOptions.length === 0) {
          // NOTE: Messenger stays in the city!
          // See: https://boardgamegeek.com/thread/2261133/article/32762766#32762766
          sharedMessenger = player.updatePlayedCard(
            gameState,
            sharedMessenger,
            {
              shareSpaceWith: undefined,
            }
          );
          gameState.addGameLogFromCard(CardName.MESSENGER, [
            Card.fromName(CardName.MESSENGER),
            " doesn't have a Construction to share a space with. ",
            "It'll share a space with the next played Construction.",
          ]);
        } else {
          sharedMessenger = player.updatePlayedCard(
            gameState,
            sharedMessenger,
            {
              shareSpaceWith: undefined,
            }
          );
          if (shouldRelocateMessengers) {
            this.relocateMessenger(gameState, player, sharedMessenger);
          }
        }
      }
    }

    // Remove playedCard
    playedCards.splice(idx, 1);

    // Some cards that contain other cards (eg. dungeon)
    const removedCards: CardName[] = [cardName, ...pairedCards];
    if (addToDiscardPile) {
      removedCards.forEach((card) => {
        gameState.discardPile.addToStack(card);
      });
    }
    return removedCards;
  }

  handlePlayedGameInputs(gameState: GameState, gameInputs: GameInput[]): void {
    const pendingPlayCardGameInput = gameInputs.filter(
      (x) => x.inputType === GameInputType.PLAY_CARD
    ) as GameInputPlayCard[];

    // Reverse array so we can process from back to front.
    pendingPlayCardGameInput.reverse();

    // Keep track of pending cards names.
    const pendingCardNames = pendingPlayCardGameInput.map(
      (gameInput) => gameInput.clientOptions.card
    );

    while (pendingPlayCardGameInput.length !== 0) {
      const gameInput = pendingPlayCardGameInput.pop() as GameInputPlayCard;
      pendingCardNames.pop();
      [
        CardName.HISTORIAN,
        CardName.SHOPKEEPER,
        CardName.COURTHOUSE,
        CardName.MUSEUM,
        CardName.CITY_HALL,
        CardName.DIPLOMAT,
      ].forEach((cardName) => {
        // Don't trigger if we just played this card and we haven't gotten to it yet.
        // Eg. We played POSTAL_PIGEON -> SHOPKEEPER. We shouldn't activate SHOPKEEPER
        // on the POSTAL_PIGEON.
        if (pendingCardNames.indexOf(cardName) !== -1) {
          return;
        }

        if (this.hasCardInCity(cardName)) {
          const card = Card.fromName(cardName);
          card.activateCard(
            gameState,
            gameInput,
            this,
            this.getFirstPlayedCard(cardName)
          );
        }
      });
    }
  }

  relocateMessenger(
    gameState: GameState,
    player: Player,
    messenger: PlayedCardInfo,
    // whether or not we're relocating as result of construction being destroyed
    constructionDestroyed = true
  ): void {
    // get all constructions that messenger could share space with
    const cardOptions = player.getPlayedConstructions().filter((playedCard) => {
      return !playedCard.shareSpaceWith;
    });

    if (constructionDestroyed) {
      gameState.addGameLogFromCard(CardName.MESSENGER, ["needs a new space."]);
    } else {
      gameState.addGameLogFromCard(CardName.MESSENGER, [
        "Unpaired ",
        Card.fromName(CardName.MESSENGER),
        " needs a new space.",
      ]);
    }

    // allow player to select card for messenger to share space with
    gameState.pendingGameInputs.push({
      inputType: GameInputType.SELECT_PLAYED_CARDS,
      prevInputType: GameInputType.PLAY_CARD,
      label: "Select a new Construction to share a space with",
      cardOptions,
      cardContext: CardName.MESSENGER,
      playedCardContext: messenger,
      maxToSelect: 1,
      minToSelect: 1,
      clientOptions: {
        selectedCards: [],
      },
    });
  }

  getUnpairedMessengers(): PlayedCardInfo[] {
    return this.getPlayedCardForCardName(CardName.MESSENGER).filter(
      ({ shareSpaceWith }) => {
        return !shareSpaceWith;
      }
    );
  }

  getNumOccupiedSpacesInCity(forScoring: boolean = false): number {
    let numOccupiedSpacesInCity = 0;
    this.forEachPlayedCard(({ cardName }) => {
      if (CARDS_THAT_DONT_TAKE_SPACE.includes(cardName)) {
        return;
      }
      numOccupiedSpacesInCity += 1;
    });

    // Account for unpaired messengers.
    numOccupiedSpacesInCity += this.getUnpairedMessengers().length;

    // For scoring, we want the max number of occupied spots possible.
    if (forScoring) {
      return Math.min(this.maxCitySize, numOccupiedSpacesInCity);
    }

    CARDS_THAT_SHARE_SPACE.forEach((cards) => {
      let numSets = this.getNumPlayedCard(cards[0]);
      cards.forEach(
        (c) => (numSets = Math.min(numSets, this.getNumPlayedCard(c)))
      );
      numOccupiedSpacesInCity -= numSets * (cards.length - 1);
    });

    return numOccupiedSpacesInCity;
  }

  // should always use strict unless there's a chance you'll remove something
  // before you add to the city (eg, removing an Innkeeper to play another card)
  canAddToCity(cardName: CardName, strict: boolean): boolean {
    const card = Card.fromName(cardName);
    if (card.isUnique && this.hasCardInCity(card.name)) {
      return false;
    }
    if (cardName === CardName.MESSENGER) {
      // Must have more Constructions than Messengers.
      return (
        this.getPlayedConstructions().length -
          this.getPlayedCardForCardName(CardName.MESSENGER).length >
        0
      );
    }

    if (CARDS_THAT_DONT_TAKE_SPACE.includes(cardName)) {
      return true;
    }

    if (card.isConstruction && this.getUnpairedMessengers().length !== 0) {
      return true;
    }

    // If strict is true, we're about to add this card to the city
    // otherwise, account for cards that can make space.
    if (!strict) {
      if (card.isCritter && this.hasCardInCity(CardName.INNKEEPER)) {
        return true;
      }
      if (card.isConstruction && this.hasCardInCity(CardName.CRANE)) {
        return true;
      }
      if (this.hasCardInCity(CardName.INVENTOR)) {
        return true;
      }
      if (this.canInvokeDungeon()) {
        return true;
      }
    }

    if (
      cardName === CardName.RUINS &&
      this.getPlayedConstructions().length !== 0
    ) {
      return true;
    }

    for (let i = 0; i < CARDS_THAT_SHARE_SPACE.length; i++) {
      const cardsSet = CARDS_THAT_SHARE_SPACE[i];
      if (cardsSet.includes(cardName)) {
        const countByCard = cardsSet.map((c) => this.getNumPlayedCard(c));
        const maxCount = Math.max(...countByCard);
        if (this.getNumPlayedCard(cardName) < maxCount) {
          return true;
        }
      }
    }

    const numOccupiedSpacesInCity = this.getNumOccupiedSpacesInCity();
    return numOccupiedSpacesInCity < this.maxCitySize;
  }

  hasCardInCity(cardName: CardName): boolean {
    return this.getPlayedCardForCardName(cardName).length !== 0;
  }

  useConstructionToPlayCritter(cardName: CardName): void {
    const card = Card.fromName(cardName);
    if (!card.isConstruction) {
      throw new Error("Can only occupy construction");
    }
    let didOccupy = false;
    this.getPlayedCardForCardName(cardName).forEach((playedCardInfo) => {
      if (!didOccupy && !playedCardInfo.usedForCritter) {
        playedCardInfo.usedForCritter = true;
        didOccupy = true;
      }
    });
    if (!didOccupy) {
      throw new Error("No unoccupied construction found");
    }
  }

  getClaimedEvent(eventName: EventName): PlayedEventInfo | undefined {
    if (this.claimedEvents[eventName]) {
      return this.claimedEvents[eventName];
    }

    // See comment above oldEventEnums.
    const oldEventName = Object.keys(this.claimedEvents).find(
      (oldEventName) => {
        if (oldEventEnums[oldEventName]) {
          const oldName = oldEventEnums[oldEventName];
          return EventName[oldName as keyof typeof EventName] === eventName;
        }
      }
    );

    if (oldEventName) {
      return this.claimedEvents[oldEventName as EventName];
    }
    return undefined;
  }

  getNumClaimedEvents(): number {
    return Object.keys(this.claimedEvents).length;
  }

  getNumClaimedEventsByType(eventType: EventType): number {
    let numEvents = 0;
    for (const eventName of Object.keys(this.claimedEvents)) {
      if (Event.fromName(eventName as EventName).type === eventType) {
        numEvents++;
      }
    }
    return numEvents;
  }

  getNumHusbandWifePairs(): number {
    return Math.min(
      this.getNumPlayedCard(CardName.HUSBAND),
      this.getNumPlayedCard(CardName.WIFE)
    );
  }

  getPointsFromCards(gameState: GameState): number {
    let points = 0;
    this.forEachPlayedCard(({ cardName, resources = {} }) => {
      const card = Card.fromName(cardName);
      points += card.getPoints(this, gameState);
      points += resources[ResourceType.VP] || 0;
    });
    points += 3 * this.getNumHusbandWifePairs();
    return points;
  }

  getPointsFromWonders(gameState: GameState): number {
    let points = 0;
    Object.keys(this.claimedEvents).forEach((eventName) => {
      const event = Event.fromName(eventName as EventName);
      if (event.type === EventType.WONDER) {
        points += event.getPoints(this, gameState);
      }
    });
    return points;
  }

  getPointsFromEvents(gameState: GameState): number {
    let points = 0;
    Object.keys(this.claimedEvents).forEach((eventName) => {
      const event = Event.fromName(eventName as EventName);
      if (event.type === EventType.WONDER) {
        // Count these separately
        return;
      }
      points += event.getPoints(this, gameState);
      const eventInfo = this.claimedEvents[eventName as EventName];
      if (eventInfo && eventInfo.storedResources) {
        points += eventInfo.storedResources[ResourceType.VP] || 0;
      }
    });
    return points;
  }

  getPointsFromJourney(gameState: GameState): number {
    let points = 0;
    this.placedWorkers.forEach((placeWorker) => {
      if (placeWorker.location) {
        const location = Location.fromName(placeWorker.location);
        points += location.getPoints(this, gameState);
      }
    });
    return points;
  }

  getPointsFromAdornments(gameState: GameState): number {
    let points = 0;
    this.playedAdornments.forEach((adornmentName) => {
      const adornment = Adornment.fromName(adornmentName as AdornmentName);
      points += adornment.getPoints(this, gameState);
    });
    return points;
  }

  getPointsFromVisitors(gameState: GameState): number {
    let points = 0;
    this.claimedVisitors.forEach((visitorName) => {
      const visitor = Visitor.fromName(visitorName as VisitorName);
      points += visitor.getPoints(this, gameState);
    });
    return points;
  }

  getPlayerForPoints(): Player {
    if (process.env.NODE_ENV !== "production") {
      return Player.fromJSON(this.toJSON(false /* includePrivate */));
    }
    return this;
  }

  getPoints(gameState: GameState): number {
    const player = this.getPlayerForPoints();

    let points = 0;
    points += player.getPointsFromCards(gameState);
    points += player.getPointsFromEvents(gameState);
    points += player.getPointsFromWonders(gameState);
    points += player.getPointsFromJourney(gameState);
    points += player.getPointsFromAdornments(gameState);
    points += player.getNumResourcesByType(ResourceType.VP);
    points += player.getNumResourcesByType(ResourceType.PEARL) * 2;
    points += player.getPointsFromVisitors(gameState);
    return points;
  }

  getNumWorkersOnJourney(gameState: GameState): number {
    let numWorkersOnJourney = 0;
    this.placedWorkers.forEach((placeWorker) => {
      if (placeWorker.location) {
        const location = Location.fromName(placeWorker.location);
        if (location.type === LocationType.JOURNEY) {
          numWorkersOnJourney++;
        }
      }
    });
    return numWorkersOnJourney;
  }

  getResources(): Record<ResourceType, number> {
    return { ...this.resources };
  }

  getCardCostResources(): CardCost {
    return {
      [ResourceType.TWIG]: this.getNumResourcesByType(ResourceType.TWIG),
      [ResourceType.BERRY]: this.getNumResourcesByType(ResourceType.BERRY),
      [ResourceType.PEBBLE]: this.getNumResourcesByType(ResourceType.PEBBLE),
      [ResourceType.RESIN]: this.getNumResourcesByType(ResourceType.RESIN),
    };
  }

  getNumCardCostResources(): number {
    return (
      this.getNumResourcesByType(ResourceType.TWIG) +
      this.getNumResourcesByType(ResourceType.BERRY) +
      this.getNumResourcesByType(ResourceType.PEBBLE) +
      this.getNumResourcesByType(ResourceType.RESIN)
    );
  }

  getNumResources(): number {
    return sumResources(this.resources);
  }

  getNumResourcesByType(
    resourceType: ResourceType,
    includeStoredResources: boolean = false
  ): number {
    let numResources = this.resources[resourceType] || 0;

    if (includeStoredResources) {
      switch (resourceType) {
        case ResourceType.TWIG:
        case ResourceType.PEBBLE:
        case ResourceType.RESIN:
        case ResourceType.BERRY:
        case ResourceType.VP:
          this.forEachPlayedCard(({ resources = {} }) => {
            numResources += resources[resourceType] || 0;
          });

          Object.keys(this.claimedEvents).forEach((eventName) => {
            const eventInfo = this.claimedEvents[eventName as EventName];
            if (eventInfo && eventInfo.storedResources) {
              numResources += eventInfo.storedResources[resourceType] || 0;
            }
          });
          break;

        case ResourceType.PEARL:
          break;

        default:
          assertUnreachable(resourceType, "unexpected ResourceType");
      }
    }

    return numResources;
  }

  getPlayedConstructions(): PlayedCardInfo[] {
    return this.getPlayedCards((card) => card.isConstruction);
  }

  getNumPlayedConstructions(): number {
    return this.getPlayedConstructions().length;
  }

  getNumPlayedUniqueConstructions(): number {
    return this.getPlayedCards((card) => card.isConstruction && card.isUnique)
      .length;
  }

  getNumPlayedCommonConstructions(): number {
    return this.getPlayedCards((card) => card.isConstruction && !card.isUnique)
      .length;
  }

  getNumPlayedUniqueCritters(): number {
    return this.getPlayedCards((card) => card.isCritter && card.isUnique)
      .length;
  }

  getNumPlayedCommonCritters(): number {
    return this.getPlayedCards((card) => card.isCritter && !card.isUnique)
      .length;
  }

  getNumPlayedCritters(): number {
    return this.getPlayedCritters().length;
  }

  getNumPlayedCard(cardName: CardName): number {
    return (this.playedCards[cardName] || []).length;
  }

  getPlayedCritters(): PlayedCardInfo[] {
    return this.getPlayedCards((card) => card.isCritter);
  }

  forEachPlayedCard(callback: (playedCardInfo: PlayedCardInfo) => void): void {
    for (const [_, playedCards] of Object.entries(this.playedCards)) {
      playedCards?.forEach(callback);
    }
  }

  getPlayedCards(
    filter?: (card: Card, x: PlayedCardInfo) => boolean
  ): PlayedCardInfo[] {
    const ret: PlayedCardInfo[] = [];
    this.forEachPlayedCard((x) => {
      if (!filter || filter(Card.fromName(x.cardName), x)) {
        ret.push(x);
      }
    });
    return ret;
  }

  getNumCardsInCity(): number {
    return this.getPlayedCards().length;
  }

  getNumCardType(cardType: CardType): number {
    return this.getAllPlayedCardsByType(cardType).length;
  }

  // Returns all played destination cards that a player has played that have
  // room for another worker
  getAllAvailableDestinationCards(): PlayedCardInfo[] {
    return this.getPlayedCards((card, { workers = [] }) => {
      return card.getNumWorkerSpotsForPlayer(this) > workers.length;
    });
  }

  // returns all non-Open destination or storehouse cards that were played by player and
  // are available for them to put a worker on
  getAvailableClosedDestinationCards(): PlayedCardInfo[] {
    return this.getAllAvailableDestinationCards().filter(({ cardName }) => {
      const card = Card.fromName(cardName);
      return !card.isOpenDestination;
    });
  }

  // returns all destination cards played by this player that are "open"
  // and are available to take other workers
  getAvailableOpenDestinationCards(): PlayedCardInfo[] {
    return this.getAllAvailableDestinationCards().filter(({ cardName }) => {
      const card = Card.fromName(cardName);
      return card.isOpenDestination;
    });
  }

  getAllPlayedCardsByType(cardType: CardType): PlayedCardInfo[] {
    return this.getPlayedCards((card) => card.cardType === cardType);
  }

  getPlayedCardForCardName(cardName: CardName): PlayedCardInfo[] {
    const playedCardInfos = this.playedCards[cardName];
    return playedCardInfos || [];
  }

  getFirstPlayedCard(cardName: CardName): PlayedCardInfo {
    const playedCards = this.getPlayedCardForCardName(cardName);
    if (playedCards.length === 0) {
      throw new Error(`Cannot find played card for: ${cardName}`);
    }
    return playedCards[0];
  }

  updatePlayedCard(
    gameState: GameState,
    origPlayedCard: PlayedCardInfo,
    playedCardChanges: Partial<PlayedCardInfo>
  ): PlayedCardInfo {
    let found = false;
    const origPlayedCardCopy = cloneDeep(origPlayedCard);
    const cardName = origPlayedCard.cardName;

    const newPlayedCard = {} as PlayedCardInfo;
    Object.assign(newPlayedCard, origPlayedCard, playedCardChanges);

    this.playedCards[cardName] = this.getPlayedCardForCardName(cardName).map(
      (x) => {
        if (!found && isEqual(x, origPlayedCardCopy)) {
          found = true;
          return newPlayedCard;
        } else {
          return x;
        }
      }
    );

    // Make sure we update all existing playedCardInfo references.
    gameState.updatePendingGameInputs((gameInput) => {
      switch (gameInput.inputType) {
        case GameInputType.SELECT_CARDS:
        case GameInputType.SELECT_LOCATION:
        case GameInputType.SELECT_PAYMENT_FOR_CARD:
        case GameInputType.SELECT_RESOURCES:
        case GameInputType.DISCARD_CARDS:
        case GameInputType.SELECT_PLAYER:
        case GameInputType.SELECT_WORKER_PLACEMENT:
        case GameInputType.SELECT_PLAYED_ADORNMENT:
        case GameInputType.SELECT_RIVER_DESTINATION:
        case GameInputType.SELECT_CARDS_WITH_SOURCE:
        case GameInputType.SELECT_TRAIN_CAR_TILE:
        case GameInputType.SELECT_VISITOR:
          return gameInput;

        case GameInputType.SELECT_OPTION_GENERIC:
          if (
            gameInput.playedCardContext &&
            isEqual(gameInput.playedCardContext, origPlayedCardCopy)
          ) {
            return {
              ...gameInput,
              playedCardContext: newPlayedCard,
            };
          }
          return gameInput;
        case GameInputType.SELECT_PLAYED_CARDS:
          return {
            ...gameInput,
            cardOptions: gameInput.cardOptions.map((x) =>
              isEqual(x, origPlayedCardCopy) ? newPlayedCard : x
            ),
          };

        default:
          assertUnreachable(gameInput, JSON.stringify(gameInput, null, 2));
      }
    });

    if (!found) {
      throw new Error(
        `Cannot find played card for: ${
          origPlayedCard.cardName
        }\n ${JSON.stringify(origPlayedCard, null, 2)}`
      );
    }

    return Object.freeze(newPlayedCard);
  }

  findPlayedCard(
    playedCard: PlayedCardInfo,
    withOwnWorker: boolean = true
  ): Readonly<PlayedCardInfo> | undefined {
    const toOmit = ["workers"];
    const playedCardWoWorkers = omit(playedCard, toOmit);

    let ret: PlayedCardInfo | undefined;
    ret = this.getPlayedCardForCardName(playedCard.cardName).find((x) => {
      // If withOwnWorker is specified, don't rely on the given playedCard's worker field.
      // Instead make sure the card we're selecting has the player's own worker on it.
      if (withOwnWorker) {
        return (
          isEqual(omit(x, toOmit), playedCardWoWorkers) &&
          x?.workers?.length !== 0 &&
          x?.workers?.indexOf(this.playerId) !== -1
        );
      } else {
        return isEqual(x, playedCard);
      }
    });
    if (!ret) {
      // Omit workers from comparison because we might have placed a worker.
      ret =
        this.getPlayedCardForCardName(playedCard.cardName).find((x) => {
          return isEqual(omit(x, toOmit), playedCardWoWorkers);
        }) ||
        // Be a little forgiving here because we might have stale references in
        // pending gameInput.
        this.getPlayedCardForCardName(playedCard.cardName)[0];
    }
    if (ret) {
      return Object.freeze(ret);
    }
  }

  hasUnoccupiedConstruction(cardName: CardName): boolean {
    return !!(
      Card.fromName(cardName).isConstruction &&
      this.playedCards[cardName]?.some(
        (playedCard) => !playedCard.usedForCritter
      )
    );
  }

  canInvokeDungeon(): boolean {
    if (!this.hasCardInCity(CardName.DUNGEON)) {
      return false;
    }
    const playedDungeon = this.getFirstPlayedCard(CardName.DUNGEON);
    const numDungeoned = playedDungeon.pairedCards?.length || 0;
    const maxDungeoned = this.hasCardInCity(CardName.RANGER) ? 2 : 1;
    // Need to have a critter to dungeon
    const playedCritters = this.getPlayedCritters();
    if (
      // there are no played critters
      playedCritters.length === 0 ||
      // dungeon has 1 and the only critter in your city is a ranger
      (numDungeoned === 1 &&
        playedCritters.length === 1 &&
        playedCritters[0].cardName === CardName.RANGER)
    ) {
      return false;
    }
    return numDungeoned < maxDungeoned;
  }

  get numAvailableWorkers(): number {
    return this.numWorkers - this.placedWorkers.length;
  }

  activateProduction(gameState: GameState, gameInput: GameInput): void {
    this.getAllPlayedCardsByType(CardType.PRODUCTION).forEach((playedCard) => {
      const card = Card.fromName(playedCard.cardName);
      card.activateCard(gameState, gameInput, this, playedCard);
    });
  }

  placeWorkerOnLocation(location: LocationName): void {
    this.placeWorkerCommon({
      location,
    });
  }

  placeWorkerOnEvent(eventName: EventName): void {
    this.placeWorkerCommon({ event: eventName });

    const event = Event.fromName(eventName);
    this.claimedEvents[eventName] = event.getPlayedEventInfo();
  }

  placeWorkerOnCard(gameState: GameState, playedCard: PlayedCardInfo): void {
    const { cardName, cardOwnerId } = playedCard;
    const cardOwner = gameState.getPlayer(cardOwnerId);
    const card = Card.fromName(cardName);

    const origPlayedCard = cardOwner.findPlayedCard(
      playedCard,
      false /* withWorker */
    );
    if (!origPlayedCard) {
      throw new Error(
        `Could not find played card: ${JSON.stringify(playedCard, null, 2)}`
      );
    }

    if (!this.canPlaceWorkerOnCard(origPlayedCard)) {
      throw new Error(
        `Cannot place worker on card: ${JSON.stringify(playedCard, null, 2)}`
      );
    }

    const workers = origPlayedCard.workers || [];
    if (workers.length >= card.getNumWorkerSpotsForPlayer(cardOwner)) {
      throw new Error(`Couldn't place worker: ${JSON.stringify(playedCard)}`);
    }

    workers.push(this.playerId);

    cardOwner.updatePlayedCard(gameState, origPlayedCard, { workers });

    this.placeWorkerCommon({ playedCard });
  }

  private placeWorkerCommon(workerPlacementInfo: WorkerPlacementInfo): void {
    if (this.numAvailableWorkers === 0) {
      throw new Error(`Cannot place worker`);
    }
    this.placedWorkers.push(workerPlacementInfo);
  }

  canPlaceWorkerOnCard(playedCard: PlayedCardInfo | undefined): boolean {
    if (!playedCard) {
      return false;
    }
    if (this.numAvailableWorkers <= 0) {
      return false;
    }
    const { cardName, cardOwnerId, workers = [] } = playedCard;
    const card = Card.fromName(cardName);
    if (cardOwnerId !== this.playerId && !card.isOpenDestination) {
      return false;
    }

    return card.getNumWorkerSpotsForPlayer(this) > workers.length;
  }

  getUnoccupiedConstructionUsingGoldenLeaf(cardName: CardName): CardName[] {
    const card = Card.fromName(cardName);
    if (this.numGoldenLeaf <= 0 || card.isConstruction) {
      return [];
    }

    const cardOptions: CardName[] = [];
    const cardToPlayMatcher = [
      { type: "GOLDEN_LEAF", cardType: card.cardType },
      {
        type: "GOLDEN_LEAF",
        cardType: card.isUnique ? "UNIQUE" : "COMMON",
      },
    ];
    this.getPlayedConstructions().forEach((playedCardInfo) => {
      if (playedCardInfo.usedForCritter) {
        return;
      }
      const cardToOccupy = Card.fromName(playedCardInfo.cardName);
      if (card.associatedCard.type === "GOLDEN_LEAF") {
        switch (card.associatedCard.cardType) {
          case "UNIQUE":
            if (cardToOccupy.isUnique) {
              cardOptions.push(cardToOccupy.name);
              return;
            }
            break;
          case "COMMON":
            if (!cardToOccupy.isUnique) {
              cardOptions.push(cardToOccupy.name);
              return;
            }
            break;
          case cardToOccupy.cardType:
            cardOptions.push(cardToOccupy.name);
            return;

          default:
            break;
        }
      }
      if (
        cardToOccupy.associatedCard.type === "GOLDEN_LEAF" &&
        cardToPlayMatcher.some((m) => isEqual(m, cardToOccupy.associatedCard))
      ) {
        cardOptions.push(cardToOccupy.name);
      }
    });
    return cardOptions;
  }

  canAffordCard(
    cardName: CardName,
    cardSource: CardWithSource["source"] | null,
    forceDiscount: "ANY 1" | null = null
  ): boolean {
    const card = Card.fromName(cardName);

    // if we are forcing a specific discount, don't do any other check +
    // enforce that this discount is used
    if (forceDiscount) {
      return this.isPaidResourcesValid(
        this.resources,
        card.baseCost,
        "ANY 1",
        false
      );
    }

    // Check if you have the associated construction if card is a critter
    if (card.isCritter) {
      if (this.hasUnoccupiedConstruction(CardName.EVERTREE)) {
        return true;
      }
      if (card.associatedCard.type == "CARD") {
        if (this.hasUnoccupiedConstruction(card.associatedCard.cardName)) {
          return true;
        }
      }
      if (
        this.getUnoccupiedConstructionUsingGoldenLeaf(cardName).length !== 0
      ) {
        return true;
      }
    }

    // Queen (below 3 vp free)
    if (
      card.baseVP <= 3 &&
      this.hasCardInCity(CardName.QUEEN) &&
      this.canPlaceWorkerOnCard(this.getFirstPlayedCard(CardName.QUEEN))
    ) {
      return true;
    }

    // Innkeeper (3 berries less)
    if (
      card.baseCost[ResourceType.BERRY] &&
      card.isCritter &&
      this.hasCardInCity(CardName.INNKEEPER) &&
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
      // Inventor
      this.hasCardInCity(CardName.INVENTOR) ||
      // Crane
      (card.isConstruction && this.hasCardInCity(CardName.CRANE));

    if (cardSource === "RESERVED") {
      return this.isPaidResourcesValid(
        this.resources,
        card.baseCost,
        "ANY 1",
        false
      );
    }

    return this.isPaidResourcesValid(
      this.resources,
      card.baseCost,
      wildDiscount ? "ANY 3" : null,
      false
    );
  }

  validatePaidResources(
    paidResources: CardCost,
    cardCost: CardCost,
    // Discounts are exclusive so we use a single argument to represent them
    discount: ResourceType.BERRY | "ANY 3" | "ANY 1" | null = null,
    errorIfOverpay = true
  ): string | null {
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

    const needToPaySum = sumResources(needToPay);
    const payingWithSum = sumResources(payingWith);

    // Take discounts first
    if (discount === ResourceType.BERRY) {
      needToPay[ResourceType.BERRY] = Math.max(
        0,
        needToPay[ResourceType.BERRY] - 3
      );
    }

    (Object.entries(needToPay) as [keyof CardCost, number][]).forEach(
      ([resourceType, count]) => {
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
    const payingWithRemainerSum = sumResources(payingWith);

    // With wild discount, should have outstandingOwedSum left
    if (discount === "ANY 3" && outstandingOwedSum <= 3) {
      if (
        errorIfOverpay &&
        payingWithSum !== 0 &&
        payingWithSum + 3 > needToPaySum
      ) {
        return "Cannot overpay for cards";
      }
      return null;
    }

    if (discount === "ANY 1" && outstandingOwedSum <= 1) {
      if (
        errorIfOverpay &&
        payingWithSum !== 0 &&
        payingWithSum + 1 > needToPaySum
      ) {
        return "Cannot overpay for cards";
      }
      return null;
    }

    // Can only use judge if no other discounts are in effect
    if (!discount && this.hasCardInCity(CardName.JUDGE)) {
      if (outstandingOwedSum === 1) {
        if (payingWithRemainerSum >= 1) {
          if (errorIfOverpay && payingWithRemainerSum !== 1) {
            return "Cannot overpay for cards";
          }
          return null;
        }
      }
    }
    if (
      outstandingOwedSum === 0 &&
      payingWithRemainerSum !== 0 &&
      errorIfOverpay
    ) {
      return "Cannot overpay for cards";
    }
    if (outstandingOwedSum !== 0) {
      return `Paid resources is insufficient: paid=${JSON.stringify(
        paidResources
      )}, cost=${JSON.stringify(cardCost)}, discount=${discount}`;
    }
    return null;
  }

  isPaidResourcesValid(
    paidResources: CardCost,
    cardCost: CardCost,
    // Discounts are exclusive so we use a single argument to represent them
    discount: ResourceType.BERRY | "ANY 3" | "ANY 1" | null = null,
    errorIfOverpay = true
  ): boolean {
    return !this.validatePaidResources(
      paidResources,
      cardCost,
      discount,
      errorIfOverpay
    );
  }

  payForCard(
    gameState: GameState,
    gameInput: GameInput & {
      inputType:
        | GameInputType.PLAY_CARD
        | GameInputType.SELECT_PAYMENT_FOR_CARD;
    }
  ): void {
    if (!gameInput.clientOptions?.card) {
      throw new Error(`Must specify card to pay for`);
    }
    const card = Card.fromName(gameInput.clientOptions.card);
    const paymentOptions = gameInput.clientOptions.paymentOptions;
    const paymentResources = paymentOptions.resources;

    this.spendResources(paymentResources);

    if (paymentOptions.useAssociatedCard) {
      let hasUsed = false;
      const playedCardsToCheck: PlayedCardInfo[] = [];
      if (card.associatedCard.type === "CARD") {
        playedCardsToCheck.push(
          ...this.getPlayedCardForCardName(card.associatedCard.cardName)
        );
      }
      playedCardsToCheck.push(
        ...this.getPlayedCardForCardName(CardName.EVERTREE)
      );
      playedCardsToCheck.forEach((playedCard) => {
        if (!hasUsed) {
          if (!playedCard.usedForCritter) {
            playedCard.usedForCritter = true;
            hasUsed = true;
          }
        }
      });
    }

    if (paymentOptions.occupyCardWithGoldenLeaf) {
      let hasUsed = false;
      this.getPlayedCardForCardName(
        paymentOptions.occupyCardWithGoldenLeaf
      ).forEach((playedCard) => {
        if (!hasUsed) {
          if (!playedCard.usedForCritter) {
            playedCard.usedForCritter = true;
            hasUsed = true;
            this.useGoldenLeaf();
          }
        }
      });
    }

    if (paymentOptions.cardToDungeon) {
      const playedDungeon = this.getFirstPlayedCard(CardName.DUNGEON);

      // check if dungeon already has a card under it
      const pairedCards = playedDungeon.pairedCards;
      if (pairedCards && pairedCards.length === 1) {
        // if so, check that player is not trying to dungeon a ranger
        if (paymentOptions.cardToDungeon === CardName.RANGER) {
          throw new Error(`Cannot use Ranger in second spot of the Dungeon`);
        }
      }

      this.removeCardFromCity(
        gameState,
        this.getFirstPlayedCard(paymentOptions.cardToDungeon)
      );
      playedDungeon.pairedCards!.push(paymentOptions.cardToDungeon);
    } else if (paymentOptions.cardToUse) {
      switch (paymentOptions.cardToUse) {
        case CardName.CRANE:
        case CardName.INVENTOR:
        case CardName.INNKEEPER:
          this.removeCardFromCity(
            gameState,
            this.getFirstPlayedCard(paymentOptions.cardToUse)
          );
          break;
        case CardName.QUEEN:
        case CardName.INN:
        case CardName.HOTEL:
          if (gameInput.inputType === GameInputType.PLAY_CARD) {
            this.placeWorkerOnCard(
              gameState,
              this.getFirstPlayedCard(paymentOptions.cardToUse)
            );
          }
          break;
        default:
          assertUnreachable(
            paymentOptions.cardToUse,
            `Unexpected card: ${paymentOptions.cardToUse}`
          );
      }
    }
  }

  validatePaymentOptions(
    gameInput: GameInput & { inputType: GameInputType.PLAY_CARD }
  ): string | null {
    if (!gameInput.clientOptions?.card) {
      return `Must specify card to play`;
    }
    if (!gameInput?.clientOptions?.paymentOptions?.resources) {
      return `Invalid input: missing clientOptions.paymentOptions.resources in gameInput: ${JSON.stringify(
        gameInput,
        null,
        2
      )}`;
    }

    const paymentOptions = gameInput.clientOptions.paymentOptions;
    const paymentResources = paymentOptions.resources;

    // Validate if player has resources specified by payment options
    const resourceToPayList = Object.entries(paymentResources) as [
      ResourceType,
      number
    ][];
    for (let i = 0; i < resourceToPayList.length; i++) {
      const [resourceType, count] = resourceToPayList[i];
      if (this.getNumResourcesByType(resourceType) < count) {
        return `Can't spend ${count} ${resourceType}, you have: ${this.getNumResourcesByType(
          resourceType
        )}`;
      }
    }

    // Validate if payment options are valid for the card
    const cardToPlay = Card.fromName(gameInput.clientOptions.card);

    // Check if you have the associated construction if card is a critter
    if (paymentOptions.useAssociatedCard) {
      if (!cardToPlay.isCritter || !cardToPlay.associatedCard) {
        return `Cannot use associated card to play ${cardToPlay.name}`;
      }

      if (
        !this.hasUnoccupiedConstruction(CardName.EVERTREE) &&
        !(
          cardToPlay.associatedCard.type === "CARD" &&
          this.hasUnoccupiedConstruction(cardToPlay.associatedCard.cardName)
        )
      ) {
        return `Cannot find associated card to play ${cardToPlay.name}`;
      }
      return null;
    }

    if (paymentOptions.occupyCardWithGoldenLeaf) {
      if (!cardToPlay.isCritter) {
        return `Cannot use associated card to play ${cardToPlay.name}`;
      }
      if (this.numGoldenLeaf <= 0) {
        return `No more Golden Leaf left to use`;
      }
      const cardToOccupy = Card.fromName(
        paymentOptions.occupyCardWithGoldenLeaf
      );
      if (!this.hasUnoccupiedConstruction(cardToOccupy.name)) {
        return `Cannot find unoccupied ${cardToOccupy.name}`;
      }
      const occupiedCardMatcher = [
        { type: "GOLDEN_LEAF", cardType: cardToOccupy.cardType },
        {
          type: "GOLDEN_LEAF",
          cardType: cardToOccupy.isUnique ? "UNIQUE" : "COMMON",
        },
      ];
      const playedCardMatcher = [
        { type: "GOLDEN_LEAF", cardType: cardToPlay.cardType },
        {
          type: "GOLDEN_LEAF",
          cardType: cardToPlay.isUnique ? "UNIQUE" : "COMMON",
        },
      ];
      if (
        !(
          (cardToPlay.associatedCard.type === "GOLDEN_LEAF" &&
            occupiedCardMatcher.some((m) =>
              isEqual(m, cardToPlay.associatedCard)
            )) ||
          (cardToOccupy.associatedCard.type === "GOLDEN_LEAF" &&
            playedCardMatcher.some((m) =>
              isEqual(m, cardToOccupy.associatedCard)
            ))
        )
      ) {
        return `Unable to use Golden Leaf to play card`;
      }
      return null;
    }

    if (paymentOptions.cardToDungeon) {
      if (!this.canInvokeDungeon()) {
        return `Unable to invoke ${CardName.DUNGEON}`;
      }
      if (!Card.fromName(paymentOptions.cardToDungeon).isCritter) {
        return `Unable to dungeon ${paymentOptions.cardToDungeon}. It is not a critter.`;
      }
      return this.validatePaidResources(
        paymentResources,
        cardToPlay.baseCost,
        "ANY 3"
      );
    }
    if (paymentOptions.cardToUse) {
      if (!this.hasCardInCity(paymentOptions.cardToUse)) {
        return `Unable to find ${paymentOptions.cardToUse} in your city`;
      }
      const fromMeadow =
        gameInput.clientOptions.fromMeadow ||
        gameInput.clientOptions.source === "MEADOW";
      switch (paymentOptions.cardToUse) {
        case CardName.CRANE:
          if (!cardToPlay.isConstruction) {
            return `Unable to use ${CardName.CRANE} to play ${cardToPlay.name}. It is not a construction.`;
          }
          return this.validatePaidResources(
            paymentResources,
            cardToPlay.baseCost,
            "ANY 3"
          );
        case CardName.QUEEN:
          if (cardToPlay.baseVP > 3) {
            return `Cannot use ${CardName.QUEEN} to play ${cardToPlay.name} (baseVP: ${cardToPlay.baseVP})`;
          }
          return null;
        case CardName.HOTEL:
          if (fromMeadow) {
            return `Cannot use ${CardName.HOTEL} to play a Meadow card`;
          }
          return this.validatePaidResources(
            paymentResources,
            cardToPlay.baseCost,
            "ANY 3"
          );
        case CardName.INN:
          // TODO check if we can place a worker here
          if (!fromMeadow) {
            return `Cannot use ${CardName.INN} to play a non-meadow card`;
          }
          return this.validatePaidResources(
            paymentResources,
            cardToPlay.baseCost,
            "ANY 3"
          );
        case CardName.INVENTOR:
          return this.validatePaidResources(
            paymentResources,
            cardToPlay.baseCost,
            "ANY 3"
          );
        case CardName.INNKEEPER:
          if (!cardToPlay.isCritter) {
            return `Unable to use ${CardName.INNKEEPER} to play ${cardToPlay.name}. It is not a critter.`;
          }
          return this.validatePaidResources(
            paymentResources,
            cardToPlay.baseCost,
            ResourceType.BERRY
          );
        default:
          assertUnreachable(
            paymentOptions.cardToUse,
            `Unexpected card: ${paymentOptions.cardToUse}`
          );
      }
    }
    if (gameInput?.clientOptions?.source === "RESERVED") {
      return this.validatePaidResources(
        paymentResources,
        cardToPlay.baseCost,
        "ANY 1"
      );
    }
    return this.validatePaidResources(paymentResources, cardToPlay.baseCost);
  }

  spendResources(toSpend: {
    [ResourceType.VP]?: number;
    [ResourceType.TWIG]?: number;
    [ResourceType.BERRY]?: number;
    [ResourceType.PEBBLE]?: number;
    [ResourceType.RESIN]?: number;
    [ResourceType.PEARL]?: number;
  }): void {
    if (!Object.keys(toSpend).every((k) => k in this.resources)) {
      throw new Error(`Unexpected resources: ${JSON.stringify(toSpend)}`);
    }

    const {
      VP = 0,
      TWIG = 0,
      BERRY = 0,
      PEBBLE = 0,
      RESIN = 0,
      PEARL = 0,
    } = toSpend;

    if (VP) {
      if (this.resources[ResourceType.VP] < VP) {
        throw new Error(
          `Insufficient ${ResourceType.VP}. Need ${VP}, but only have ${
            this.resources[ResourceType.VP]
          }`
        );
      }
      this.resources[ResourceType.VP] -= +VP;
    }
    if (TWIG) {
      if (this.resources[ResourceType.TWIG] < TWIG) {
        throw new Error(
          `Insufficient ${ResourceType.TWIG}. Need ${TWIG}, but only have ${
            this.resources[ResourceType.TWIG]
          } TWIG`
        );
      }
      this.resources[ResourceType.TWIG] -= +TWIG;
    }
    if (BERRY) {
      if (this.resources[ResourceType.BERRY] < BERRY) {
        throw new Error(
          `Insufficient ${ResourceType.BERRY}. Need ${BERRY}, but only have ${
            this.resources[ResourceType.BERRY]
          } BERRY`
        );
      }
      this.resources[ResourceType.BERRY] -= +BERRY;
    }
    if (PEBBLE) {
      if (this.resources[ResourceType.PEBBLE] < PEBBLE) {
        throw new Error(
          `Insufficient ${ResourceType.PEBBLE}. Need ${PEBBLE}, but only have ${
            this.resources[ResourceType.PEBBLE]
          } PEBBLE`
        );
      }
      this.resources[ResourceType.PEBBLE] -= +PEBBLE;
    }
    if (RESIN) {
      if (this.resources[ResourceType.RESIN] < RESIN) {
        throw new Error(
          `Insufficient ${ResourceType.RESIN}. Need ${RESIN}, but only have ${
            this.resources[ResourceType.RESIN]
          } RESIN`
        );
      }
      this.resources[ResourceType.RESIN] -= +RESIN;
    }
    if (PEARL) {
      if (this.resources[ResourceType.PEARL] < PEARL) {
        throw new Error(
          `Insufficient ${ResourceType.PEARL}. Need ${PEARL}, but only have ${
            this.resources[ResourceType.PEARL]
          } PEARL`
        );
      }
      this.resources[ResourceType.PEARL] -= +PEARL;
    }
  }

  gainResources(
    gameState: GameState,
    toGain: {
      [ResourceType.VP]?: number;
      [ResourceType.TWIG]?: number;
      [ResourceType.BERRY]?: number;
      [ResourceType.PEBBLE]?: number;
      [ResourceType.RESIN]?: number;
      [ResourceType.PEARL]?: number;
    }
  ): void {
    if (!Object.keys(toGain).every((k) => k in this.resources)) {
      throw new Error(`Unexpected resources: ${JSON.stringify(toGain)}`);
    }
    const {
      VP = 0,
      TWIG = 0,
      BERRY = 0,
      PEBBLE = 0,
      RESIN = 0,
      PEARL = 0,
    } = toGain;
    if (VP) {
      this.resources[ResourceType.VP] += +VP;
    }
    if (TWIG) {
      this.resources[ResourceType.TWIG] += +TWIG;
    }
    if (BERRY) {
      this.resources[ResourceType.BERRY] += +BERRY;
    }
    if (PEBBLE) {
      this.resources[ResourceType.PEBBLE] += +PEBBLE;
    }
    if (RESIN) {
      this.resources[ResourceType.RESIN] += +RESIN;
    }
    if (PEARL) {
      this.resources[ResourceType.PEARL] += +PEARL;
      if (this.hasCardInCity(CardName.BRIDGE)) {
        this.drawCards(gameState, 2 * PEARL);
        gameState.addGameLogFromCard(CardName.BRIDGE, [
          this,
          ` drew ${PEARL * 2} CARD.`,
        ]);
      }
    }
  }

  isRecallableWorker(workerPlacementInfo: WorkerPlacementInfo): boolean {
    // Don't remove workers from these cards.
    if (
      workerPlacementInfo.playedCard &&
      (workerPlacementInfo.playedCard.cardName === CardName.CEMETARY ||
        workerPlacementInfo.playedCard.cardName === CardName.MONASTERY)
    ) {
      return false;
    }
    if (workerPlacementInfo.location) {
      const location = Location.fromName(workerPlacementInfo.location);
      if (location.type === LocationType.JOURNEY) {
        return false;
      }
    }
    return true;
  }

  getRecallableWorkers(): WorkerPlacementInfo[] {
    return this.placedWorkers.filter(this.isRecallableWorker);
  }

  getPlacedWorker(
    workerPlacementInfo: WorkerPlacementInfo
  ): WorkerPlacementInfo | undefined {
    return this.placedWorkers.find((placedWorker) =>
      isEqual(placedWorker, workerPlacementInfo)
    );
  }

  recallWorker(
    gameState: GameState,
    workerPlacementInfo: WorkerPlacementInfo,
    opts: {
      removeFromGameState?: boolean;
      removeFromPlacedWorkers?: boolean;
    } = {}
  ): void {
    const { removeFromGameState = true, removeFromPlacedWorkers = true } = opts;
    if (!this.isRecallableWorker(workerPlacementInfo)) {
      throw new Error("Cannot recall worker");
    }
    if (removeFromPlacedWorkers) {
      const toRemove = this.getPlacedWorker(workerPlacementInfo);
      if (!toRemove) {
        throw new Error("Cannot find worker");
      }
      this.placedWorkers.splice(this.placedWorkers.indexOf(toRemove), 1);
    }
    if (removeFromGameState) {
      const { location, playedCard, event } = workerPlacementInfo;
      // Update gameState/other objects
      if (location) {
        const workers = gameState.locationsMap[location];
        if (!workers) {
          throw new Error(`Couldn't find location ${location}`);
        }
        const idx = workers.indexOf(this.playerId);
        if (idx !== -1) {
          workers.splice(idx, 1);
        } else {
          throw new Error(`Couldn't find worker at location: ${location}`);
        }
      } else if (event) {
        // Don't need to do anything for event
      } else if (playedCard) {
        const cardOwner = gameState.getPlayer(playedCard.cardOwnerId);
        let removedWorker = false;
        cardOwner
          .getPlayedCardForCardName(playedCard.cardName)
          .forEach(({ workers = [] }) => {
            if (!removedWorker) {
              const idx = workers.indexOf(this.playerId);
              if (idx !== -1) {
                workers.splice(idx, 1);
                removedWorker = true;
              }
            }
          });
      } else {
        throw new Error(
          `Unexpected Worker Placement: ${JSON.stringify(
            workerPlacementInfo,
            null,
            2
          )}`
        );
      }
    }
  }

  useAmbassador(): void {
    this.numAmbassadors = 0;
  }

  hasUnusedAmbassador(): boolean {
    return this.numAmbassadors === 1;
  }

  recallAmbassador(gameState: GameState): void {
    if (!gameState.gameOptions.pearlbrook) {
      return;
    }
    if (gameState.riverDestinationMap) {
      gameState.riverDestinationMap.recallAmbassadorForPlayer(this.playerId);
    }

    gameState.players.forEach((player) => {
      if (player.hasCardInCity(CardName.FERRY)) {
        const playedCard = player.getFirstPlayedCard(CardName.FERRY);
        if (playedCard.ambassador === this.playerId) {
          player.updatePlayedCard(gameState, playedCard, {
            ambassador: null,
          });
        }
      }
    });

    this.numAmbassadors = 1;
  }

  recallWorkers(gameState: GameState): void {
    if (this.numAvailableWorkers !== 0) {
      throw new Error("Still have available workers");
    }
    this.placedWorkers = this.placedWorkers.filter((workerPlacementInfo) => {
      if (this.isRecallableWorker(workerPlacementInfo)) {
        this.recallWorker(gameState, workerPlacementInfo, {
          removeFromPlacedWorkers: false,
        });
        return false;
      } else {
        return true;
      }
    });
  }

  get numCardsInHand(): number {
    return this._numCardsInHand
      ? this._numCardsInHand
      : this.cardsInHand.length;
  }

  get numAdornmentsInHand(): number {
    return this._numAdornmentsInHand
      ? this._numAdornmentsInHand
      : this.adornmentsInHand.length;
  }

  get currentSeason(): Season {
    return this._currentSeason;
  }

  nextSeason(): void {
    if (this._currentSeason === Season.WINTER) {
      this._currentSeason = Season.SPRING;
      this.numWorkers = 3;
    } else if (this._currentSeason === Season.SPRING) {
      this._currentSeason = Season.SUMMER;
      this.numWorkers = 4;
    } else if (this._currentSeason === Season.SUMMER) {
      this._currentSeason = Season.AUTUMN;
      this.numWorkers = 6;
    } else {
      throw new Error("Already in the last season");
    }
  }

  get numGoldenLeaf(): number {
    return this._numGoldenLeaf;
  }

  initGoldenLeaf(): void {
    this._numGoldenLeaf = 3;
  }

  useGoldenLeaf(): void {
    if (this._numGoldenLeaf <= 0) {
      throw new Error("Unable to use golden leaf");
    }
    this._numGoldenLeaf--;
  }

  get trainTicketStatus(): TrainTicketStatus | null {
    return this._trainTicketStatus;
  }

  hasValidTrainTicket(): boolean {
    switch (this.trainTicketStatus) {
      case TrainTicketStatus.VALID_FROM_WINTER:
        return true;
      case TrainTicketStatus.VALID_FROM_SUMMER:
        return (
          this.currentSeason === Season.SUMMER ||
          this.currentSeason === Season.AUTUMN
        );
      default:
        return false;
    }
  }

  assignTrainTicket(): void {
    if (this._trainTicketStatus !== null) {
      throw new Error(
        "Attempting to assign train ticket to player with a ticket"
      );
    }
    this._trainTicketStatus = TrainTicketStatus.VALID_FROM_WINTER;
  }

  useTrainTicket(): void {
    if (!this.hasValidTrainTicket()) {
      throw new Error(
        `Cannot use train ticket: ${this.trainTicketStatus} (currentSeason=${this._currentSeason})`
      );
    }
    switch (this.trainTicketStatus) {
      case TrainTicketStatus.VALID_FROM_WINTER:
        this._trainTicketStatus = TrainTicketStatus.VALID_FROM_SUMMER;
        break;
      case TrainTicketStatus.VALID_FROM_SUMMER:
        this._trainTicketStatus = null;
        break;
      default:
        break;
    }
  }

  getReservedCardOrNull(): CardName | null {
    if (this.reservedCard === "UNUSED" || this.reservedCard === "USED") {
      return null;
    }
    return this.reservedCard;
  }

  canReserveCard(): boolean {
    return this.reservedCard === "UNUSED";
  }

  useReservedCard(): void {
    if (this.reservedCard === "UNUSED" || this.reservedCard === "USED") {
      throw new Error("No reserved card found");
    }
    this.reservedCard = "USED";
  }

  resetReservationToken(gameState: GameState): void {
    if (this.reservedCard !== "UNUSED" && this.reservedCard !== "USED") {
      gameState.discardPile.addToStack(this.reservedCard);
    }
    this.reservedCard = "UNUSED";
  }

  reserveCard(cardName: CardName): void {
    if (this.reservedCard !== "UNUSED") {
      throw new Error(
        this.reservedCard === "USED"
          ? `Already used reservation token`
          : `Already reserving card: ${this.reservedCard}`
      );
    }
    this.reservedCard = cardName;
  }

  toJSON(includePrivate: boolean): PlayerJSON {
    return cloneDeep({
      name: this.name,
      playerId: this.playerId,
      playedCards: this.playedCards,
      numCardsInHand: this.numCardsInHand,
      resources: this.resources,
      numWorkers: this.numWorkers,
      currentSeason: this.currentSeason,
      claimedEvents: this.claimedEvents,
      numAmbassadors: this.numAmbassadors,
      placedWorkers: this.placedWorkers,
      playerStatus: this.playerStatus,
      numAdornmentsInHand: this.numAdornmentsInHand,
      cardsInHand: null,
      adornmentsInHand: [],
      playedAdornments: this.playedAdornments,
      trainTicketStatus: this.trainTicketStatus,
      numGoldenLeaf: this.numGoldenLeaf,
      reservedCard: this.reservedCard,
      ...(includePrivate
        ? {
            playerSecret: this.playerSecret,
            cardsInHand: this.cardsInHand,
            adornmentsInHand: this.adornmentsInHand,
          }
        : {}),
    });
  }

  static fromJSON(playerJSON: PlayerJSON): Player {
    const args: ConstructorParameters<typeof Player>[0] = {
      ...playerJSON,
      cardsInHand:
        playerJSON.cardsInHand === null ? undefined : playerJSON.cardsInHand,
      numCardsInHand:
        playerJSON.numCardsInHand === null
          ? undefined
          : playerJSON.numCardsInHand,
    };
    const player = new Player(args);
    return player;
  }
}

export const createPlayer = (name: string): Player => {
  const player = new Player({
    name,
  });
  return player;
};
