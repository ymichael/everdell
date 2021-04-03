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
import { GameState } from "./gameState";
import { toGameText, resourceMapToGameText } from "./gameText";

export function sumResources(resourceMap: ResourceMap): number {
  let ret = 0;
  Object.values(resourceMap).forEach((val) => {
    if (val) {
      // It is possible that val here is a string, eg: ""
      // if so we need to cast it to a number first.
      ret += +val;
    }
  });
  return ret;
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
    player.gainResources(gameState, { [selectedOption]: 1 });
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

    // TODO(michael): for some reason it is possible to get strings here.
    // Cast them into numbers to the comparisons below work as expected
    const maxResources = +gameInput.maxResources;
    const minResources = +gameInput.minResources;
    const numResources = sumResources(resources);

    if (maxResources === minResources && numResources !== minResources) {
      throw new Error(`Can only gain ${maxResources} resources`);
    } else if (numResources > maxResources) {
      throw new Error(`Can't gain more than ${maxResources} resources`);
    } else if (numResources < minResources) {
      throw new Error(`Can't gain less than ${minResources} resources`);
    }

    player.gainResources(gameState, resources);
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
