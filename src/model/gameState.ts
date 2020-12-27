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
import { CardStack, emptyCardStack } from "./cardStack";
import { Location, initialLocationsMap } from "./location";
import { initialEventMap } from "./event";
import { initialShuffledDeck } from "./deck";

const MEADOW_SIZE = 8;
const STARTING_PLAYER_HAND_SIZE = 5;

export class GameState {
  readonly activePlayerId: Player["playerId"];
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
    this.activePlayerId = activePlayerId;
    this.players = players;
    this.locationsMap = locationsMap;
    this.meadowCards = meadowCards;
    this.discardPile = discardPile;
    this.deck = deck;
    this.eventsMap = eventsMap;
    this.pendingGameInput = pendingGameInput;
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
        while (nextGameState.meadowCards.length !== MEADOW_SIZE) {
          nextGameState.meadowCards.push(nextGameState.deck.draw());
        }
        break;
      case GameInputType.PLACE_WORKER:
        const location = Location.fromName(gameInput.location);
        if (!location) {
          throw new Error("Invalid location");
        }
        location.apply(nextGameState, gameInput);
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

  private getAvailableLocations = (): LocationName[] => {
    const keys = (Object.keys(this.locationsMap) as unknown) as LocationName[];
    return keys.filter((locationName) => {
      const location = Location.fromName(locationName);
      return location.canApply(this);
    });
  };

  private getPlayableCards = (): CardName[] => {
    return [...this.meadowCards, ...this.getActivePlayer().cardsInHand].filter(
      (card) => {
        // TODO
        return true;
      }
    );
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
          playerId,
        });
      }

      if (player.numAvailableWorkers > 0) {
        this.getAvailableLocations().forEach((location) => {
          possibleGameInputs.push({
            inputType: GameInputType.PLACE_WORKER,
            playerId,
            location,
          });
        });

        this.getEligibleEvents().forEach((event) => {
          possibleGameInputs.push({
            inputType: GameInputType.CLAIM_EVENT,
            playerId,
            event,
          });
        });
      }

      this.getPlayableCards().forEach((card) => {
        possibleGameInputs.push({
          inputType: GameInputType.PLAY_CARD,
          playerId,
          card,
        });
      });
    }

    return possibleGameInputs;
  }
}
