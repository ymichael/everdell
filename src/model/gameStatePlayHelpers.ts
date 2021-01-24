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

export class GainAnyResource {
  private cardContext: CardName;
  private skipGameLog: boolean;

  constructor({
    cardContext,
    skipGameLog = false,
  }: {
    cardContext: CardName;
    skipGameLog?: boolean;
  }) {
    this.cardContext = cardContext;
    this.skipGameLog = skipGameLog;
  }

  matchesGameInput = (
    gameInput: GameInput
  ): gameInput is GameInputSelectOptionGeneric => {
    return (
      gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
      this.cardContext === gameInput.cardContext
    );
  };

  play = (
    gameState: GameState,
    gameInput: GameInputSelectOptionGeneric
  ): void => {
    const player = gameState.getActivePlayer();
    const selectedOption = gameInput.clientOptions.selectedOption;
    if (!selectedOption || gameInput.options.indexOf(selectedOption) === -1) {
      throw new Error(`Please select an option`);
    }
    player.gainResources({ [selectedOption]: 1 });

    if (!this.skipGameLog) {
      const logText = [player, ` gained ${selectedOption}.`];
      gameState.addGameLogFromCard(this.cardContext, logText);
    }
  };

  getGameInput = (overrides: {
    prevInputType: GameInputType;
    prevInput?: GameInput;
  }): GameInputMultiStep => {
    return {
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
      cardContext: this.cardContext,
      ...overrides,
    };
  };
}
