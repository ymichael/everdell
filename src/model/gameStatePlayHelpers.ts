import {
  CardName,
  ResourceType,
  ResourceMap,
  GameInput,
  GameInputType,
  GameInputMultiStep,
  GameInputSelectOptionGeneric,
} from "./types";
import {
  GameState,
  GameStatePlayFn,
  GameStateCountPointsFn,
} from "./gameState";
import { Card } from "./card";
import { assertUnreachable } from "../utils";

import pickBy from "lodash/pickBy";
import isEqual from "lodash/isEqual";

export function playSpendResourceToGetVPFactory({
  card,
  resourceType,
  maxToSpend,
}: {
  card: CardName;
  resourceType: ResourceType.BERRY | ResourceType.TWIG;
  maxToSpend: number;
}): GameStatePlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
      const numToSpend = gameInput.clientOptions.resources[resourceType] || 0;
      if (numToSpend > maxToSpend) {
        throw new Error(
          `Too many resources, max: ${maxToSpend}, got: ${numToSpend}`
        );
      }
      if (numToSpend === 0) {
        // Only log if its not an auto advanced input.
        if (!gameInput.isAutoAdvancedInput) {
          gameState.addGameLogFromCard(card, [
            player,
            ` decline to spend any ${resourceType}.`,
          ]);
        }
      } else {
        gameState.addGameLogFromCard(card, [
          player,
          ` spent ${numToSpend} ${resourceType} to gain ${numToSpend} VP.`,
        ]);
      }
      player.spendResources({
        [resourceType]: numToSpend,
      });
      player.gainResources({
        [ResourceType.VP]: numToSpend,
      });
    }
  };
}

export function gainProductionSpendResourceToGetVPFactory({
  card,
  resourceType,
  maxToSpend,
}: {
  card: CardName;
  resourceType: ResourceType.BERRY | ResourceType.TWIG;
  maxToSpend: number;
}): GameStatePlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    gameState.pendingGameInputs.push({
      inputType: GameInputType.SELECT_RESOURCES,
      toSpend: true,
      prevInputType: gameInput.inputType,
      label: `Pay up to ${maxToSpend} ${resourceType} to gain 1 VP each`,
      cardContext: card,
      maxResources: maxToSpend,
      minResources: 0,
      specificResource: resourceType,
      clientOptions: {
        resources: {},
      },
    });
  };
}

export function sumResources(resourceMap: ResourceMap): number {
  return (Object.values(resourceMap) as number[]).reduce((a, b) => a + b, 0);
}

export function getPointsPerRarityLabel({
  isCritter,
  isUnique,
}: {
  isCritter: boolean;
  isUnique: boolean;
}): GameStateCountPointsFn {
  return (gameState: GameState, playerId: string) => {
    const player = gameState.getPlayer(playerId);
    let numCardsToCount = 0;
    player.forEachPlayedCard(({ cardName }) => {
      const card = Card.fromName(cardName as CardName);
      if (card.isCritter === isCritter && card.isUnique === isUnique) {
        numCardsToCount++;
      }
    });
    return numCardsToCount;
  };
}

export function gainAnyResourceHelper(contextObj: {
  cardContext: CardName;
}): {
  getInput: (overrides: {
    prevInputType: GameInputType;
    prevInput?: GameInput;
  }) => GameInputMultiStep;
  matches: (gameInput: GameInput) => gameInput is GameInputSelectOptionGeneric;
  play: (
    gameState: GameState,
    gameInput: GameInputSelectOptionGeneric,
    opts?: { skipLog: boolean }
  ) => void;
} {
  return {
    getInput: (overrides: {
      prevInputType: GameInputType;
      prevInput?: GameInput;
    }) => ({
      inputType: GameInputType.SELECT_OPTION_GENERIC,
      label: "Gain 1 ANY",
      options: [
        ResourceType.BERRY,
        ResourceType.TWIG,
        ResourceType.RESIN,
        ResourceType.PEBBLE,
      ],
      clientOptions: {
        selectedOption: null,
      },
      ...contextObj,
      ...overrides,
    }),
    play: (
      gameState: GameState,
      gameInput: GameInputSelectOptionGeneric,
      opts?: { skipLog: boolean }
    ) => {
      const player = gameState.getActivePlayer();
      const selectedOption = gameInput.clientOptions.selectedOption;
      if (!selectedOption || gameInput.options.indexOf(selectedOption) === -1) {
        throw new Error(`Please select an option`);
      }
      player.gainResources({ [selectedOption]: 1 });
      if (!opts?.skipLog) {
        const logText = [player, ` gained ${selectedOption}.`];
        if ("cardContext" in contextObj) {
          gameState.addGameLogFromCard(contextObj.cardContext, logText);
        } else {
          assertUnreachable(contextObj, contextObj);
        }
      }
    },
    matches: (
      gameInput: GameInput
    ): gameInput is GameInputSelectOptionGeneric => {
      return (
        gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
        isEqual(
          contextObj,
          pickBy(gameInput, (_v, k) => k in contextObj)
        )
      );
    },
  };
}
