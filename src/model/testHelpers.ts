import expect from "expect.js";
import { GameState } from "./gameState";
import { createPlayer, Player } from "./player";
import { Location } from "./location";
import { Event } from "./event";
import { Card } from "./card";
import {
  CardName,
  LocationName,
  LocationType,
  EventName,
  EventType,
  GameOptions,
  GameInput,
  GameInputType,
  GameInputPlayCard,
} from "./types";
import omit from "lodash/omit";
import merge from "lodash/merge";
import cloneDeep from "lodash/cloneDeep";

export function testInitialGameState(
  opts: {
    numPlayers?: number;
    playerNames?: string[];
    cardsInHand?: CardName[];
    noForestLocations?: boolean;
    noSpecialEvents?: boolean;
    gameOptions?: Partial<GameOptions>;
    meadowCards?: CardName[];
    shuffleDeck?: boolean;
  } = {}
): GameState {
  const {
    numPlayers = 2,
    playerNames = [],
    cardsInHand = [],
    meadowCards = [],
    noForestLocations = true,
    noSpecialEvents = true,
    shuffleDeck = false,
    gameOptions = {},
  } = opts;
  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push(createPlayer(playerNames[i] || `Player #${i}`));
  }
  const gameState = GameState.initialGameState({
    players,
    shuffleDeck,
    gameOptions,
  });
  while (gameState.meadowCards.length) {
    gameState.meadowCards.pop();
  }
  gameState.meadowCards.push(...meadowCards);
  gameState.players.forEach((player) => {
    player.cardsInHand = [...cardsInHand];
  });
  if (noForestLocations) {
    (Object.keys(gameState.locationsMap) as LocationName[]).forEach(
      (locationName) => {
        const location = Location.fromName(locationName);
        if (location.type === LocationType.FOREST) {
          delete gameState.locationsMap[locationName];
        }
      }
    );
  }
  if (noSpecialEvents) {
    (Object.keys(gameState.eventsMap) as EventName[]).forEach((eventName) => {
      const event = Event.fromName(eventName);
      if (event.type === EventType.SPECIAL) {
        delete gameState.eventsMap[eventName];
      }
    });
  }
  return gameState;
}

// Returns the active player from the given game state and next gameState!
export const multiStepGameInputTest = (
  gameState: GameState,
  pendingGameInputs: GameInput[],
  opts: { autoAdvance?: boolean; skipMultiPendingInputCheck?: boolean } = {}
): [Player, GameState] => {
  let currGameState = gameState.clone();
  const player = currGameState.getActivePlayer();
  const { autoAdvance = false, skipMultiPendingInputCheck = false } = opts;

  // Sanity check
  expect(currGameState.pendingGameInputs).to.eql([]);

  pendingGameInputs.forEach((gameInput, idx) => {
    const isLastInput = idx === pendingGameInputs.length - 1;

    // Clone gameInput to simulate client back and forth and make
    // sure we don't rely on references to objects.
    gameInput = cloneDeep(gameInput);

    currGameState = currGameState.next(gameInput, autoAdvance);
    if (!isLastInput) {
      const keysToOmit = ["label", "clientOptions"];
      if (!skipMultiPendingInputCheck) {
        expect(
          currGameState.pendingGameInputs.map((x) => omit(x, keysToOmit))
        ).to.eql([omit(pendingGameInputs[idx + 1], keysToOmit)]);
      }
      expect(player.playerId).to.be(currGameState.getActivePlayer().playerId);
    } else {
      expect(currGameState.pendingGameInputs).to.eql([]);
      expect(player.playerId).to.not.be(
        currGameState.getActivePlayer().playerId
      );
    }
  });

  return [currGameState.getPlayer(player.playerId), currGameState];
};

export const playCardInput = (
  card: CardName,
  clientOptionOverrides: Partial<GameInputPlayCard["clientOptions"]> = {}
): GameInputPlayCard => {
  return merge(
    {},
    {
      inputType: GameInputType.PLAY_CARD as const,
      clientOptions: {
        card,
        fromMeadow: false,
        paymentOptions: {
          resources: Card.fromName(card).baseCost,
        },
      },
    },
    {
      clientOptions: clientOptionOverrides,
    }
  );
};
