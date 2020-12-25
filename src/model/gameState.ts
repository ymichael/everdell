import {
  Season,
  GameInputType,
  GameInput,
  ICard,
  IPlayer,
  IGameState,
  IEvent,
  ILocation,
} from "./types";

const getEligibleEvents = (gameState: IGameState): IEvent[] => {
  return gameState.events.filter((event) => {
    // TODO
    return true;
  });
};

const getAvailableLocations = (gameState: IGameState): ILocation[] => {
  return gameState.locations.filter((location) => {
    // TODO
    return true;
  });
};

const getPlayableCards = (gameState: IGameState): ICard[] => {
  return [
    ...gameState.meadowCards,
    ...gameState.activePlayer.cardsInHand,
  ].filter((card) => {
    // TODO
    return true;
  });
};

export const getPossibleGameInputs = (gameState: IGameState): GameInput[] => {
  const player = gameState.activePlayer;
  const possibleGameInputs: GameInput[] = [];

  if (gameState.pendingGameInput) {
    if (gameState.pendingGameInput.inputType === GameInputType.PLAY_CARD) {
      // figure out how to pay
    } else if (
      gameState.pendingGameInput.inputType === GameInputType.PLACE_WORKER
    ) {
      // game options for the worker placement
    } else if (
      gameState.pendingGameInput.inputType === GameInputType.CLAIM_EVENT
    ) {
      // game options for the claiming event
    } else {
      throw new Error(
        "Unexpected pending game input type " + gameState.pendingGameInput
      );
    }
  } else {
    if (player.currentSeason !== Season.WINTER) {
      possibleGameInputs.push({
        inputType: GameInputType.PREPARE_FOR_SEASON,
        player,
      });
    }

    if (player.numAvailableWorkers > 0) {
      getAvailableLocations(gameState).forEach((location) => {
        possibleGameInputs.push({
          inputType: GameInputType.PLACE_WORKER,
          player,
          location,
        });
      });

      getEligibleEvents(gameState).forEach((event) => {
        possibleGameInputs.push({
          inputType: GameInputType.CLAIM_EVENT,
          player,
          event,
        });
      });
    }

    getPlayableCards(gameState).forEach((card) => {
      possibleGameInputs.push({
        inputType: GameInputType.PLAY_CARD,
        player,
        card,
      });
    });
  }

  return possibleGameInputs;
};
