import {
  ResourceType,
  LocationType,
  CardCost,
  CardType,
  CardName,
  GameInput,
  GameInputType,
  PlayedCardInfo,
} from "./types";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayFn,
} from "./gameState";
import { Location } from "./location";
import {
  playGainResourceFactory,
  playSpendResourceToGetVPFactory,
  sumResources,
} from "./gameStatePlayHelpers";

export class Card implements GameStatePlayable {
  readonly playInner: GameStatePlayFn | undefined;
  readonly canPlayInner: GameStateCanPlayFn | undefined;
  readonly playedCardInfoInner: (() => PlayedCardInfo) | undefined;
  readonly pointsInner:
    | ((gameState: GameState, playerId: string) => number)
    | undefined;

  readonly name: CardName;
  readonly baseCost: CardCost;
  readonly baseVP: number;
  readonly cardType: CardType;
  readonly isUnique: boolean;
  readonly isCritter: boolean;
  readonly isConstruction: boolean;
  readonly associatedCard: CardName | null;

  constructor({
    name,
    baseCost,
    baseVP,
    cardType,
    isUnique,
    isConstruction,
    associatedCard,
    playInner, // called when the card is played
    canPlayInner, // called when we check canPlay function
    playedCardInfoInner, // used for cards that accumulate other cards or resources
    pointsInner, // computed if specified + added to base points
  }: {
    name: CardName;
    baseCost: CardCost;
    baseVP: number;
    cardType: CardType;
    isUnique: boolean;
    isConstruction: boolean;
    associatedCard: CardName | null;
    playInner?: GameStatePlayFn;
    canPlayInner?: GameStateCanPlayFn;
    playedCardInfoInner?: () => PlayedCardInfo;
    pointsInner?: (gameState: GameState, playerId: string) => number;
  }) {
    this.name = name;
    this.baseCost = baseCost;
    this.baseVP = baseVP;
    this.cardType = cardType;
    this.isUnique = isUnique;
    this.isCritter = !isConstruction;
    this.isConstruction = isConstruction;
    this.associatedCard = associatedCard;
    this.playInner = playInner;
    this.canPlayInner = canPlayInner;
    this.playedCardInfoInner = playedCardInfoInner;
    this.pointsInner = pointsInner;
  }

  getPlayedCardInfo(): PlayedCardInfo {
    const ret: PlayedCardInfo = {};
    if (this.isConstruction) {
      ret.isOccupied = false;
    }
    if (this.cardType == CardType.DESTINATION) {
      ret.workers = [];
      ret.maxWorkers = 1;
    }
    return {
      ...ret,
      ...(this.playedCardInfoInner ? this.playedCardInfoInner() : {}),
    };
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    if (gameInput.inputType !== GameInputType.PLAY_CARD) {
      throw new Error("Invalid gameInput");
    }

    const player = gameState.getActivePlayer();
    if (this.isUnique && player.hasPlayedCard(this.name)) {
      return false;
    }
    return player.canAffordCard(this.name, gameInput.fromMeadow);
  }

  play(gameState: GameState, gameInput: GameInput): void {
    if (!this.canPlay(gameState, gameInput)) {
      throw new Error(`Unable to play card ${this.name}`);
    }
    const player = gameState.getActivePlayer();
    player.addToCity(this.name);
    if (
      this.cardType === CardType.PRODUCTION ||
      this.cardType === CardType.TRAVELER
    ) {
      this.playCardEffects(gameState, gameInput);
    }
  }

  playCardEffects(gameState: GameState, gameInput: GameInput): void {
    if (this.playInner) {
      this.playInner(gameState, gameInput);
    }
  }

  getPoints(gameState: GameState, playerId: string): number {
    return (
      this.baseVP +
      (this.pointsInner ? this.pointsInner(gameState, playerId) : 0)
    );
  }

  static fromName(name: CardName): Card {
    return CARD_REGISTRY[name];
  }
}

const CARD_REGISTRY: Record<CardName, Card> = {
  [CardName.ARCHITECT]: new Card({
    name: CardName.ARCHITECT,
    cardType: CardType.PROSPERITY,
    baseCost: { [ResourceType.BERRY]: 4 },
    baseVP: 2,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.CRANE,
    // 1 point per rock and pebble, up to 6 pts
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      var numPebblesAndResin =
        player.getNumResource(ResourceType.PEBBLE) +
        player.getNumResource(ResourceType.RESIN);
      return numPebblesAndResin > 6 ? 6 : numPebblesAndResin;
    },
  }),
  [CardName.BARD]: new Card({
    name: CardName.BARD,
    cardType: CardType.TRAVELER,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: 0,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.THEATRE,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.PLAY_CARD) {
        throw new Error("Invalid input type");
      }
      const player = gameState.getActivePlayer();
      if (gameInput.clientOptions?.cardsToDiscard) {
        if (gameInput.clientOptions.cardsToDiscard.length > 5) {
          throw new Error("Discarding too many cards");
        }
        gameInput.clientOptions.cardsToDiscard.forEach((cardName) => {
          player.discardCard(cardName);
        });
        player.gainResources({
          [ResourceType.VP]: gameInput.clientOptions?.cardsToDiscard.length,
        });
      }
    },
  }),
  [CardName.BARGE_TOAD]: new Card({
    name: CardName.BARGE_TOAD,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 1,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.TWIG_BARGE,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const playedFarms = player.playedCards[CardName.FARM];
      if (playedFarms) {
        player.gainResources({
          [ResourceType.TWIG]: 2 * playedFarms.length,
        });
      }
    },
  }),
  [CardName.CASTLE]: new Card({
    name: CardName.CASTLE,
    cardType: CardType.PROSPERITY,
    baseCost: {
      [ResourceType.TWIG]: 2,
      [ResourceType.RESIN]: 3,
      [ResourceType.PEBBLE]: 3,
    },
    baseVP: 4,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.KING,
    // 1 point per common construction
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      const playedCards = player.playedCards;
      if (playedCards) {
        var numCommonConstructions = 0;
        for (var cardName in playedCards) {
          var card = Card.fromName(cardName as CardName);
          if (card.isConstruction && !card.isUnique) {
            numCommonConstructions++;
          }
        }
        return numCommonConstructions;
      }
      return 0;
    },
  }),
  [CardName.CEMETARY]: new Card({
    name: CardName.CEMETARY,
    cardType: CardType.DESTINATION,
    baseCost: { [ResourceType.PEBBLE]: 2 },
    baseVP: 0,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.UNDERTAKER,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.VISIT_DESTINATION_CARD) {
        throw new Error("Invalid input type");
      }
      // TODO
      // When you place a worker here, reveal 4 cards from the draw pile or
      // discard pile and play 1 of them for free. Discard the others. Your
      // worker must stay here permanently. Cemetery may only have up to 2
      // workers on it, but the second spot must be unlocked by having a Undertaker
      // in your city.
      throw new Error("Not Implemented");
    },
  }),
  [CardName.CHAPEL]: new Card({
    name: CardName.CHAPEL,
    cardType: CardType.DESTINATION,
    baseCost: {
      [ResourceType.TWIG]: 2,
      [ResourceType.RESIN]: 1,
      [ResourceType.PEBBLE]: 1,
    },
    baseVP: 2,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.SHEPHERD,
    playedCardInfoInner: () => ({
      resources: {
        [ResourceType.VP]: 0,
      },
    }),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.VISIT_DESTINATION_CARD) {
        throw new Error("Invalid input type");
      }
      const player = gameState.getActivePlayer();
      const playedCard = player.playedCards[CardName.SHEPHERD]?.[0];
      if (!playedCard) {
        throw new Error("Invalid action");
      }
      (playedCard.resources![ResourceType.VP] as number) += 1;
      player.drawCards(
        gameState,
        playedCard.resources![ResourceType.VP] as number
      );
    },
  }),
  [CardName.CHIP_SWEEP]: new Card({
    name: CardName.CHIP_SWEEP,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: 2,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.RESIN_REFINERY,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.PLAY_CARD) {
        throw new Error("Invalid input type");
      }
      if (!gameInput.clientOptions?.targetCard) {
        throw new Error("Invalid input");
      }
      const player = gameState.getActivePlayer();
      if (!player.hasPlayedCard(gameInput.clientOptions?.targetCard)) {
        throw new Error("Invalid input");
      }
      const targetCard = Card.fromName(gameInput.clientOptions?.targetCard);
      if (targetCard.cardType !== CardType.PRODUCTION) {
        throw new Error("Invalid input");
      }
      targetCard.playCardEffects(gameState, gameInput);
    },
  }),
  [CardName.CLOCK_TOWER]: new Card({
    name: CardName.CLOCK_TOWER,
    cardType: CardType.GOVERNANCE,
    baseCost: { [ResourceType.TWIG]: 3, [ResourceType.PEBBLE]: 1 },
    baseVP: 0,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.HISTORIAN,
    playedCardInfoInner: () => ({
      resources: {
        [ResourceType.VP]: 3,
      },
    }),
  }),
  [CardName.COURTHOUSE]: new Card({
    name: CardName.COURTHOUSE,
    cardType: CardType.GOVERNANCE,
    baseCost: {
      [ResourceType.TWIG]: 1,
      [ResourceType.RESIN]: 1,
      [ResourceType.PEBBLE]: 2,
    },
    baseVP: 2,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.JUDGE,
  }),
  [CardName.CRANE]: new Card({
    name: CardName.CRANE,
    cardType: CardType.GOVERNANCE,
    baseCost: { [ResourceType.PEBBLE]: 1 },
    baseVP: 1,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.ARCHITECT,
  }),
  [CardName.DOCTOR]: new Card({
    name: CardName.DOCTOR,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 4 },
    baseVP: 4,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.UNIVERSITY,
    playInner: playSpendResourceToGetVPFactory({
      resourceType: ResourceType.BERRY,
      maxToSpend: 3,
    }),
  }),
  [CardName.DUNGEON]: new Card({
    name: CardName.DUNGEON,
    cardType: CardType.GOVERNANCE,
    baseCost: { [ResourceType.RESIN]: 1, [ResourceType.PEBBLE]: 2 },
    baseVP: 0,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.RANGER,
    playedCardInfoInner: () => ({
      pairedCards: [],
    }),
  }),
  [CardName.EVERTREE]: new Card({
    name: CardName.EVERTREE,
    cardType: CardType.PROSPERITY,
    baseCost: {
      [ResourceType.TWIG]: 3,
      [ResourceType.RESIN]: 3,
      [ResourceType.PEBBLE]: 3,
    },
    baseVP: 5,
    isUnique: true,
    isConstruction: true,
    associatedCard: null,
    // 1 point per prosperty card
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      const playedCards = player.playedCards;
      if (playedCards) {
        var numProsperity = 0;
        for (var cardName in playedCards) {
          var card = Card.fromName(cardName as CardName);
          if (card.cardType == CardType.PROSPERITY) {
            numProsperity++;
          }
        }
        return numProsperity;
      }
      return 0;
    },
  }),
  [CardName.FAIRGROUNDS]: new Card({
    name: CardName.FAIRGROUNDS,
    cardType: CardType.PRODUCTION,
    baseCost: {
      [ResourceType.TWIG]: 1,
      [ResourceType.RESIN]: 2,
      [ResourceType.PEBBLE]: 1,
    },
    baseVP: 3,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.FOOL,
    playInner: playGainResourceFactory({
      resourceMap: {},
      numCardsToDraw: 2,
    }),
  }),
  [CardName.FARM]: new Card({
    name: CardName.FARM,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 },
    baseVP: 1,
    isUnique: false,
    isConstruction: true,
    associatedCard: null,
    playInner: playGainResourceFactory({
      resourceMap: {
        [ResourceType.BERRY]: 1,
      },
    }),
  }),
  [CardName.FOOL]: new Card({
    name: CardName.FOOL,
    cardType: CardType.TRAVELER,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: -2,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.FAIRGROUNDS,
  }),
  [CardName.GENERAL_STORE]: new Card({
    name: CardName.GENERAL_STORE,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.RESIN]: 1, [ResourceType.PEBBLE]: 1 },
    baseVP: 1,
    isUnique: false,
    isConstruction: true,
    associatedCard: CardName.SHOPKEEPER,
    playInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      player.gainResources({
        [ResourceType.BERRY]: player.hasPlayedCard(CardName.FARM) ? 2 : 1,
      });
    },
  }),
  [CardName.HISTORIAN]: new Card({
    name: CardName.HISTORIAN,
    cardType: CardType.GOVERNANCE,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 1,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.CLOCK_TOWER,
  }),
  [CardName.HUSBAND]: new Card({
    name: CardName.HUSBAND,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: 2,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.FARM,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.PLAY_CARD) {
        throw new Error("Invalid input type");
      }
      if (
        !gameInput.clientOptions?.resourcesToGain ||
        gameInput.clientOptions?.resourcesToGain[ResourceType.VP]
      ) {
        throw new Error("Invalid input");
      }
      const player = gameState.getActivePlayer();
      const playedHusbands = player.playedCards[CardName.HUSBAND] || [];
      const playedWifes = player.playedCards[CardName.WIFE] || [];
      if (playedHusbands.length <= playedWifes.length) {
        const numToGain = sumResources(gameInput.clientOptions.resourcesToGain);
        if (numToGain !== 1) {
          throw new Error(
            `Invalid resourcesToGain: ${JSON.stringify(
              gameInput.clientOptions
            )}`
          );
        }
        player.gainResources(gameInput.clientOptions.resourcesToGain);
      }
    },
  }),
  [CardName.INN]: new Card({
    name: CardName.INN,
    cardType: CardType.DESTINATION,
    baseCost: { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 },
    baseVP: 2,
    isUnique: false,
    isConstruction: true,
    associatedCard: CardName.INNKEEPER,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.INNKEEPER]: new Card({
    name: CardName.INNKEEPER,
    cardType: CardType.GOVERNANCE,
    baseCost: { [ResourceType.BERRY]: 1 },
    baseVP: 1,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.INN,
  }),
  [CardName.JUDGE]: new Card({
    name: CardName.JUDGE,
    cardType: CardType.GOVERNANCE,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: 2,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.COURTHOUSE,
  }),
  [CardName.KING]: new Card({
    name: CardName.KING,
    cardType: CardType.PROSPERITY,
    baseCost: { [ResourceType.BERRY]: 6 },
    baseVP: 4,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.CASTLE,
  }),
  [CardName.LOOKOUT]: new Card({
    name: CardName.LOOKOUT,
    cardType: CardType.DESTINATION,
    baseCost: {
      [ResourceType.TWIG]: 1,
      [ResourceType.RESIN]: 1,
      [ResourceType.PEBBLE]: 1,
    },
    baseVP: 2,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.WANDERER,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.VISIT_DESTINATION_CARD) {
        throw new Error("Invalid input type");
      }
      if (!gameInput.clientOptions?.location) {
        throw new Error("Invalid input");
      }
      const location = Location.fromName(gameInput.clientOptions?.location);
      if (
        !(
          location.type === LocationType.FOREST ||
          location.type === LocationType.BASIC
        )
      ) {
        throw new Error(`Cannot copy ${location.name}`);
      }
      location.play(gameState, gameInput);
    },
  }),
  [CardName.MINE]: new Card({
    name: CardName.MINE,
    cardType: CardType.PRODUCTION,
    baseCost: {
      [ResourceType.TWIG]: 1,
      [ResourceType.RESIN]: 1,
      [ResourceType.PEBBLE]: 1,
    },
    baseVP: 2,
    isUnique: false,
    isConstruction: true,
    associatedCard: CardName.MINER_MOLE,
    playInner: playGainResourceFactory({
      resourceMap: {
        [ResourceType.PEBBLE]: 1,
      },
    }),
  }),
  [CardName.MINER_MOLE]: new Card({
    name: CardName.MINER_MOLE,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: 1,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.MINE,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.PLAY_CARD) {
        throw new Error("Invalid input type");
      }
      if (
        !gameInput.clientOptions?.targetCard ||
        !gameInput.clientOptions?.targetPlayerId
      ) {
        throw new Error("Invalid input");
      }
      const targetPlayer = gameState.getPlayer(
        gameInput.clientOptions?.targetPlayerId
      );
      if (!targetPlayer.hasPlayedCard(gameInput.clientOptions?.targetCard)) {
        throw new Error("Invalid input");
      }
      const targetCard = Card.fromName(gameInput.clientOptions?.targetCard);
      if (targetCard.cardType !== CardType.PRODUCTION) {
        throw new Error("Invalid input");
      }
      // TODO fix this so that we compute things like no. of farms
      targetCard.playCardEffects(gameState, gameInput);
    },
  }),
  [CardName.MONASTERY]: new Card({
    name: CardName.MONASTERY,
    cardType: CardType.DESTINATION,
    baseCost: {
      [ResourceType.TWIG]: 1,
      [ResourceType.RESIN]: 1,
      [ResourceType.PEBBLE]: 1,
    },
    baseVP: 1,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.MONK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.VISIT_DESTINATION_CARD) {
        throw new Error("Invalid input type");
      }
      if (
        !gameInput.clientOptions?.targetPlayerId ||
        !gameInput.clientOptions?.resourcesToSpend
      ) {
        throw new Error("Invalid input");
      }
      if (sumResources(gameInput.clientOptions?.resourcesToSpend) !== 2) {
        throw new Error("Invalid input");
      }
      const targetPlayer = gameState.getPlayer(
        gameInput.clientOptions?.targetPlayerId
      );
      const player = gameState.getActivePlayer();
      player.spendResources(gameInput.clientOptions?.resourcesToSpend);
      targetPlayer.gainResources(gameInput.clientOptions?.resourcesToSpend);
      player.gainResources({
        [ResourceType.VP]: 2,
      });
    },
  }),
  [CardName.MONK]: new Card({
    name: CardName.MONK,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 1 },
    baseVP: 0,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.MONASTERY,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.PLAY_CARD) {
        throw new Error("Invalid input type");
      }
      if (
        !gameInput.clientOptions?.resourcesToSpend ||
        !gameInput.clientOptions?.targetPlayerId
      ) {
        throw new Error("Invalid input");
      }
      const numBerries =
        gameInput.clientOptions?.resourcesToSpend?.[ResourceType.BERRY] || 0;
      if (numBerries > 2) {
        throw new Error("Invalid input");
      }
      const targetPlayer = gameState.getPlayer(
        gameInput.clientOptions?.targetPlayerId
      );
      const player = gameState.getActivePlayer();
      player.spendResources({
        [ResourceType.BERRY]: numBerries,
      });
      targetPlayer.gainResources({
        [ResourceType.BERRY]: numBerries,
      });
      player.gainResources({
        [ResourceType.VP]: numBerries * 2,
      });
    },
  }),
  [CardName.PALACE]: new Card({
    name: CardName.PALACE,
    cardType: CardType.PROSPERITY,
    baseCost: {
      [ResourceType.TWIG]: 2,
      [ResourceType.RESIN]: 3,
      [ResourceType.PEBBLE]: 3,
    },
    baseVP: 4,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.QUEEN,
    // 1 point per unique construction
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      const playedCards = player.playedCards;
      if (playedCards) {
        var numUniqueConstructions = 0;
        for (var cardName in playedCards) {
          var card = Card.fromName(cardName as CardName);
          if (card.isConstruction && card.isUnique) {
            numUniqueConstructions++;
          }
        }
        return numUniqueConstructions;
      }
      return 0;
    },
  }),
  [CardName.PEDDLER]: new Card({
    name: CardName.PEDDLER,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 1,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.RUINS,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.PLAY_CARD) {
        throw new Error("Invalid input type");
      }
      if (
        !gameInput.clientOptions?.resourcesToSpend ||
        !gameInput.clientOptions?.resourcesToGain ||
        gameInput.clientOptions?.resourcesToGain[ResourceType.VP] ||
        gameInput.clientOptions?.resourcesToSpend[ResourceType.VP]
      ) {
        throw new Error("Invalid input");
      }

      const numSpend = gameInput.clientOptions?.resourcesToSpend;
      const numGain = gameInput.clientOptions?.resourcesToGain;
      if (numSpend > 2 || numGain !== numSpend) {
        throw new Error("Invalid input");
      }

      const player = gameState.getActivePlayer();
      player.spendResources(gameInput.clientOptions?.resourcesToSpend);
      player.gainResources(gameInput.clientOptions?.resourcesToGain);
    },
  }),
  [CardName.POST_OFFICE]: new Card({
    name: CardName.POST_OFFICE,
    cardType: CardType.DESTINATION,
    baseCost: { [ResourceType.TWIG]: 1, [ResourceType.RESIN]: 2 },
    baseVP: 2,
    isUnique: false,
    isConstruction: true,
    associatedCard: CardName.POSTAL_PIGEON,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.PLAY_CARD) {
        throw new Error("Invalid input type");
      }
      if (
        !gameInput.clientOptions?.cardsToDiscard ||
        gameInput.clientOptions?.cardsToDiscard.length !== 2
      ) {
        throw new Error("Invalid input");
      }
      const player = gameState.getActivePlayer();
      gameInput.clientOptions.cardsToDiscard.forEach((cardName) => {
        player.discardCard(cardName);
      });
      player.drawMaxCards(gameState);
    },
  }),
  [CardName.POSTAL_PIGEON]: new Card({
    name: CardName.POSTAL_PIGEON,
    cardType: CardType.TRAVELER,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 0,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.POST_OFFICE,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.QUEEN]: new Card({
    name: CardName.QUEEN,
    cardType: CardType.DESTINATION,
    baseCost: { [ResourceType.BERRY]: 5 },
    baseVP: 4,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.PALACE,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.RANGER]: new Card({
    name: CardName.RANGER,
    cardType: CardType.TRAVELER,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 1,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.DUNGEON,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.RESIN_REFINERY]: new Card({
    name: CardName.RESIN_REFINERY,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.RESIN]: 1, [ResourceType.PEBBLE]: 1 },
    baseVP: 1,
    isUnique: false,
    isConstruction: true,
    associatedCard: CardName.CHIP_SWEEP,
    playInner: playGainResourceFactory({
      resourceMap: {
        [ResourceType.RESIN]: 1,
      },
    }),
  }),
  [CardName.RUINS]: new Card({
    name: CardName.RUINS,
    cardType: CardType.TRAVELER,
    baseCost: {},
    baseVP: 0,
    isUnique: false,
    isConstruction: true,
    associatedCard: CardName.PEDDLER,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.PLAY_CARD) {
        throw new Error("Invalid input type");
      }
      if (!gameInput.clientOptions?.targetCard) {
        throw new Error("Invalid input");
      }

      const player = gameState.getActivePlayer();
      const card = Card.fromName(gameInput.clientOptions?.targetCard);
      if (!card.isConstruction) {
        throw new Error("Can only ruin constructions");
      }
      player.removeCardFromCity(gameInput.clientOptions?.targetCard);
      player.gainResources(card.baseCost);
      player.drawCards(gameState, 2);
    },
  }),
  [CardName.SCHOOL]: new Card({
    name: CardName.SCHOOL,
    cardType: CardType.PROSPERITY,
    baseCost: { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 2 },
    baseVP: 2,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.TEACHER,
    // 1 point per common critter
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      const playedCards = player.playedCards;
      if (playedCards) {
        var numCommonCritters = 0;
        for (var cardName in playedCards) {
          var card = Card.fromName(cardName as CardName);
          if (card.isCritter && !card.isUnique) {
            numCommonCritters++;
          }
        }
        return numCommonCritters;
      }
      return 0;
    },
  }),
  [CardName.SHEPHERD]: new Card({
    name: CardName.SHEPHERD,
    cardType: CardType.TRAVELER,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: 1,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.CHAPEL,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.SHOPKEEPER]: new Card({
    name: CardName.SHOPKEEPER,
    cardType: CardType.GOVERNANCE,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 1,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.GENERAL_STORE,
  }),
  [CardName.STOREHOUSE]: new Card({
    name: CardName.STOREHOUSE,
    cardType: CardType.PRODUCTION,
    baseCost: {
      [ResourceType.TWIG]: 1,
      [ResourceType.RESIN]: 1,
      [ResourceType.PEBBLE]: 1,
    },
    baseVP: 2,
    isUnique: false,
    isConstruction: true,
    associatedCard: CardName.WOODCARVER,
    playedCardInfoInner: () => ({
      resources: {
        [ResourceType.TWIG]: 0,
        [ResourceType.RESIN]: 0,
        [ResourceType.PEBBLE]: 0,
        [ResourceType.PEBBLE]: 0,
      },
    }),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.TEACHER]: new Card({
    name: CardName.TEACHER,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 2,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.SCHOOL,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.THEATRE]: new Card({
    name: CardName.THEATRE,
    cardType: CardType.PROSPERITY,
    baseCost: {
      [ResourceType.TWIG]: 3,
      [ResourceType.RESIN]: 1,
      [ResourceType.PEBBLE]: 1,
    },
    baseVP: 3,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.BARD,
    // 1 point per unique critter
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      const playedCards = player.playedCards;
      if (playedCards) {
        var numUniqueCritters = 0;
        for (var cardName in playedCards) {
          var card = Card.fromName(cardName as CardName);
          if (card.isCritter && card.isUnique) {
            numUniqueCritters++;
          }
        }
        return numUniqueCritters;
      }
      return 0;
    },
  }),
  [CardName.TWIG_BARGE]: new Card({
    name: CardName.TWIG_BARGE,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.TWIG]: 1, [ResourceType.PEBBLE]: 1 },
    baseVP: 1,
    isUnique: false,
    isConstruction: true,
    associatedCard: CardName.BARGE_TOAD,
    playInner: playGainResourceFactory({
      resourceMap: {
        [ResourceType.TWIG]: 2,
      },
    }),
  }),
  [CardName.UNDERTAKER]: new Card({
    name: CardName.UNDERTAKER,
    cardType: CardType.TRAVELER,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 1,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.CEMETARY,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.UNIVERSITY]: new Card({
    name: CardName.UNIVERSITY,
    cardType: CardType.DESTINATION,
    baseCost: { [ResourceType.RESIN]: 1, [ResourceType.PEBBLE]: 2 },
    baseVP: 3,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.DOCTOR,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType !== GameInputType.VISIT_DESTINATION_CARD) {
        throw new Error("Invalid input type");
      }
      if (
        !gameInput.clientOptions?.targetCard ||
        !gameInput.clientOptions?.resourcesToGain ||
        sumResources(gameInput.clientOptions?.resourcesToGain) !== 0 ||
        gameInput.clientOptions?.resourcesToGain[ResourceType.VP]
      ) {
        throw new Error("Invalid input");
      }
      const player = gameState.getActivePlayer();
      const card = Card.fromName(gameInput.clientOptions?.targetCard);
      if (!card.isConstruction) {
        throw new Error("Can only ruin constructions");
      }
      player.removeCardFromCity(gameInput.clientOptions?.targetCard);
      player.gainResources(card.baseCost);
      player.gainResources(gameInput.clientOptions?.resourcesToGain);
      player.gainResources({
        [ResourceType.VP]: 1,
      });
    },
  }),
  [CardName.WANDERER]: new Card({
    name: CardName.WANDERER,
    cardType: CardType.TRAVELER,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 1,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.LOOKOUT,
    playInner: playGainResourceFactory({ resourceMap: {}, numCardsToDraw: 3 }),
  }),
  [CardName.WIFE]: new Card({
    name: CardName.WIFE,
    cardType: CardType.PROSPERITY,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 2,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.FARM,
    // +3 if paired with Husband
    pointsInner: (gameState: GameState, playerId: string) => {
      // TODO: implement this!
      return 0;
    },
  }),
  [CardName.WOODCARVER]: new Card({
    name: CardName.WOODCARVER,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 2,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.STOREHOUSE,
    playInner: playSpendResourceToGetVPFactory({
      resourceType: ResourceType.TWIG,
      maxToSpend: 3,
    }),
  }),
};
