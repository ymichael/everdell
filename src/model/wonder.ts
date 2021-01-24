import {
  CardName,
  WonderName,
  GameText,
  GameInput,
  GameInputType,
  TextPartEntity,
  IGameTextEntity,
  ResourceType,
  WonderCost,
  WonderNameToPlayerId,
} from "./types";
import { GameState, GameStatePlayable } from "./gameState";
import { toGameText } from "./gameText";

// Pearlbrook Wonders
export class Wonder implements GameStatePlayable, IGameTextEntity {
  readonly name: WonderName;
  readonly description: GameText;
  readonly baseVP: number;
  readonly baseCost: WonderCost;
  readonly numCardsToDiscard: number;

  constructor({
    name,
    description,
    baseVP,
    baseCost,
    numCardsToDiscard,
  }: {
    name: WonderName;
    description: GameText;
    baseVP: number;
    baseCost: WonderCost;
    numCardsToDiscard: number;
  }) {
    this.name = name;
    this.description = description;
    this.baseVP = baseVP;
    this.baseCost = baseCost;
    this.numCardsToDiscard = numCardsToDiscard;
  }

  getGameTextPart(): TextPartEntity {
    return {
      type: "entity",
      entityType: "wonder",
      wonder: this.name,
    };
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    return !this.canPlayCheck(gameState, gameInput);
  }

  canPlayCheck(gameState: GameState, gameInput: GameInput): string | null {
    // need enough resources, enough cards to discard, and at least 1 worker
    const player = gameState.getActivePlayer();

    if (gameInput.inputType === GameInputType.CLAIM_WONDER) {
      // Check whether the event has been claimed
      if (gameState.wondersMap[this.name]) {
        return `Wonder ${this.name} is already claimed by ${JSON.stringify(
          gameState.wondersMap[this.name],
          null,
          2
        )}`;
      }

      // check resources
      const playerResources = player.getResources();
      let canAfford = true;
      // (Object.entries(this.baseCost.resources) as [
      //   keyof ResourceType,
      //   number
      // ][]).forEach(([resourceType, needed]) => {
      //   if (needed > playerResources[resourceType]) {
      //     canAfford = false;
      //   }
      // });

      if (!canAfford) {
        return `Cannot afford this wonder (not enough resources)`;
      }

      // check cards
      if (player.cardsInHand.length < this.numCardsToDiscard) {
        return `You need to discard at least ${this.numCardsToDiscard} cards to claim this wonder`;
      }

      // check workers
      if (player.numAvailableWorkers <= 0) {
        return `Active player (${player.playerId}) doesn't have any workers to place.`;
      }
    }

    return null;
  }

  play(gameState: GameState, gameInput: GameInput): void {
    const player = gameState.getActivePlayer();

    if (gameInput.inputType === GameInputType.CLAIM_WONDER) {
      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_CARDS,
        prevInputType: GameInputType.CLAIM_WONDER,
        label: `Select ${this.numCardsToDiscard} CARD to discard`,
        wonderContext: this.name,
        maxToSelect: this.numCardsToDiscard,
        minToSelect: this.numCardsToDiscard,
        cardOptions: player.cardsInHand,
        clientOptions: {
          selectedCards: [],
        },
      });
    } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
      // make sure you chose the right number
      const selectedCards = gameInput.clientOptions.selectedCards;

      if (selectedCards.length < this.numCardsToDiscard) {
        throw new Error("Too few cards discarded");
      }

      // player spends resources
      player.spendResources(this.baseCost.resources);

      // remove the cards from player's hand
      selectedCards.forEach((cardName) => {
        player.removeCardFromHand(cardName as CardName);
        gameState.discardPile.addToStack(cardName);
      });

      // give the player the wonder
      player.placeWorkerOnWonder(this.name);
    } else {
      throw new Error(`Invalid input type ${gameInput.inputType}`);
    }
  }

  getPoints(gameState: GameState, playerId: string): number {
    return this.baseVP;
  }
  static fromName(name: WonderName): Wonder {
    return WONDER_REGISTRY[name];
  }
}

const WONDER_REGISTRY: Record<WonderName, Wonder> = {
  [WonderName.SUNBLAZE_BRIDGE]: new Wonder({
    name: WonderName.SUNBLAZE_BRIDGE,
    description: toGameText([
      "Pay 2 TWIG, 2 RESIN, 2 PEBBLE, 3 PEARL, and discard 3 CARD.",
    ]),
    baseVP: 20,
    baseCost: {
      resources: {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 3,
      },
      numCardsToDiscard: 3,
    },
    numCardsToDiscard: 3,
  }),
  [WonderName.STARFALLS_FLAME]: new Wonder({
    name: WonderName.STARFALLS_FLAME,
    description: toGameText([
      "Pay 3 TWIG, 3 RESIN, 3 PEBBLE, 3 PEARL, and discard 3 CARD.",
    ]),
    baseVP: 25,
    baseCost: {
      resources: {
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 3,
        [ResourceType.PEBBLE]: 3,
        [ResourceType.PEARL]: 3,
      },
      numCardsToDiscard: 3,
    },
    numCardsToDiscard: 3,
  }),
  [WonderName.HOPEWATCH_GATE]: new Wonder({
    name: WonderName.HOPEWATCH_GATE,
    description: toGameText([
      "Pay 1 TWIG, 1 RESIN, 1 PEBBLE, 2 PEARL, and discard 2 CARD.",
    ]),
    baseVP: 10,
    baseCost: {
      resources: {
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 1,
        [ResourceType.PEARL]: 2,
      },
      numCardsToDiscard: 2,
    },
    numCardsToDiscard: 2,
  }),
  [WonderName.MISTRISE_FOUNTAIN]: new Wonder({
    name: WonderName.MISTRISE_FOUNTAIN,
    description: toGameText([
      "Pay 2 TWIG, 2 RESIN, 2 PEBBLE, 2 PEARL, and discard 2 CARD.",
    ]),
    baseVP: 15,
    baseCost: {
      resources: {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 2,
      },
      numCardsToDiscard: 2,
    },
    numCardsToDiscard: 2,
  }),
};

export const initialWondersMap = (): WonderNameToPlayerId => {
  const ret: WonderNameToPlayerId = {};
  [
    WonderName.SUNBLAZE_BRIDGE,
    WonderName.STARFALLS_FLAME,
    WonderName.HOPEWATCH_GATE,
    WonderName.MISTRISE_FOUNTAIN,
  ].forEach((ty) => {
    ret[ty] = null;
  });
  return ret;
};
