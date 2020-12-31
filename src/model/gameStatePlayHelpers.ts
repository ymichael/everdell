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
  resourceType: ResourceType;
  maxToSpend: number;
}): GameStatePlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    throw new Error("Not Implemented");
    // if (gameInput.inputType !== GameInputType.PLAY_CARD) {
    //   throw new Error("Invalid input type");
    // }
    // if (!gameInput.clientOptions?.resourcesToSpend) {
    //   throw new Error("Invalid input");
    // }
    // const player = gameState.getActivePlayer();
    // const numToSpend =
    //   gameInput.clientOptions.resourcesToSpend[resourceType] || 0;
    // if (numToSpend > maxToSpend) {
    //   throw new Error(
    //     `Too many resources, max: ${maxToSpend}, got: ${numToSpend}`
    //   );
    // }
    // player.spendResources({
    //   [resourceType]: numToSpend,
    // });
    // player.gainResources({
    //   [ResourceType.VP]: numToSpend,
    // });
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
