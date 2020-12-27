import { OwnableResourceType, GameInput } from "./types";
import { GameState, GameStatePlayFn } from "./gameState";

export function playGainResourceFactory({
  resourceMap,
  numCardsToDraw = 0,
}: {
  resourceMap: Partial<Record<OwnableResourceType, number>>;
  numCardsToDraw?: number;
}): GameStatePlayFn {
  return (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    player.gainResources(resourceMap);
    if (numCardsToDraw !== 0) {
      player.drawCards(gameState, numCardsToDraw);
    }
  };
}
