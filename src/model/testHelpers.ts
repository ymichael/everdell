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
  GameInputSimple,
  GameInputMultiStep,
  GameInputType,
  GameInputPlayCard,
  TrainCarTileName,
} from "./types";
import omit from "lodash/omit";
import pick from "lodash/pick";
import merge from "lodash/merge";
import cloneDeep from "lodash/cloneDeep";

export function testInitialGameState(
  opts: {
    numPlayers?: number;
    playerNames?: string[];
    cardsInHand?: CardName[];
    forestLocations?: LocationName[];
    specialEvents?: EventName[];
    gameOptions?: Partial<GameOptions>;
    meadowCards?: CardName[];
    stationCards?: CardName[];
    trainCarTiles?: TrainCarTileName[];
    shuffleDeck?: boolean;
  } = {}
): GameState {
  const {
    numPlayers = 2,
    playerNames = [],
    cardsInHand = [],
    meadowCards,
    stationCards,
    forestLocations = [],
    specialEvents = [],
    trainCarTiles = [
      TrainCarTileName.ONE_BERRY,
      TrainCarTileName.ONE_BERRY,
      TrainCarTileName.ONE_BERRY,
    ],
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
  if (meadowCards) {
    while (gameState.meadowCards.length) {
      gameState.meadowCards.pop();
    }
    gameState.meadowCards.push(...meadowCards);
  }

  if (stationCards) {
    while (gameState.stationCards.length) {
      gameState.stationCards.pop();
    }
    gameState.stationCards.push(...stationCards);
  }
  if (gameState.trainCarTileStack) {
    trainCarTiles.reverse();
    for (let i = 0; i < trainCarTiles.length; i++) {
      gameState.trainCarTileStack?.pushTile(trainCarTiles[i]);
    }
    gameState.trainCarTileStack.replaceAt(0);
    gameState.trainCarTileStack.replaceAt(1);
    gameState.trainCarTileStack.replaceAt(2);
  }
  gameState.players.forEach((player) => {
    player.cardsInHand = [...cardsInHand];
  });
  (Object.keys(gameState.locationsMap) as LocationName[]).forEach(
    (locationName) => {
      const location = Location.fromName(locationName);
      if (location.type === LocationType.FOREST) {
        delete gameState.locationsMap[locationName];
      }
    }
  );
  (Object.keys(gameState.eventsMap) as EventName[]).forEach((eventName) => {
    const event = Event.fromName(eventName);
    if (event.type === EventType.SPECIAL) {
      delete gameState.eventsMap[eventName];
    }
  });

  forestLocations.forEach((x) => (gameState.locationsMap[x] = []));
  specialEvents.forEach((x) => (gameState.eventsMap[x] = null));
  return gameState;
}

/**
 * Returns the active player from the given game state and next gameState!
 */
export const multiStepGameInputTest = (
  gameState: GameState,
  gameInputs: [
    GameInputSimple,
    ...(Pick<GameInputMultiStep, "clientOptions"> &
      Partial<GameInputMultiStep>)[]
  ],
  opts: {
    autoAdvance?: boolean;
    skipMultiPendingInputCheck?: boolean;
    skipLastCheck?: boolean;
  } = {}
): [Player, GameState] => {
  const {
    autoAdvance = false,
    skipMultiPendingInputCheck = false,
    skipLastCheck = false,
  } = opts;

  // Sanity check
  expect(gameState.pendingGameInputs).to.eql([]);

  // Make a copy of game state so we don't mutate it.
  gameState = gameState.clone();

  const playerId = gameState.getActivePlayer().playerId;
  const [simpleInput, ...multiStepInputs] = gameInputs;

  const playInput = (input: GameInput, isLastInput: boolean): void => {
    // Clone gameInput to simulate client back and forth and make
    // sure we don't rely on references to objects.
    input = cloneDeep(input);

    // Apply input
    gameState = gameState.next(input, autoAdvance);

    if (!skipLastCheck) {
      if (isLastInput) {
        // Make sure we don't have any more pending inputs.
        expect(gameState.pendingGameInputs).to.eql([]);
        // And the player is no longer active.
        expect(playerId).to.not.be(gameState.getActivePlayer().playerId);
      } else {
        expect(playerId).to.be(gameState.getActivePlayer().playerId);
      }
    }
  };

  playInput(simpleInput, multiStepInputs.length === 0);

  multiStepInputs.forEach((partialInput, idx) => {
    // Find the input the matches this one
    let nextInput = gameState.pendingGameInputs[0];
    // If there are multiple pending inputs, enforce that
    // we specify the type and context
    if (gameState.pendingGameInputs.length > 1) {
      expect(partialInput.inputType).to.be.ok();
      expect(partialInput.prevInputType).to.be.ok();
      expect(
        partialInput.eventContext ||
          partialInput.cardContext ||
          partialInput.playedCardContext ||
          partialInput.locationContext ||
          partialInput.adornmentContext ||
          partialInput.riverDestinationContext ||
          partialInput.trainCarTileContext
      ).to.be.ok();
      nextInput = gameState.pendingGameInputs.find((x) => {
        return (
          x.inputType === partialInput.inputType &&
          x.prevInputType === partialInput.prevInputType &&
          x.eventContext === partialInput.eventContext &&
          x.cardContext === partialInput.cardContext &&
          x.locationContext === partialInput.locationContext &&
          x.adornmentContext === partialInput.adornmentContext &&
          x.riverDestinationContext === partialInput.riverDestinationContext &&
          x.trainCarTileContext === partialInput.trainCarTileContext
        );
      })!;
      expect(nextInput).to.be.ok();
    }

    // Verify the pending input matches
    if (!skipMultiPendingInputCheck) {
      const keysToOmit = ["clientOptions", "label", "prevInput"];
      const keysToMatch = Object.keys(partialInput).filter(
        (x) => !keysToOmit.includes(x)
      );
      expect(pick(nextInput, keysToMatch)).to.eql(
        omit(partialInput, keysToOmit)
      );
    }

    // Play input
    playInput(
      merge({}, nextInput, pick(partialInput, "clientOptions")),
      idx === multiStepInputs.length - 1
    );
  });

  return [gameState.getPlayer(playerId), gameState];
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
        source: "HAND",
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
