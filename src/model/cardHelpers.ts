import {
  ResourceType,
  CardName,
  GameInput,
  GameInputType,
  PlayedCardInfo,
} from "./types";
import {
  GameState,
  GameStatePlayFn,
  GameStateCountPointsFn,
} from "./gameState";
import { Card } from "./card";

export function countCardsByAttribute({
  isCritter,
  isUnique,
}: {
  isCritter: boolean;
  isUnique: boolean;
}): GameStateCountPointsFn {
  return (gameState: GameState, playerId: string) => {
    const player = gameState.getPlayer(playerId);
    return player.getPlayedCards(
      (card) => card.isCritter === isCritter && card.isUnique === isUnique
    ).length;
  };
}
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
      player.spendResources({ [resourceType]: numToSpend });
      player.gainResources(gameState, { [ResourceType.VP]: numToSpend });
    }
  };
}
export function activateCardSpendResourceToGetVPFactory({
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

export function onlyRelevantProductionCards(
  gameState: GameState,
  playedCards: PlayedCardInfo[]
): PlayedCardInfo[] {
  const player = gameState.getActivePlayer();
  return playedCards.filter((playedCard) => {
    const { cardName, cardOwnerId } = playedCard;
    const cardOwner = gameState.getPlayer(cardOwnerId);
    const card = Card.fromName(cardName);
    if (!card.productionWillActivate(gameState, cardOwner, playedCard)) {
      return false;
    }
    if (cardName === CardName.STOREHOUSE && cardOwnerId !== player.playerId) {
      return false;
    }
    return true;
  });
}
