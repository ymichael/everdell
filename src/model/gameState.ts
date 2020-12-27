import {
  Season,
  GameInputType,
  GameInput,
  CardName,
  EventName,
  LocationName,
  LocationNameToPlayerIds,
  EventNameToPlayerId,
} from "./types";
import { Player } from "./player";
import { Card } from "./card";
import { CardStack, emptyCardStack } from "./cardStack";
import { Location, initialLocationsMap } from "./location";
import { initialEventMap } from "./event";
import { initialShuffledDeck } from "./deck";

const MEADOW_SIZE = 8;
const STARTING_PLAYER_HAND_SIZE = 5;

export class GameState {
  private _activePlayerId: Player["playerId"];
  readonly players: Player[];
  readonly meadowCards: CardName[];
  readonly discardPile: CardStack;
  readonly deck: CardStack;
  readonly locationsMap: LocationNameToPlayerIds;
  readonly eventsMap: EventNameToPlayerId;
  readonly pendingGameInput: GameInput | null;

  constructor({
    activePlayerId,
    players,
    meadowCards,
    discardPile,
    deck,
    locationsMap,
    eventsMap,
    pendingGameInput,
  }: {
    activePlayerId: Player["playerId"];
    players: Player[];
    meadowCards: CardName[];
    discardPile: CardStack;
    deck: CardStack;
    locationsMap: LocationNameToPlayerIds;
    eventsMap: EventNameToPlayerId;
    pendingGameInput: GameInput | null;
  }) {
    this._activePlayerId = activePlayerId;
    this.players = players;
    this.locationsMap = locationsMap;
    this.meadowCards = meadowCards;
    this.discardPile = discardPile;
    this.deck = deck;
    this.eventsMap = eventsMap;
    this.pendingGameInput = pendingGameInput;
  }

  get activePlayerId(): string {
    return this._activePlayerId;
  }

  toJSON(includePrivate: boolean): object {
    return {
      activePlayerId: this.activePlayerId,
      players: this.players.map((p) => p.toJSON(includePrivate)),
      meadowCards: this.meadowCards,
      locationsMap: this.locationsMap,
      eventsMap: this.eventsMap,
      pendingGameInput: this.pendingGameInput,
      deck: this.deck.toJSON(includePrivate),
      discardPile: this.discardPile.toJSON(includePrivate),
    };
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

  clone(): GameState {
    return GameState.fromJSON(this.toJSON(true /* includePrivate */));
  }

  next(gameInput: GameInput): GameState {
    const nextGameState = this.clone();
    let player: Player;
    switch (gameInput.inputType) {
      case GameInputType.DRAW_CARDS:
        player = nextGameState.getPlayer(gameInput.playerId);
        player.drawCards(nextGameState, gameInput.count);
        break;
      case GameInputType.REPLENISH_MEADOW:
        nextGameState.replenishMeadow();
        break;
      case GameInputType.PLAY_CARD:
        const card = Card.fromName(gameInput.card);
        if (!card) {
          throw new Error("Invalid card");
        }
        if (!card.canPlay(nextGameState, gameInput)) {
          throw new Error("Cannot take action");
        }
        card.play(nextGameState, gameInput);
        nextGameState.replenishMeadow();
        nextGameState.nextPlayer();
        break;
      case GameInputType.PLACE_WORKER:
        const location = Location.fromName(gameInput.location);
        if (!location) {
          throw new Error("Invalid location");
        }
        if (!location.canPlay(nextGameState, gameInput)) {
          throw new Error("Cannot take action");
        }

        // Take location effect
        location.play(nextGameState, gameInput);

        // Update game state
        player = nextGameState.getActivePlayer();
        player.numAvailableWorkers--;
        nextGameState.locationsMap[gameInput.location]!.push(player.playerId);

        nextGameState.nextPlayer();
        break;
      default:
        throw new Error(`Unhandled game input: ${JSON.stringify(gameInput)}`);
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

  static initialGameState({ players }: { players: Player[] }): GameState {
    if (players.length < 2) {
      throw new Error(`Unable to create a game with ${players.length} players`);
    }

    let gameState = new GameState({
      activePlayerId: players[0].playerId,
      players,
      meadowCards: [],
      deck: initialShuffledDeck(),
      discardPile: emptyCardStack(),
      locationsMap: initialLocationsMap(),
      eventsMap: initialEventMap(),
      pendingGameInput: null,
    });

    // Players draw cards
    players.forEach((p, idx) => {
      gameState = gameState.next({
        inputType: GameInputType.DRAW_CARDS,
        playerId: p.playerId,
        count: STARTING_PLAYER_HAND_SIZE + idx,
      });
    });

    // Draw cards onto the meadow
    gameState = gameState.next({
      inputType: GameInputType.REPLENISH_MEADOW,
    });

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

  private getEligibleEvents = (): EventName[] => {
    const entries = (Object.entries(this.eventsMap) as unknown) as [
      EventName,
      string
    ][];
    return entries
      .filter(([eventName, playerIdIfTaken]) => {
        if (!!playerIdIfTaken) {
          return false;
        }
        // TODO check if player is eligible for event.
        return true;
      })
      .map(([eventName, _]) => eventName);
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

  getPossibleGameInputs(): GameInput[] {
    const player = this.getActivePlayer();
    const playerId = player.playerId;
    const possibleGameInputs: GameInput[] = [];

    if (this.pendingGameInput) {
      if (this.pendingGameInput.inputType === GameInputType.PLAY_CARD) {
        // figure out how to pay
      } else if (
        this.pendingGameInput.inputType === GameInputType.PLACE_WORKER
      ) {
        // game options for the worker placement
      } else if (
        this.pendingGameInput.inputType === GameInputType.CLAIM_EVENT
      ) {
        // game options for the claiming event
      } else {
        throw new Error(
          "Unexpected pending game input type " + this.pendingGameInput
        );
      }
    } else {
      if (player.currentSeason !== Season.WINTER) {
        possibleGameInputs.push({
          inputType: GameInputType.PREPARE_FOR_SEASON,
        });
      }

      if (player.numAvailableWorkers > 0) {
        possibleGameInputs.push(...this.getAvailableLocationGameInputs());

        this.getEligibleEvents().forEach((event) => {
          possibleGameInputs.push({
            inputType: GameInputType.CLAIM_EVENT,
            event,
          });
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
    }

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
