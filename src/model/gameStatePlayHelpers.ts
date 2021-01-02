import {
  CardName,
  ResourceType,
  ResourceMap,
  GameInput,
  GameInputType,
} from "./types";
import {
  GameState,
  GameStatePlayFn,
  GameStateCountPointsFn,
} from "./gameState";

import { Card } from "./card";

export function playSpendResourceToGetVPFactory({
  resourceType,
  maxToSpend,
}: {
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
    const player = gameState.getActivePlayer();
    if (player.getNumResourcesByType(resourceType) !== 0) {
      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_RESOURCES,
        prevInputType: gameInput.inputType,
        cardContext: card,
        maxResources: maxToSpend,
        minResources: 0,
        specificResource: resourceType,
        clientOptions: {
          resources: {},
        },
      });
    }
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
