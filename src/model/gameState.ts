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
  PlayerIdsToAvailableDestinationCards,
  ResourceType,
  GameInputWorkerPlacementTypes,
  WorkerPlacementInfo,
  PlayerStatus,
} from "./types";
import { GameStateJSON } from "./jsonTypes";
import { Player } from "./player";
import { Card } from "./card";
import { CardStack, emptyCardStack } from "./cardStack";
import { Location, initialLocationsMap } from "./location";
import { Event, initialEventMap } from "./event";
import { initialDeck } from "./deck";
import { assertUnreachable } from "../utils";

import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";
import omit from "lodash/omit";

const MEADOW_SIZE = 8;
const STARTING_PLAYER_HAND_SIZE = 5;

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

  constructor({
    gameStateId,
    activePlayerId,
    players,
    meadowCards,
    discardPile,
    deck,
    locationsMap,
    eventsMap,
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
  }

  get activePlayerId(): string {
    return this._activePlayerId;
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
    const card = Card.fromName(gameInput.card);
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
    if (gameInput.fromMeadow) {
      this.removeCardFromMeadow(gameInput.card);
      this.replenishMeadow();
    } else {
      player.removeCardFromHand(gameInput.card);
    }
    card.play(this, gameInput);
  }

  private handlePlaceWorkerGameInput(gameInput: GameInputPlaceWorker): void {
    const location = Location.fromName(gameInput.location);

    const canPlayErr = location.canPlayCheck(this, gameInput);
    if (canPlayErr) {
      throw new Error(canPlayErr);
    }

    // Before we place the worker because locations need to check occupancy.
    location.play(this, gameInput);

    const player = this.getActivePlayer();
    player.placeWorkerOnLocation(gameInput.location);
    this.locationsMap[gameInput.location]!.push(player.playerId);
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
    const event = Event.fromName(gameInput.event);
    const canPlayErr = event.canPlayCheck(this, gameInput);
    if (canPlayErr) {
      throw new Error(canPlayErr);
    }

    event.play(this, gameInput);
    this.eventsMap[gameInput.event] = this._activePlayerId;
  }

  private handleVisitDestinationCardGameInput(
    gameInput: GameInputVisitDestinationCard
  ): void {
    const card = Card.fromName(gameInput.card);
    const cardOwner = this.getPlayer(gameInput.cardOwnerId);
    const activePlayer = this.getActivePlayer();
    const activePlayerOwnsCard = cardOwner.playerId === activePlayer.playerId;

    activePlayer.placeWorkerOnCard(card.name, cardOwner);

    // If card isn't owned by active player, pay the other player a VP
    if (!activePlayerOwnsCard) {
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

    return nextGameState;
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
      discardPile: emptyCardStack(),
      locationsMap: initialLocationsMap(players.length),
      eventsMap: initialEventMap(),
      pendingGameInputs: [],
    });

    if (shuffleDeck) {
      gameState.deck.shuffle();
    }

    // Players draw cards
    players.forEach((p, idx) => {
      p.drawCards(gameState, STARTING_PLAYER_HAND_SIZE + idx);
    });

    // Draw cards onto the meadow
    gameState.replenishMeadow();

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

  getEligibleWorkerPlacementGameInputs(): GameInputWorkerPlacementTypes[] {
    if (this.getActivePlayer().numAvailableWorkers === 0) {
      return [];
    }
    return [
      ...this.getAvailableLocationGameInputs(),
      ...this.getEligibleEventGameInputs(),
      ...this.getAvailableDestinationCardGameInputs(),
    ];
  }

  private getEligibleEventGameInputs = (): GameInputClaimEvent[] => {
    const keys = (Object.keys(this.eventsMap) as unknown) as EventName[];
    return keys
      .map((eventName) => {
        return {
          inputType: GameInputType.CLAIM_EVENT as const,
          event: eventName,
        };
      })
      .filter((gameInput) => {
        const event = Event.fromName(gameInput.event);
        return event.canPlay(this, gameInput);
      });
  };

  private getAvailableLocationGameInputs = (): GameInputPlaceWorker[] => {
    const keys = (Object.keys(this.locationsMap) as unknown) as LocationName[];
    return keys
      .map((locationName) => {
        return {
          inputType: GameInputType.PLACE_WORKER as const,
          location: locationName,
        };
      })
      .filter((gameInput) => {
        const location = Location.fromName(gameInput.location);
        return location.canPlay(this, gameInput);
      });
  };

  private getAvailableDestinationCardGameInputs = (): GameInputVisitDestinationCard[] => {
    const destinationCardsToPlayers: PlayerIdsToAvailableDestinationCards = {};

    // get open destination cards of other players
    this.players.forEach((player) => {
      const availableDestinationCards: CardName[] = player.getAvailableOpenDestinationCards();

      const playerId = player.playerId;

      destinationCardsToPlayers[playerId] = availableDestinationCards;
    });

    const activePlayer = this.getActivePlayer();
    const activePlayerId: string = this.activePlayerId;
    const availableClosedDestinationCards = activePlayer.getAvailableClosedDestinationCards();
    destinationCardsToPlayers[activePlayerId].push(
      ...availableClosedDestinationCards
    );

    // create the game inputs for these cards
    const gameInputs: GameInputVisitDestinationCard[] = [];
    const playerIds = Object.keys(destinationCardsToPlayers);

    playerIds.forEach((playerId) => {
      const cards = destinationCardsToPlayers[playerId];
      cards.forEach((cardName) => {
        gameInputs.push({
          inputType: GameInputType.VISIT_DESTINATION_CARD as const,
          cardOwnerId: playerId,
          card: cardName as CardName,
        });
      });
    });

    return gameInputs;
  };

  getPossibleGameInputs(): GameInput[] {
    if (this.getRemainingPlayers().length === 0) {
      return [];
    }

    if (this.pendingGameInputs.length !== 0) {
      return this.pendingGameInputs;
    }

    const player = this.getActivePlayer();
    const playerId = player.playerId;
    const possibleGameInputs: GameInput[] = [];

    if (player.numAvailableWorkers > 0) {
      possibleGameInputs.push(...this.getEligibleWorkerPlacementGameInputs());
    } else if (player.currentSeason !== Season.AUTUMN) {
      possibleGameInputs.push({
        inputType: GameInputType.PREPARE_FOR_SEASON,
      });
    } else {
      possibleGameInputs.push({
        inputType: GameInputType.GAME_END,
      });
    }

    possibleGameInputs.push(
      ...this.meadowCards
        .map((cardName) => {
          return {
            inputType: GameInputType.PLAY_CARD as const,
            playerId,
            card: cardName,
            fromMeadow: true,
            paymentOptions: {
              resources: {},
            },
          };
        })
        .filter((gameInput) =>
          Card.fromName(gameInput.card).canPlay(this, gameInput)
        ),
      ...this.getActivePlayer()
        .cardsInHand.map((cardName) => {
          return {
            inputType: GameInputType.PLAY_CARD as const,
            playerId,
            card: cardName,
            fromMeadow: false,
            paymentOptions: {
              resources: {},
            },
          };
        })
        .filter((gameInput) =>
          Card.fromName(gameInput.card).canPlay(this, gameInput)
        )
    );

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
