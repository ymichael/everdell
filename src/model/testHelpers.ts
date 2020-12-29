import { GameState } from "./gameState";
import { createPlayer } from "./player";
import { Location } from "./location";
import { Event } from "./event";
import {
  CardName,
  LocationName,
  LocationType,
  EventName,
  EventType,
} from "./types";

export function testInitialGameState(
  opts: {
    numPlayers?: number;
    cardsInHand?: CardName[];
    noForestLocations?: boolean;
    noSpecialEvents?: boolean;
    meadowCards?: CardName[];
    shuffleDeck?: boolean;
  } = {}
): GameState {
  const {
    numPlayers = 2,
    cardsInHand = [],
    meadowCards = [],
    noForestLocations = true,
    noSpecialEvents = true,
    shuffleDeck = false,
  } = opts;
  const players = [];
  for (let i = 0; i < numPlayers; i++) {
    players.push(createPlayer(`Player #${i}`));
  }
  const gameState = GameState.initialGameState({
    players,
    shuffleDeck,
  });
  while (gameState.meadowCards.length) {
    gameState.meadowCards.pop();
  }
  gameState.meadowCards.push(...meadowCards);
  gameState.players.forEach((player) => {
    player.cardsInHand = cardsInHand;
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
