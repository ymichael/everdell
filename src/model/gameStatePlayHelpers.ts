import pickBy from "lodash/pickBy";

import {
  CardName,
  LocationName,
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
  private cardContext: CardName | undefined;
  private locationContext: LocationName | undefined;
  private skipGameLog: boolean;

  constructor({
    cardContext = undefined,
    locationContext = undefined,
    skipGameLog = false,
  }: {
    cardContext?: CardName | undefined;
    locationContext?: LocationName | undefined;
    skipGameLog?: boolean;
  }) {
    this.cardContext = cardContext;
    this.locationContext = locationContext;
    this.skipGameLog = skipGameLog;
  }

  matchesGameInput = (
    gameInput: GameInput
  ): gameInput is GameInputSelectOptionGeneric => {
    if (gameInput.inputType !== GameInputType.SELECT_OPTION_GENERIC) {
      return false;
    }
    if (this.cardContext !== gameInput.cardContext) {
      return false;
    }
    if (this.locationContext !== gameInput.locationContext) {
      return false;
    }
    return true;
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

      if (this.cardContext) {
        gameState.addGameLogFromCard(this.cardContext, logText);
      } else if (this.locationContext) {
        gameState.addGameLogFromLocation(this.locationContext, logText);
      } else {
        throw new Error("Unexpected game input");
      }
    }
  };

  getGameInput = (overrides: {
    prevInputType: GameInputType;
    prevInput?: GameInput;
  }): GameInputMultiStep => {
    const contextObj = pickBy(
      {
        cardContext: this.cardContext,
        locationContext: this.locationContext,
      },
      (v) => !!v
    );

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
      ...contextObj,
      ...overrides,
    };
  };
}
