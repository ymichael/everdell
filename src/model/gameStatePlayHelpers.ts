import pickBy from "lodash/pickBy";

import {
  AdornmentName,
  CardName,
  LocationName,
  EventName,
  ResourceType,
  ResourceMap,
  GameInput,
  GameInputType,
  GameInputMultiStep,
  GameInputSelectResources,
  GameInputSelectOptionGeneric,
} from "./types";
import type { GameState, GameStatePlayFn } from "./gameState";
import { toGameText, resourceMapToGameText } from "./gameText";
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

class GameInputMultiStepHelperBase {
  protected cardContext: CardName | undefined;
  protected adornmentContext: AdornmentName | undefined;
  protected locationContext: LocationName | undefined;
  protected eventContext: EventName | undefined;
  protected skipGameLog: boolean;

  constructor({
    adornmentContext = undefined,
    eventContext = undefined,
    cardContext = undefined,
    locationContext = undefined,
    skipGameLog = false,
  }: {
    adornmentContext?: AdornmentName | undefined;
    eventContext?: EventName | undefined;
    cardContext?: CardName | undefined;
    locationContext?: LocationName | undefined;
    skipGameLog?: boolean;
  }) {
    this.adornmentContext = adornmentContext;
    this.cardContext = cardContext;
    this.eventContext = eventContext;
    this.locationContext = locationContext;
    this.skipGameLog = skipGameLog;
  }

  matchesGameInputInner = (gameInput: GameInputMultiStep): boolean => {
    if (this.cardContext !== gameInput.cardContext) {
      return false;
    }
    if (this.locationContext !== gameInput.locationContext) {
      return false;
    }
    if (this.eventContext !== gameInput.eventContext) {
      return false;
    }
    if (this.adornmentContext !== gameInput.adornmentContext) {
      return false;
    }
    return true;
  };

  maybeAddToGameLog = (
    gameState: GameState,
    arg: Parameters<typeof toGameText>[0]
  ): void => {
    if (this.skipGameLog) {
      return;
    }
    if (this.cardContext) {
      gameState.addGameLogFromCard(this.cardContext, arg);
    } else if (this.locationContext) {
      gameState.addGameLogFromLocation(this.locationContext, arg);
    } else if (this.eventContext) {
      gameState.addGameLogFromEvent(this.eventContext, arg);
    } else if (this.adornmentContext) {
      gameState.addGameLogFromAdornment(this.adornmentContext, arg);
    } else {
      throw new Error("Unexpected game input");
    }
  };

  getContextObj = () => {
    return pickBy(
      {
        cardContext: this.cardContext,
        locationContext: this.locationContext,
        eventContext: this.eventContext,
        adornmentContext: this.adornmentContext,
      },
      (v) => !!v
    );
  };
}

export class GainAnyResource extends GameInputMultiStepHelperBase {
  matchesGameInput = (
    gameInput: GameInput
  ): gameInput is GameInputSelectOptionGeneric => {
    if (gameInput.inputType !== GameInputType.SELECT_OPTION_GENERIC) {
      return false;
    }
    return this.matchesGameInputInner(gameInput);
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
    this.maybeAddToGameLog(gameState, [player, ` gained ${selectedOption}.`]);
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
      ...this.getContextObj(),
      ...overrides,
    };
  };
}

export class GainMoreThan1AnyResource extends GameInputMultiStepHelperBase {
  matchesGameInput = (
    gameInput: GameInput
  ): gameInput is GameInputSelectResources => {
    if (gameInput.inputType !== GameInputType.SELECT_RESOURCES) {
      return false;
    }
    return this.matchesGameInputInner(gameInput);
  };

  play = (gameState: GameState, gameInput: GameInputSelectResources): void => {
    const player = gameState.getActivePlayer();
    const resources = gameInput.clientOptions.resources;
    if (!resources) {
      throw new Error("Invalid input");
    }
    const numResources = sumResources(resources);
    if (
      gameInput.maxResources === gameInput.minResources &&
      numResources !== gameInput.minResources
    ) {
      throw new Error(`Can only gain ${gameInput.maxResources} resources`);
    } else if (numResources > gameInput.maxResources) {
      throw new Error(
        `Can't gain more than ${gameInput.maxResources} resources`
      );
    } else if (numResources < gameInput.minResources) {
      throw new Error(
        `Can't gain less than ${gameInput.minResources} resources`
      );
    }

    player.gainResources(resources);
    this.maybeAddToGameLog(gameState, [
      player,
      " gained ",
      ...resourceMapToGameText(resources),
      ".",
    ]);
  };

  getGameInput = (
    numResources: number,
    overrides: {
      prevInputType: GameInputType;
      prevInput?: GameInput;
    }
  ): GameInputMultiStep => {
    return {
      inputType: GameInputType.SELECT_RESOURCES,
      label: `Gain ${numResources} ANY`,
      toSpend: false,
      maxResources: numResources,
      minResources: numResources,
      clientOptions: {
        resources: {},
      },
      ...this.getContextObj(),
      ...overrides,
    };
  };
}
