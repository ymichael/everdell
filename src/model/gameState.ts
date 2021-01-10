import {
  Season,
  GameInputType,
  GameInput,
  GameInputPlayCard,
  GameInputClaimEvent,
  GameInputPlaceWorker,
  GameInputVisitDestinationCard,
  GameInputPrepareForSeason,
  GameInputMultiStep,
  GameInputGameEnd,
  CardName,
  EventName,
  LocationName,
  LocationNameToPlayerIds,
  EventNameToPlayerId,
  ResourceType,
  GameInputWorkerPlacementTypes,
  PlayedCardInfo,
  PlayerStatus,
  GameLogEntry,
} from "./types";
import { GameStateJSON } from "./jsonTypes";
import { Player } from "./player";
import { Card } from "./card";
import { CardStack, discardPile } from "./cardStack";
import { Location, initialLocationsMap } from "./location";
import { Event, initialEventMap } from "./event";
import { initialDeck } from "./deck";
import { assertUnreachable, strToGameText } from "../utils";

import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";
import omit from "lodash/omit";

const MEADOW_SIZE = 8;
const STARTING_PLAYER_HAND_SIZE = 5;
const MAX_GAME_LOG_BUFFER = 100;

export class GameState {
  readonly gameStateId: number;
  private _activePlayerId: Player["playerId"];
  readonly pendingGameInputs: GameInputMultiStep[];
  readonly players: Player[];
  readonly meadowCards: CardName[];
  readonly discardPile: CardStack;
  readonly deck: CardStack;
  readonly locationsMap: LocationNameToPlayerIds;
  readonly eventsMap: EventNameToPlayerId;
  readonly gameLog: GameLogEntry[];

  constructor({
    gameStateId,
    activePlayerId,
    players,
    meadowCards,
    discardPile,
    deck,
    locationsMap,
    eventsMap,
    gameLog = [],
    pendingGameInputs = [],
  }: {
    gameStateId: number;
    activePlayerId?: Player["playerId"];
    players: Player[];
    meadowCards: CardName[];
    discardPile: CardStack;
    deck: CardStack;
    locationsMap: LocationNameToPlayerIds;
    eventsMap: EventNameToPlayerId;
    pendingGameInputs: GameInputMultiStep[];
    gameLog: GameLogEntry[];
  }) {
    this.gameStateId = gameStateId;
    this.players = players;
    this.locationsMap = locationsMap;
    this.meadowCards = meadowCards;
    this.discardPile = discardPile;
    this.deck = deck;
    this.eventsMap = eventsMap;
    this._activePlayerId = activePlayerId || players[0].playerId;
    this.pendingGameInputs = pendingGameInputs;
    this.gameLog = gameLog;
  }

  get activePlayerId(): string {
    return this._activePlayerId;
  }

  addGameLog(args: Parameters<typeof strToGameText>[0]): void {
    const logSize = this.gameLog.length;
    if (logSize > MAX_GAME_LOG_BUFFER) {
      this.gameLog.splice(0, Math.floor(MAX_GAME_LOG_BUFFER / 2));
    }
    this.gameLog.push({ entry: strToGameText(args) });
  }

  toJSON(includePrivate: boolean): GameStateJSON {
    return cloneDeep({
      ...{
        gameStateId: this.gameStateId,
        activePlayerId: this.activePlayerId,
        players: this.players.map((p) => p.toJSON(includePrivate)),
        meadowCards: this.meadowCards,
        locationsMap: this.locationsMap,
        eventsMap: this.eventsMap,
        pendingGameInputs: [],
        deck: this.deck.toJSON(includePrivate),
        discardPile: this.discardPile.toJSON(includePrivate),
        gameLog: this.gameLog,
      },
      ...(includePrivate
        ? {
            pendingGameInputs: this.pendingGameInputs,
          }
        : {}),
    });
  }

  nextPlayer(): void {
    const remainingPlayers = this.getRemainingPlayers();
    if (remainingPlayers.length !== 0) {
      const player = this.getActivePlayer();
      const playerIdx = remainingPlayers.indexOf(player);
      const nextPlayer =
        remainingPlayers[(playerIdx + 1) % remainingPlayers.length];
      this._activePlayerId = nextPlayer.playerId;
    }
  }

  // returns list of players who do not have the GAME_END playerStatus
  getRemainingPlayers(): Player[] {
    return this.players.filter((player) => {
      return player.playerStatus !== PlayerStatus.GAME_ENDED;
    });
  }

  isGameOver(): boolean {
    return this.getRemainingPlayers().length === 0;
  }

  replenishMeadow(): void {
    while (this.meadowCards.length !== MEADOW_SIZE) {
      this.meadowCards.push(this.drawCard());
    }
  }

  removeCardFromMeadow(cardName: CardName): void {
    const idx = this.meadowCards.indexOf(cardName);
    if (idx === -1) {
      throw new Error(
        `Unable to remove meadow card ${cardName}.\n meadowCards: ${JSON.stringify(
          this.meadowCards,
          null,
          2
        )}`
      );
    } else {
      this.meadowCards.splice(idx, 1);
    }
  }

  clone(): GameState {
    const gameStateJSON = this.toJSON(true /* includePrivate */);
    gameStateJSON.gameStateId += 1;
    return GameState.fromJSON(gameStateJSON);
  }

  private handlePlayCardGameInput(gameInput: GameInputPlayCard): void {
    if (!gameInput.clientOptions?.card) {
      throw new Error("Must specify card to play.");
    }
    const card = Card.fromName(gameInput.clientOptions.card);
    const player = this.getActivePlayer();
    const canPlayErr = card.canPlayCheck(this, gameInput);
    if (canPlayErr) {
      throw new Error(canPlayErr);
    }

    const paymentOptionsError = player.validatePaymentOptions(gameInput);
    if (paymentOptionsError) {
      throw new Error(paymentOptionsError);
    }

    player.payForCard(this, gameInput);
    if (gameInput.clientOptions.fromMeadow) {
      this.removeCardFromMeadow(card.name);
      this.replenishMeadow();
    } else {
      player.removeCardFromHand(card.name);
    }
    card.play(this, gameInput);
  }

  private handlePlaceWorkerGameInput(gameInput: GameInputPlaceWorker): void {
    if (!gameInput.clientOptions?.location) {
      throw new Error("Need to specify clientOptions.location");
    }

    const location = Location.fromName(gameInput.clientOptions.location);
    const canPlayErr = location.canPlayCheck(this, gameInput);
    if (canPlayErr) {
      throw new Error(canPlayErr);
    }

    // Before we place the worker because locations need to check occupancy.
    location.play(this, gameInput);

    const player = this.getActivePlayer();
    player.placeWorkerOnLocation(location.name);
    this.locationsMap[location.name]!.push(player.playerId);
  }

  private removeMultiStepGameInput(gameInput: GameInputMultiStep): void {
    const found = this.pendingGameInputs.find((pendingGameInput) => {
      return isEqual(
        omit(pendingGameInput, ["clientOptions"]),
        omit(gameInput, ["clientOptions"])
      );
    });
    if (!found) {
      throw new Error(
        `Invalid multi-step input. \n gameInput: ${JSON.stringify(
          gameInput,
          null,
          2
        )} \n\nexpected one of: ${JSON.stringify(
          this.pendingGameInputs,
          null,
          2
        )}`
      );
    }
    const idx = this.pendingGameInputs.indexOf(found);
    this.pendingGameInputs.splice(idx, 1);
  }

  private handleMultiStepGameInput(gameInput: GameInputMultiStep): void {
    if (gameInput.cardContext) {
      const card = Card.fromName(gameInput.cardContext);
      const canPlayCardErr = card.canPlayCheck(this, gameInput);
      if (canPlayCardErr) {
        throw new Error(canPlayCardErr);
      }
      card.play(this, gameInput);
      return;
    }

    if (gameInput.locationContext) {
      const location = Location.fromName(gameInput.locationContext);
      const canPlayLocationErr = location.canPlayCheck(this, gameInput);
      if (canPlayLocationErr) {
        throw new Error(canPlayLocationErr);
      }
      location.play(this, gameInput);
      return;
    }

    if (gameInput.eventContext) {
      const event = Event.fromName(gameInput.eventContext);
      const canPlayEventErr = event.canPlayCheck(this, gameInput);
      if (canPlayEventErr) {
        throw new Error(canPlayEventErr);
      }
      event.play(this, gameInput);
      return;
    }

    if (
      gameInput.prevInputType === GameInputType.PREPARE_FOR_SEASON &&
      gameInput.inputType === GameInputType.SELECT_CARDS
    ) {
      const selectedCards = gameInput.clientOptions.selectedCards;
      if (selectedCards.length !== 2) {
        throw new Error("Invalid input");
      }
      const player = this.getActivePlayer();
      selectedCards.forEach((cardName) => {
        this.removeCardFromMeadow(cardName);
        player.addCardToHand(this, cardName);
      });
      this.replenishMeadow();
      return;
    }

    throw new Error(`Unhandled game input: ${JSON.stringify(gameInput)}`);
  }

  private handleClaimEventGameInput(gameInput: GameInputClaimEvent): void {
    if (!gameInput.clientOptions?.event) {
      throw new Error("Need to specify clientOptions.event");
    }

    const event = Event.fromName(gameInput.clientOptions.event);
    const canPlayErr = event.canPlayCheck(this, gameInput);
    if (canPlayErr) {
      throw new Error(canPlayErr);
    }

    event.play(this, gameInput);
    this.eventsMap[event.name] = this._activePlayerId;
  }

  private handleVisitDestinationCardGameInput(
    gameInput: GameInputVisitDestinationCard
  ): void {
    if (!gameInput.clientOptions?.playedCard) {
      throw new Error("Need to specify clientOptions.playedCard");
    }
    const playedCard = gameInput.clientOptions.playedCard;
    const cardOwner = this.getPlayer(playedCard.cardOwnerId);

    const origPlayedCard = cardOwner.findPlayedCard(playedCard);
    if (!origPlayedCard) {
      throw new Error(
        `Could not find played card: ${JSON.stringify(playedCard, null, 2)}`
      );
    }

    const card = Card.fromName(origPlayedCard.cardName);
    const activePlayer = this.getActivePlayer();

    const canPlayErr = card.canPlayCheck(this, gameInput);
    if (canPlayErr) {
      throw new Error(canPlayErr);
    }

    activePlayer.placeWorkerOnCard(this, origPlayedCard);

    // If card isn't owned by active player, pay the other player a VP
    if (cardOwner.playerId !== activePlayer.playerId) {
      cardOwner.gainResources({ [ResourceType.VP]: 1 });
    }

    // Take card's effect
    card.play(this, gameInput);
  }

  handleWorkerPlacementGameInput(
    gameInput: GameInputWorkerPlacementTypes
  ): void {
    switch (gameInput.inputType) {
      case GameInputType.CLAIM_EVENT:
        this.handleClaimEventGameInput(gameInput);
        break;
      case GameInputType.PLACE_WORKER:
        this.handlePlaceWorkerGameInput(gameInput);
        break;
      case GameInputType.VISIT_DESTINATION_CARD:
        this.handleVisitDestinationCardGameInput(gameInput);
        break;
      default:
        assertUnreachable(
          gameInput,
          `Unhandled worker placement game input: ${JSON.stringify(gameInput)}`
        );
    }
  }

  handlePrepareForSeason(gameInput: GameInputPrepareForSeason): void {
    const player = this.getActivePlayer();

    if (player.playerStatus !== PlayerStatus.DURING_SEASON) {
      throw new Error(`Unexpected playerStatus: ${player.playerStatus}`);
    }

    player.playerStatus = PlayerStatus.PREPARING_FOR_SEASON;

    if (player.hasCardInCity(CardName.CLOCK_TOWER)) {
      const clocktower = Card.fromName(CardName.CLOCK_TOWER);
      clocktower.play(this, gameInput);
    }
  }

  private prepareForSeason(player: Player, gameInput: GameInput): void {
    if (
      player.currentSeason === Season.WINTER ||
      player.currentSeason === Season.SUMMER
    ) {
      player.activateProduction(this, gameInput);
    } else {
      this.pendingGameInputs.push({
        inputType: GameInputType.SELECT_CARDS,
        prevInputType: GameInputType.PREPARE_FOR_SEASON,
        cardOptions: this.meadowCards,
        maxToSelect: 2,
        minToSelect: 2,
        clientOptions: {
          selectedCards: [],
        },
      });
    }
    player.playerStatus = PlayerStatus.DURING_SEASON;
    player.recallWorkers(this);
    player.nextSeason();
  }

  private handleGameEndGameInput(gameInput: GameInputGameEnd): void {
    const player = this.getActivePlayer();
    if (player.currentSeason !== Season.AUTUMN) {
      throw new Error("Cannot end game unless you're in Autumn");
    }
    player.playerStatus = PlayerStatus.GAME_ENDED;
  }

  next(gameInput: GameInput): GameState {
    this.updateGameLog(gameInput);
    return this.nextInner(gameInput);
  }

  private nextInner(gameInput: GameInput): GameState {
    const nextGameState = this.clone();
    if (nextGameState.pendingGameInputs.length !== 0) {
      nextGameState.removeMultiStepGameInput(gameInput as any);
    }
    switch (gameInput.inputType) {
      case GameInputType.SELECT_CARDS:
      case GameInputType.SELECT_PLAYED_CARDS:
      case GameInputType.SELECT_LOCATION:
      case GameInputType.SELECT_PAYMENT_FOR_CARD:
      case GameInputType.SELECT_WORKER_PLACEMENT:
      case GameInputType.SELECT_PLAYER:
      case GameInputType.SELECT_RESOURCES:
      case GameInputType.DISCARD_CARDS:
      case GameInputType.SELECT_OPTION_GENERIC:
        nextGameState.handleMultiStepGameInput(gameInput);
        break;
      case GameInputType.PLAY_CARD:
        nextGameState.handlePlayCardGameInput(gameInput);
        break;
      case GameInputType.PLACE_WORKER:
      case GameInputType.VISIT_DESTINATION_CARD:
      case GameInputType.CLAIM_EVENT:
        nextGameState.handleWorkerPlacementGameInput(gameInput);
        break;
      case GameInputType.PREPARE_FOR_SEASON:
        nextGameState.handlePrepareForSeason(gameInput);
        break;
      case GameInputType.GAME_END:
        nextGameState.handleGameEndGameInput(gameInput);
        //throw new Error("Not Implemented");
        break;
      default:
        assertUnreachable(
          gameInput,
          `Unhandled game input: ${JSON.stringify(gameInput)}`
        );
    }

    const player = nextGameState.getActivePlayer();

    // A player is preparing for season, complete that first.
    if (
      nextGameState.pendingGameInputs.length === 0 &&
      player.playerStatus === PlayerStatus.PREPARING_FOR_SEASON
    ) {
      nextGameState.prepareForSeason(player, gameInput);
    }

    // If there are no more pending game inputs go to the next player.
    if (nextGameState.pendingGameInputs.length === 0) {
      nextGameState.nextPlayer();
    }

    nextGameState.handleGameOver();

    return nextGameState;
  }

  private handleGameOver(): void {
    if (this.isGameOver()) {
      this.addGameLog("Game over");

      this.players.forEach((player) => {
        this.addGameLog([
          player.getGameText(),
          ` has ${player.getPoints(this)} points.`,
        ]);
      });
    }
  }

  updateGameLog(gameInput: GameInput): void {
    const player = this.getActivePlayer();
    switch (gameInput.inputType) {
      case GameInputType.PLAY_CARD:
        this.addGameLog([
          player.getGameText(),
          { type: "text", text: ` played ` },
          {
            type: "entity",
            entityType: "card",
            card: gameInput.clientOptions.card!,
          },
          { type: "text", text: "." },
        ]);
        break;
      case GameInputType.PLACE_WORKER:
        this.addGameLog([
          player.getGameText(),
          { type: "text", text: ` place a worker on ` },
          {
            type: "entity",
            entityType: "location",
            location: gameInput.clientOptions.location!,
          },
          { type: "text", text: "." },
        ]);
        break;
      case GameInputType.CLAIM_EVENT:
        this.addGameLog([
          player.getGameText(),
          { type: "text", text: ` claimed the ` },
          {
            type: "entity",
            entityType: "event",
            event: gameInput.clientOptions.event!,
          },
          { type: "text", text: ` event.` },
        ]);
        break;
      case GameInputType.PREPARE_FOR_SEASON:
        this.addGameLog([
          player.getGameText(),
          { type: "text", text: ` took the prepare for season action.` },
        ]);
        break;
      case GameInputType.SELECT_CARDS:
      case GameInputType.SELECT_PLAYED_CARDS:
      case GameInputType.SELECT_LOCATION:
      case GameInputType.SELECT_PAYMENT_FOR_CARD:
      case GameInputType.SELECT_WORKER_PLACEMENT:
      case GameInputType.SELECT_PLAYER:
      case GameInputType.SELECT_RESOURCES:
      case GameInputType.DISCARD_CARDS:
        const contextPart = gameInput.locationContext
          ? {
              type: "entity" as const,
              entityType: "location" as const,
              location: gameInput.locationContext!,
            }
          : gameInput.eventContext
          ? {
              type: "entity" as const,
              entityType: "event" as const,
              event: gameInput.eventContext,
            }
          : gameInput.cardContext
          ? {
              type: "entity" as const,
              entityType: "card" as const,
              card: gameInput.cardContext,
            }
          : {
              type: "text" as const,
              text: gameInput.prevInputType,
            };

        this.addGameLog([
          contextPart,
          { type: "text", text: ": " },
          player.getGameText(),
          {
            type: "text",
            text: ` took ${gameInput.inputType} action.`,
          },
        ]);
        break;
      case GameInputType.GAME_END:
      case GameInputType.VISIT_DESTINATION_CARD:
      default:
        this.addGameLog([
          player.getGameText(),
          ` took ${gameInput.inputType} action.`,
        ]);
        break;
    }
  }

  static fromJSON(gameStateJSON: GameStateJSON): GameState {
    return new GameState({
      ...gameStateJSON,
      deck: CardStack.fromJSON(gameStateJSON.deck),
      discardPile: CardStack.fromJSON(gameStateJSON.discardPile),
      players: gameStateJSON.players.map((pJSON: any) =>
        Player.fromJSON(pJSON)
      ),
    });
  }

  static initialGameState({
    players,
    shuffleDeck = true,
  }: {
    players: Player[];
    shuffleDeck?: boolean;
  }): GameState {
    if (players.length < 2) {
      throw new Error(`Unable to create a game with ${players.length} players`);
    }

    const gameState = new GameState({
      gameStateId: 1,
      players,
      meadowCards: [],
      deck: initialDeck(),
      discardPile: discardPile(),
      locationsMap: initialLocationsMap(players.length),
      eventsMap: initialEventMap(),
      gameLog: [],
      pendingGameInputs: [],
    });

    gameState.addGameLog(`Game created with ${players.length} players.`);

    if (shuffleDeck) {
      gameState.deck.shuffle();
    }

    // Players draw cards
    players.forEach((p, idx) => {
      p.drawCards(gameState, STARTING_PLAYER_HAND_SIZE + idx);
    });
    gameState.addGameLog(`Dealing cards to each player.`);

    // Draw cards onto the meadow
    gameState.replenishMeadow();
    gameState.addGameLog(`Dealing cards to the Meadow.`);

    return gameState;
  }

  getActivePlayer(): Player {
    return this.getPlayer(this.activePlayerId);
  }

  getPlayer(playerId: string): Player {
    const ret = this.players.find((player) => player.playerId === playerId);

    if (!ret) {
      throw new Error(`Unable to find player: ${playerId}`);
    }
    return ret;
  }

  drawCard(): CardName {
    if (!this.deck.isEmpty) {
      return this.deck.drawInner();
    }

    while (!this.discardPile.isEmpty) {
      this.deck.addToStack(this.discardPile.drawInner());
    }

    this.deck.shuffle();
    if (!this.deck.isEmpty) {
      return this.drawCard();
    }

    throw new Error("No more cards to draw");
  }

  getClaimableEvents = (): EventName[] => {
    const keys = (Object.keys(this.eventsMap) as unknown) as EventName[];
    return keys.filter((eventName) => {
      const event = Event.fromName(eventName);
      return event.canPlay(this, {
        inputType: GameInputType.CLAIM_EVENT as const,
        clientOptions: {
          event: eventName,
        },
      });
    });
  };

  getPlayableLocations = (): LocationName[] => {
    const keys = (Object.keys(this.locationsMap) as unknown) as LocationName[];
    return keys.filter((locationName) => {
      const location = Location.fromName(locationName);
      return location.canPlay(this, {
        inputType: GameInputType.PLACE_WORKER as const,
        clientOptions: {
          location: locationName,
        },
      });
    });
  };

  getVisitableDestinationCards = (): PlayedCardInfo[] => {
    const activePlayer = this.getActivePlayer();
    const ret = [...activePlayer.getAvailableClosedDestinationCards()];
    this.players.forEach((player) => {
      ret.push(...player.getAvailableOpenDestinationCards());
    });
    return ret.filter((playedCard) => {
      const card = Card.fromName(playedCard.cardName);
      return card.canPlay(this, {
        inputType: GameInputType.VISIT_DESTINATION_CARD,
        clientOptions: {
          playedCard,
        },
      });
    });
  };

  getPlayableCards(): { card: CardName; fromMeadow: boolean }[] {
    const player = this.getActivePlayer();
    const ret: { card: CardName; fromMeadow: boolean }[] = [];

    this.meadowCards.forEach((cardName) => {
      const card = Card.fromName(cardName);
      if (
        player.canAffordCard(card.name, true) &&
        card.canPlay(this, {
          inputType: GameInputType.PLAY_CARD as const,
          clientOptions: {
            card: cardName,
            fromMeadow: true,
            paymentOptions: {
              resources: {},
            },
          },
        })
      ) {
        ret.push({ card: cardName, fromMeadow: true });
      }
    });
    player.cardsInHand.forEach((cardName) => {
      const card = Card.fromName(cardName);
      if (
        player.canAffordCard(card.name, true) &&
        card.canPlay(this, {
          inputType: GameInputType.PLAY_CARD as const,
          clientOptions: {
            card: cardName,
            fromMeadow: false,
            paymentOptions: {
              resources: {},
            },
          },
        })
      ) {
        ret.push({ card: cardName, fromMeadow: false });
      }
    });
    return ret;
  }

  getPossibleGameInputs(): GameInput[] {
    if (this.getRemainingPlayers().length === 0) {
      return [];
    }

    if (this.pendingGameInputs.length !== 0) {
      return this.pendingGameInputs;
    }

    const player = this.getActivePlayer();
    const possibleGameInputs: GameInput[] = [];

    if (player.numAvailableWorkers > 0) {
      if (this.getPlayableLocations().length !== 0) {
        possibleGameInputs.push({
          inputType: GameInputType.PLACE_WORKER,
          clientOptions: {
            location: null,
          },
        });
      }
      if (this.getVisitableDestinationCards().length !== 0) {
        possibleGameInputs.push({
          inputType: GameInputType.VISIT_DESTINATION_CARD,
          clientOptions: {
            playedCard: null,
          },
        });
      }
      if (this.getClaimableEvents().length !== 0) {
        possibleGameInputs.push({
          inputType: GameInputType.CLAIM_EVENT,
          clientOptions: {
            event: null,
          },
        });
      }
    } else if (player.currentSeason !== Season.AUTUMN) {
      possibleGameInputs.push({
        inputType: GameInputType.PREPARE_FOR_SEASON,
      });
    } else {
      possibleGameInputs.push({
        inputType: GameInputType.GAME_END,
      });
    }

    if (this.getPlayableCards().length !== 0) {
      possibleGameInputs.push({
        inputType: GameInputType.PLAY_CARD,
        clientOptions: {
          card: null,
          fromMeadow: false,
          paymentOptions: {
            resources: {},
          },
        },
      });
    }
    return possibleGameInputs;
  }
}

export type GameStatePlayFn = (
  gameState: GameState,
  gameInput: GameInput
) => void;

export type GameStateCanPlayCheckFn = (
  gameState: GameState,
  gameInput: GameInput
) => string | null;

export type GameStateCanPlayFn = (
  gameState: GameState,
  gameInput: GameInput
) => boolean;

export interface GameStatePlayable {
  canPlay: GameStateCanPlayFn;
  canPlayCheck: GameStateCanPlayCheckFn;
  play: GameStatePlayFn;
}

export type GameStateCountPointsFn = (
  gameState: GameState,
  playerId: string
) => number;
