import {
  Season,
  GameInputType,
  GameInput,
  GameInputMultiStep,
  CardName,
  EventName,
  LocationName,
  LocationNameToPlayerIds,
  EventNameToPlayerId,
  PlayerIdsToAvailableDestinationCards,
  ResourceType,
} from "./types";
import { Player } from "./player";
import { Card } from "./card";
import { CardStack, emptyCardStack } from "./cardStack";
import { Location, initialLocationsMap } from "./location";
import { Event, initialEventMap } from "./event";
import { initialDeck } from "./deck";
import cloneDeep from "lodash/cloneDeep";
import findIndex from "lodash/findIndex";

const MEADOW_SIZE = 8;
const STARTING_PLAYER_HAND_SIZE = 5;

export class GameState {
  private _activePlayerId: Player["playerId"];
  public pendingGameInputs: GameInputMultiStep[];
  readonly players: Player[];
  readonly meadowCards: CardName[];
  readonly discardPile: CardStack;
  readonly deck: CardStack;
  readonly locationsMap: LocationNameToPlayerIds;
  readonly eventsMap: EventNameToPlayerId;

  constructor({
    activePlayerId,
    players,
    meadowCards,
    discardPile,
    deck,
    locationsMap,
    eventsMap,
    pendingGameInputs = [],
  }: {
    activePlayerId?: Player["playerId"];
    players: Player[];
    meadowCards: CardName[];
    discardPile: CardStack;
    deck: CardStack;
    locationsMap: LocationNameToPlayerIds;
    eventsMap: EventNameToPlayerId;
    pendingGameInputs: GameInputMultiStep[];
  }) {
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

  toJSON(includePrivate: boolean): object {
    return cloneDeep({
      activePlayerId: this.activePlayerId,
      players: this.players.map((p) => p.toJSON(includePrivate)),
      meadowCards: this.meadowCards,
      locationsMap: this.locationsMap,
      eventsMap: this.eventsMap,
      pendingGameInputs: this.pendingGameInputs,
      deck: this.deck.toJSON(includePrivate),
      discardPile: this.discardPile.toJSON(includePrivate),
    });
  }

  nextPlayer(): void {
    const player = this.getActivePlayer();
    const playerIdx = this.players.indexOf(player);
    const nextPlayer = this.players[(playerIdx + 1) % this.players.length];
    this._activePlayerId = nextPlayer.playerId;
  }

  replenishMeadow(): void {
    while (this.meadowCards.length !== MEADOW_SIZE) {
      this.meadowCards.push(this.drawCard());
    }
  }

  removeCardFromMeadow(cardName: CardName): void {
    const idx = this.meadowCards.indexOf(cardName);
    if (idx === -1) {
      throw new Error(`Unable to remove meadow card ${cardName}`);
    } else {
      this.meadowCards.splice(idx, 1);
    }
  }

  clone(): GameState {
    return GameState.fromJSON(this.toJSON(true /* includePrivate */));
  }

  private handlePlayCardGameInput(
    gameInput: GameInput & { inputType: GameInputType.PLAY_CARD }
  ): void {
    const card = Card.fromName(gameInput.card);
    const player = this.getActivePlayer();
    if (!card.canPlay(this, gameInput)) {
      throw new Error("Cannot take action");
    }
    if (!player.isPaymentOptionsValid(gameInput)) {
      throw new Error("Invalid payment options");
    }
    player.payForCard(this, gameInput);
    if (gameInput.fromMeadow) {
      this.removeCardFromMeadow(gameInput.card);
      this.replenishMeadow();
    } else {
      this.getActivePlayer().removeCardFromHand(gameInput.card);
    }
    card.play(this, gameInput);
  }

  private handlePlaceWorkerGameInput(
    gameInput: GameInput & { inputType: GameInputType.PLACE_WORKER }
  ): void {
    const location = Location.fromName(gameInput.location);
    if (!location.canPlay(this, gameInput)) {
      throw new Error("Cannot take action");
    }

    // Take location effect
    location.play(this, gameInput);

    // Update game state
    const player = this.getActivePlayer();
    player.numAvailableWorkers--;
    this.locationsMap[gameInput.location]!.push(player.playerId);
  }

  private handleMultiStepGameInput(
    gameInput: GameInput & { inputType: GameInputType.MULTI_STEP }
  ): void {
    if (gameInput.prevInputType === GameInputType.PLAY_CARD) {
      const card = Card.fromName(gameInput.card);
      if (!card) {
        throw new Error("Invalid card");
      }
      if (!card.canPlay(this, gameInput)) {
        throw new Error("Cannot take action");
      }
      card.play(this, gameInput);
    } else {
      throw new Error(`Unhandled game input: ${JSON.stringify(gameInput)}`);
    }
  }

  // TODO: implement
  private handleClaimEventGameInput(
    gameInput: GameInput & { inputType: GameInputType.CLAIM_EVENT }
  ): void {}

  public handleVisitDestinationCardGameInput(
    gameInput: GameInput & { inputType: GameInputType.VISIT_DESTINATION_CARD }
  ): void {
    const card = Card.fromName(gameInput.card);
    const cardOwner = this.getPlayer(gameInput.playerId);
    const activePlayer = this.getActivePlayer();
    const activePlayerOwnsCard = cardOwner.playerId === activePlayer.playerId;

    if (!card) {
      throw new Error("Invalid Card");
    }

    if (activePlayer.numAvailableWorkers < 1) {
      throw new Error("Not enough workers");
    }

    let availableDestinationCards: CardName[] = [];
    if (activePlayerOwnsCard) {
      availableDestinationCards = activePlayer.getAllAvailableDestinationCards();
    } else {
      availableDestinationCards = cardOwner.getAvailableOpenDestinationCards();
    }

    /*if (findIndex(availableDestinationCards, card.name) < 0) {
      console.log(card.name);
      console.log(availableDestinationCards);
      throw new Error("Card is not playable");
    }*/

    // check that player can place worker on this card + card is still playable
    const cardOwnerPlayedCards = cardOwner.playedCards;
    const cardInfos = cardOwnerPlayedCards[card.name as CardName];

    if (!cardInfos || cardInfos.length < 1) {
      throw new Error("No card info for card");
    }

    if (
      !cardInfos?.some(
        (playedCard) =>
          (playedCard.workers ? playedCard.workers.length : []) <
          (playedCard.maxWorkers ? playedCard.maxWorkers : 1)
      )
    ) {
      throw new Error("No open spaces on specified card");
    }

    // take card's effect
    card.play(this, gameInput);

    // if card isn't owned by active player, pay the other player a VP
    if (!activePlayerOwnsCard) {
      cardOwner.gainResources({ [ResourceType.VP]: 1 });
    }

    // put the worker on the card -- (1) update card info and (2) subtract worker
    for (let x = 0; x < cardInfos.length; x++) {
      const cardInfo = cardInfos[x];
      const workers = cardInfo.workers || [];
      const maxWorkers = cardInfo.maxWorkers || 1;
      if (workers.length < maxWorkers) {
        const activePlayerId = activePlayer.playerId;
        cardInfo.workers = cardInfo.workers || [];
        cardInfo.workers.push(activePlayerId);
        break;
      }
    }
    activePlayer.numAvailableWorkers--;
  }

  next(gameInput: GameInput): GameState {
    const nextGameState = this.clone();
    switch (gameInput.inputType) {
      case GameInputType.PLAY_CARD:
        nextGameState.handlePlayCardGameInput(gameInput);
        break;
      case GameInputType.PLACE_WORKER:
        nextGameState.handlePlaceWorkerGameInput(gameInput);
        break;
      case GameInputType.MULTI_STEP:
        nextGameState.handleMultiStepGameInput(gameInput);
        break;
      case GameInputType.VISIT_DESTINATION_CARD:
        nextGameState.handleVisitDestinationCardGameInput(gameInput);
        break;
      default:
        throw new Error(`Unhandled game input: ${JSON.stringify(gameInput)}`);
    }

    // If there's pending game inputs, don't go to the next player.
    if (nextGameState.pendingGameInputs.length === 0) {
      nextGameState.nextPlayer();
    }

    return nextGameState;
  }

  static fromJSON(gameStateJSON: any): GameState {
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

  private getEligibleEventGameInputs = (): GameInput[] => {
    const keys = (Object.keys(this.eventsMap) as unknown) as EventName[];
    return keys
      .map((eventName) => {
        return {
          inputType: GameInputType.CLAIM_EVENT as const,
          playerId: this.activePlayerId,
          event: eventName,
        };
      })
      .filter((gameInput) => {
        const event = Event.fromName(gameInput.event);
        return event.canPlay(this, gameInput);
      });
  };

  private getAvailableLocationGameInputs = (): GameInput[] => {
    const keys = (Object.keys(this.locationsMap) as unknown) as LocationName[];
    return keys
      .map((locationName) => {
        return {
          inputType: GameInputType.PLACE_WORKER as const,
          playerId: this.activePlayerId,
          location: locationName,
        };
      })
      .filter((gameInput) => {
        const location = Location.fromName(gameInput.location);
        return location.canPlay(this, gameInput);
      });
  };

  private getAvailableDestinationCardGameInputs = (): GameInput[] => {
    let destinationCardsToPlayers: PlayerIdsToAvailableDestinationCards = {};

    // get open destination cards of other players
    this.players.forEach((player) => {
      let availableDestinationCards: CardName[] = player.getAvailableOpenDestinationCards();

      const playerId = player.playerId;

      destinationCardsToPlayers[playerId] = availableDestinationCards;
    });

    const activePlayer = this.getActivePlayer();
    const activePlayerId: string = this.activePlayerId;
    let availableClosedDestinationCards = activePlayer.getAvailableClosedDestinationCards();
    destinationCardsToPlayers[activePlayerId].push(
      ...availableClosedDestinationCards
    );

    // create the game inputs for these cards
    let gameInputs: GameInput[] = [];
    let playerIds = Object.keys(destinationCardsToPlayers);

    playerIds.forEach((player) => {
      let cards = destinationCardsToPlayers[player];
      cards.forEach((cardName) => {
        gameInputs.push({
          inputType: GameInputType.VISIT_DESTINATION_CARD as const,
          playerId: this.activePlayerId,
          card: cardName as CardName,
        });
      });
    });

    return gameInputs;
  };

  getPossibleGameInputs(): GameInput[] {
    if (this.pendingGameInputs.length !== 0) {
      return this.pendingGameInputs;
    }

    const player = this.getActivePlayer();
    const playerId = player.playerId;
    const possibleGameInputs: GameInput[] = [];
    if (player.currentSeason === Season.AUTUMN) {
      possibleGameInputs.push({
        inputType: GameInputType.GAME_END,
      });
    } else {
      possibleGameInputs.push({
        inputType: GameInputType.PREPARE_FOR_SEASON,
      });
    }

    if (player.numAvailableWorkers > 0) {
      possibleGameInputs.push(...this.getAvailableLocationGameInputs());

      possibleGameInputs.push(...this.getEligibleEventGameInputs());

      possibleGameInputs.push(...this.getAvailableDestinationCardGameInputs());
    }

    possibleGameInputs.push(
      ...this.meadowCards
        .map((cardName) => {
          return {
            inputType: GameInputType.PLAY_CARD as const,
            playerId,
            card: cardName,
            fromMeadow: true,
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

export type GameStateCanPlayFn = (
  gameState: GameState,
  gameInput: GameInput
) => boolean;

export interface GameStatePlayable {
  canPlay: GameStateCanPlayFn;
  play: GameStatePlayFn;
}

export type GameStateCountPointsFn = (
  gameState: GameState,
  playerId: string
) => number;
