import {
  Season,
  GameInputType,
  GameInput,
  CardName,
  EventName,
  LocationName,
} from "./types";
import { Player } from "./player";

type LocationNameToPlayerIds = { [key: string]: string[] };
type EventNameToPlayerId = { [key: string]: string | null };

export class GameState {
  readonly activePlayerId: Player["playerId"];
  readonly players: Player[];
  readonly meadowCards: CardName[];
  readonly discardPile: CardName[];
  readonly deck: CardName[];
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
    discardPile: CardName[];
    deck: CardName[];
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
      ...(includePrivate
        ? {
            deck: this.deck,
            discardPile: this.discardPile,
          }
        : {}),
    };
  }

  static fromJSON(gameStateJSON: any): GameState {
    return new GameState({
      ...gameStateJSON,
      players: gameStateJSON.players.map((pJSON: any) =>
        Player.fromJSON(pJSON)
      ),
    });
  }

  getActivePlayer(): Player {
    const activePlayer = this.players.find(
      (player) => player.playerId === this.activePlayerId
    );

    if (!activePlayer) {
      throw new Error(`Unable to find the active player`);
    }
    return activePlayer;
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
      // TODO
      return true;
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
