import {
  ResourceType,
  ProductionResourceMap,
  LocationType,
  LocationName,
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
  GameStateCountPointsFn,
} from "./gameState";
import { Location } from "./location";
import {
  playSpendResourceToGetVPFactory,
  sumResources,
  getPointsPerRarityLabel,
} from "./gameStatePlayHelpers";

export class Card<TCardType extends CardType = CardType>
  implements GameStatePlayable {
  readonly playInner: GameStatePlayFn | undefined;
  readonly canPlayInner: GameStateCanPlayFn | undefined;
  readonly playedCardInfoInner:
    | (() => Partial<Omit<PlayedCardInfo, "playerId">>)
    | undefined;
  readonly pointsInner: GameStateCountPointsFn | undefined;

  readonly name: CardName;
  readonly baseCost: CardCost;
  readonly baseVP: number;
  readonly cardType: TCardType;
  readonly isUnique: boolean;
  readonly isCritter: boolean;
  readonly isConstruction: boolean;
  readonly associatedCard: CardName | null;
  readonly isOpenDestination: boolean;

  readonly productionInner: GameStatePlayFn | undefined;
  readonly resourcesToGain: ProductionResourceMap | undefined;

  constructor({
    name,
    baseCost,
    baseVP,
    cardType,
    isUnique,
    isConstruction,
    associatedCard,
    resourcesToGain,
    productionInner,
    isOpenDestination = false, // if the destination is an open destination
    playInner, // called when the card is played
    canPlayInner, // called when we check canPlay function
    playedCardInfoInner, // used for cards that accumulate other cards or resources
    pointsInner, // computed if specified + added to base points
  }: {
    name: CardName;
    baseCost: CardCost;
    baseVP: number;
    cardType: TCardType;
    isUnique: boolean;
    isConstruction: boolean;
    associatedCard: CardName | null;
    isOpenDestination?: boolean;
    playInner?: GameStatePlayFn;
    canPlayInner?: GameStateCanPlayFn;
    playedCardInfoInner?: () => Partial<Omit<PlayedCardInfo, "playerId">>;
    pointsInner?: (gameState: GameState, playerId: string) => number;
  } & (TCardType extends CardType.PRODUCTION
    ? {
        resourcesToGain: ProductionResourceMap;
        productionInner?: GameStatePlayFn | undefined;
      }
    : {
        resourcesToGain?: ProductionResourceMap;
        productionInner?: undefined;
      })) {
    this.name = name;
    this.baseCost = baseCost;
    this.baseVP = baseVP;
    this.cardType = cardType;
    this.isUnique = isUnique;
    this.isCritter = !isConstruction;
    this.isConstruction = isConstruction;
    this.associatedCard = associatedCard;
    this.isOpenDestination = isOpenDestination;
    this.playInner = playInner;
    this.canPlayInner = canPlayInner;
    this.playedCardInfoInner = playedCardInfoInner;
    this.pointsInner = pointsInner;

    // Production cards
    this.productionInner = productionInner;
    this.resourcesToGain = resourcesToGain;
  }

  getPlayedCardInfo(playerId: string): PlayedCardInfo {
    const ret: PlayedCardInfo = {
      playerId,
      cardName: this.name,
    };
    if (this.isConstruction) {
      ret.usedForCritter = false;
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
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.PLAY_CARD) {
      if (!player.canAddToCity(this.name)) {
        return false;
      }
      if (
        gameInput.fromMeadow &&
        gameState.meadowCards.indexOf(this.name) === -1
      ) {
        return false;
      }
      if (
        !gameInput.fromMeadow &&
        player.cardsInHand.indexOf(this.name) === -1
      ) {
        return false;
      }
      if (!player.canAffordCard(this.name, gameInput.fromMeadow)) {
        return false;
      }
    }
    if (this.canPlayInner && !this.canPlayInner(gameState, gameInput)) {
      return false;
    }
    return true;
  }

  play(gameState: GameState, gameInput: GameInput): void {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.PLAY_CARD) {
      if (this.name !== CardName.FOOL) {
        player.addToCity(this.name);
      }
      if (
        this.cardType === CardType.PRODUCTION ||
        this.cardType === CardType.TRAVELER
      ) {
        this.gainProduction(gameState, gameInput);
        if (this.playInner) {
          this.playInner(gameState, gameInput);
        }
      }
    } else {
      this.playCardEffects(gameState, gameInput);
    }
  }

  gainProduction(gameState: GameState, gameInput: GameInput): void {
    const player = gameState.getActivePlayer();
    if (this.resourcesToGain) {
      player.gainResources(this.resourcesToGain);
      if (this.resourcesToGain.CARD) {
        player.drawCards(gameState, this.resourcesToGain.CARD);
      }
    }
    if (this.productionInner) {
      this.productionInner(gameState, gameInput);
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

  canTakeWorker(): boolean {
    return (
      this.cardType === CardType.DESTINATION ||
      this.name === CardName.STOREHOUSE
    );
  }

  static fromName(name: CardName): Card {
    if (!CARD_REGISTRY[name]) {
      throw new Error(`Invalid Card name: ${name}`);
    }
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
      const numPebblesAndResin =
        player.getNumResourcesByType(ResourceType.PEBBLE) +
        player.getNumResourcesByType(ResourceType.RESIN);
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
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.DISCARD_CARDS,
          prevInputType: gameInput.inputType,
          minCards: 0,
          maxCards: 5,
          cardContext: CardName.BARD,
          clientOptions: {
            cardsToDiscard: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.DISCARD_CARDS) {
        if (gameInput.clientOptions?.cardsToDiscard) {
          if (gameInput.clientOptions.cardsToDiscard.length > 5) {
            throw new Error("Discarding too many cards");
          }
          gameInput.clientOptions.cardsToDiscard.forEach((cardName) => {
            player.removeCardFromHand(cardName);
            gameState.discardPile.addToStack(cardName);
          });
          player.gainResources({
            [ResourceType.VP]: gameInput.clientOptions?.cardsToDiscard.length,
          });
        }
      } else {
        throw new Error(`Unexpected input type ${gameInput.inputType}`);
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
    resourcesToGain: {},
    productionInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      const playedFarms = player.getPlayedCardInfos(CardName.FARM);
      player.gainResources({
        [ResourceType.TWIG]: 2 * playedFarms.length,
      });
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
    pointsInner: getPointsPerRarityLabel({ isCritter: false, isUnique: false }),
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
      const playedShepherds = player.getPlayedCardInfos(CardName.SHEPHERD);
      if (playedShepherds.length === 0) {
        throw new Error("Invalid action");
      }
      const playedShepherd = playedShepherds[0];
      (playedShepherd.resources![ResourceType.VP] as number) += 1;
      player.drawCards(
        gameState,
        playedShepherd.resources![ResourceType.VP] as number
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
    resourcesToGain: {},
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.SELECT_CARD) {
        if (
          !gameInput.clientOptions.selectedCard ||
          !player.hasCardInCity(gameInput.clientOptions.selectedCard)
        ) {
          throw new Error("Invalid input");
        }
        const targetCard = Card.fromName(gameInput.clientOptions.selectedCard);
        if (targetCard.cardType !== CardType.PRODUCTION) {
          throw new Error("Invalid input");
        }
        targetCard.gainProduction(gameState, gameInput);
      }
    },
    productionInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      const cardOptions = player
        .getPlayedCardByType(CardType.PRODUCTION)
        .filter((cardName) => cardName !== CardName.CHIP_SWEEP);
      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_CARD,
        prevInputType: GameInputType.PLAY_CARD,
        cardOptions,
        cardOptionsUnfiltered: cardOptions,
        cardContext: CardName.CHIP_SWEEP,
        mustSelectOne: true,
        clientOptions: {
          selectedCard: null,
        },
      });
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
    resourcesToGain: {},
    productionInner: playSpendResourceToGetVPFactory({
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

      return player.getNumCardType(CardType.PROSPERITY);
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
    resourcesToGain: {
      CARD: 2,
    },
  }),
  [CardName.FARM]: new Card({
    name: CardName.FARM,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 },
    baseVP: 1,
    isUnique: false,
    isConstruction: true,
    associatedCard: null,
    resourcesToGain: {
      [ResourceType.BERRY]: 1,
    },
  }),
  [CardName.FOOL]: new Card({
    name: CardName.FOOL,
    cardType: CardType.TRAVELER,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: -2,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.FAIRGROUNDS,
    canPlayInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      return gameState.players
        .filter((p) => p.playerId !== player.playerId)
        .some((p) => p.canAddToCity(CardName.FOOL));
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYER,
          prevInputType: gameInput.inputType,
          cardContext: CardName.FOOL,
          playerOptions: gameState.players
            .filter((p) => p.playerId !== player.playerId)
            .map((p) => p.playerId),
          mustSelectOne: true,
          clientOptions: {
            selectedPlayer: null,
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYER) {
        if (!gameInput.clientOptions.selectedPlayer) {
          throw new Error("invalid input");
        }
        const selectedPlayer = gameState.getPlayer(
          gameInput.clientOptions.selectedPlayer
        );
        selectedPlayer.addToCity(CardName.FOOL);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [CardName.GENERAL_STORE]: new Card({
    name: CardName.GENERAL_STORE,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.RESIN]: 1, [ResourceType.PEBBLE]: 1 },
    baseVP: 1,
    isUnique: false,
    isConstruction: true,
    associatedCard: CardName.SHOPKEEPER,
    resourcesToGain: {
      [ResourceType.BERRY]: 1,
    },
    productionInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      player.gainResources({
        [ResourceType.BERRY]: player.hasCardInCity(CardName.FARM) ? 1 : 0,
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
    resourcesToGain: {},
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        const resources = gameInput.clientOptions?.resources;
        if (!resources || (resources as any)[ResourceType.VP]) {
          throw new Error("Invalid input");
        }
        const numToGain = sumResources(resources);
        if (numToGain !== 1) {
          throw new Error(`Invalid resources: ${JSON.stringify(resources)}`);
        }
        player.gainResources(resources);
      }
    },
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        const playedHusbands = player.getPlayedCardInfos(CardName.HUSBAND);
        const playedWifes = player.getPlayedCardInfos(CardName.WIFE);
        if (playedHusbands.length <= playedWifes.length) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_RESOURCES,
            prevInputType: gameInput.inputType,
            cardContext: CardName.HUSBAND,
            maxResources: 1,
            minResources: 1,
            clientOptions: {
              resources: {},
            },
          });
        }
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
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
    isOpenDestination: true,
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
      throw new Error("Not implemented");

      // const player = gameState.getActivePlayer();
      // if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
      //   player.drawCards(gameState, 1);

      //   // ask player which location they want to copy
      //   const possibleLocations = (Object.keys(
      //     gameState.locationsMap
      //   ) as unknown) as LocationName[];

      //   gameState.pendingGameInputs.push({
      //     inputType: GameInputType.SELECT_LOCATION,
      //     prevInputType: GameInputType.VISIT_DESTINATION_CARD,
      //     cardContext: CardName.LOOKOUT,
      //     locationOptions: possibleLocations,
      //     clientOptions: {
      //       selectedLocation: null,
      //     },
      //   });
      // } else if (gameInput.inputType === GameInputType.SELECT_LOCATION) {
      //   const selectedLocation = gameInput.clientOptions.selectedLocation;

      //   if (!selectedLocation) {
      //     throw new Error("Invalid location selected");
      //   }

      //   const location = Location.fromName(selectedLocation);

      //   if (!location.canPlay(gameState, gameInput)) {
      //     throw new Error("location can't be played");
      //   }

      //   location.play(gameState, gameInput);
      // } else {
      //   throw new Error(`Invalid input type ${gameInput.inputType}`);
      // }

      // if (gameInput.inputType !== GameInputType.VISIT_DESTINATION_CARD) {
      //   throw new Error("Invalid input type");
      // }
      // if (!gameInput.clientOptions?.location) {
      //   throw new Error("Invalid input");
      // }
      // const location = Location.fromName(gameInput.clientOptions?.location);
      // if (
      //   !(
      //     location.type === LocationType.FOREST ||
      //     location.type === LocationType.BASIC
      //   )
      // ) {
      //   throw new Error(`Cannot copy ${location.name}`);
      // }
      // location.play(gameState, gameInput);
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
    resourcesToGain: {
      [ResourceType.PEBBLE]: 1,
    },
  }),
  [CardName.MINER_MOLE]: new Card({
    name: CardName.MINER_MOLE,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: 1,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.MINE,
    resourcesToGain: {},
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      throw new Error("Not implemented");
      // if (gameInput.inputType !== GameInputType.PLAY_CARD) {
      //   throw new Error("Invalid input type");
      // }
      // if (
      //   !gameInput.clientOptions?.targetCard ||
      //   !gameInput.clientOptions?.targetPlayerId
      // ) {
      //   throw new Error("Invalid input");
      // }
      // const targetPlayer = gameState.getPlayer(
      //   gameInput.clientOptions?.targetPlayerId
      // );
      // if (!targetPlayer.hasCardInCity(gameInput.clientOptions?.targetCard)) {
      //   throw new Error("Invalid input");
      // }
      // const targetCard = Card.fromName(gameInput.clientOptions?.targetCard);
      // if (targetCard.cardType !== CardType.PRODUCTION) {
      //   throw new Error("Invalid input");
      // }
      // // TODO fix this so that we compute things like no. of farms
      // targetCard.gainProduction(gameState, gameInput);
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
      throw new Error("Not implemented");
      // if (gameInput.inputType !== GameInputType.VISIT_DESTINATION_CARD) {
      //   throw new Error("Invalid input type");
      // }
      // if (
      //   !gameInput.clientOptions?.targetPlayerId ||
      //   !gameInput.clientOptions?.resourcesToSpend
      // ) {
      //   throw new Error("Invalid input");
      // }
      // if (sumResources(gameInput.clientOptions?.resourcesToSpend) !== 2) {
      //   throw new Error("Invalid input");
      // }
      // const targetPlayer = gameState.getPlayer(
      //   gameInput.clientOptions?.targetPlayerId
      // );
      // const player = gameState.getActivePlayer();
      // player.spendResources(gameInput.clientOptions?.resourcesToSpend);
      // targetPlayer.gainResources(gameInput.clientOptions?.resourcesToSpend);
      // player.gainResources({
      //   [ResourceType.VP]: 2,
      // });
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
    resourcesToGain: {},
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        const numBerries =
          gameInput.clientOptions.resources[ResourceType.BERRY] || 0;
        if (numBerries === 0) {
          return;
        }
        if (numBerries > 2) {
          throw new Error("Too many berries");
        }
        player.spendResources({
          [ResourceType.BERRY]: numBerries,
        });
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYER,
          prevInputType: gameInput.inputType,
          prevInput: gameInput,
          cardContext: CardName.MONK,
          playerOptions: gameState.players
            .filter((p) => p.playerId !== player.playerId)
            .map((p) => p.playerId),
          mustSelectOne: true,
          clientOptions: {
            selectedPlayer: null,
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYER) {
        if (
          !gameInput.prevInput ||
          gameInput.prevInput.inputType !== GameInputType.SELECT_RESOURCES
        ) {
          throw new Error("Invalid input");
        }
        if (!gameInput.clientOptions.selectedPlayer) {
          throw new Error("Invalid input");
        }
        if (gameInput.clientOptions.selectedPlayer === player.playerId) {
          throw new Error("Invalid input");
        }
        const numBerries =
          gameInput.prevInput.clientOptions.resources[ResourceType.BERRY] || 0;
        const targetPlayer = gameState.getPlayer(
          gameInput.clientOptions.selectedPlayer
        );
        targetPlayer.gainResources({
          [ResourceType.BERRY]: numBerries,
        });
        player.gainResources({
          [ResourceType.VP]: 2 * numBerries,
        });
      }
    },
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        if (player.getNumResourcesByType(ResourceType.BERRY) === 0) {
          return;
        }
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: gameInput.inputType,
          maxResources: 2,
          minResources: 0,
          specificResource: ResourceType.BERRY,
          cardContext: CardName.MONK,
          clientOptions: {
            resources: {},
          },
        });
      } else {
        throw new Error("Invalid input type");
      }
      // if (
      //   !gameInput.clientOptions?.resourcesToSpend ||
      //   !gameInput.clientOptions?.targetPlayerId
      // ) {
      //   throw new Error("Invalid input");
      // }
      // const numBerries =
      //   gameInput.clientOptions?.resourcesToSpend?.[ResourceType.BERRY] || 0;
      // if (numBerries > 2) {
      //   throw new Error("Invalid input");
      // }
      // const targetPlayer = gameState.getPlayer(
      //   gameInput.clientOptions?.targetPlayerId
      // );
      // const player = gameState.getActivePlayer();
      // player.spendResources({
      //   [ResourceType.BERRY]: numBerries,
      // });
      // targetPlayer.gainResources({
      //   [ResourceType.BERRY]: numBerries,
      // });
      // player.gainResources({
      //   [ResourceType.VP]: numBerries * 2,
      // });
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
    pointsInner: getPointsPerRarityLabel({ isCritter: false, isUnique: true }),
  }),
  [CardName.PEDDLER]: new Card({
    name: CardName.PEDDLER,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 1,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.RUINS,
    resourcesToGain: {},
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        if (gameInput.prevInputType === GameInputType.PLAY_CARD) {
          const numResources = sumResources(gameInput.clientOptions.resources);
          if (numResources < gameInput.minResources) {
            throw new Error("Too few resources");
          } else if (numResources > gameInput.maxResources) {
            throw new Error("Too many resources");
          }
          if (numResources !== 0) {
            gameState.pendingGameInputs.push({
              inputType: GameInputType.SELECT_RESOURCES,
              prevInputType: gameInput.inputType,
              cardContext: CardName.PEDDLER,
              maxResources: numResources,
              minResources: numResources,
              clientOptions: {
                resources: {},
              },
            });
            player.spendResources(gameInput.clientOptions.resources);
          }
        } else {
          const numResources = sumResources(gameInput.clientOptions.resources);
          if (numResources < gameInput.minResources) {
            throw new Error("Too few resources");
          } else if (numResources > gameInput.maxResources) {
            throw new Error("Too many resources");
          }
          player.gainResources(gameInput.clientOptions.resources);
        }
      }
    },
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        if (player.getNumResources() !== 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_RESOURCES,
            prevInputType: gameInput.inputType,
            cardContext: CardName.PEDDLER,
            maxResources: 2,
            minResources: 0,
            clientOptions: {
              resources: {},
            },
          });
        }
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
      // if (
      //   !gameInput.clientOptions?.resourcesToSpend ||
      //   !gameInput.clientOptions?.resourcesToGain ||
      //   gameInput.clientOptions?.resourcesToGain[ResourceType.VP] ||
      //   gameInput.clientOptions?.resourcesToSpend[ResourceType.VP]
      // ) {
      //   throw new Error("Invalid input");
      // }

      // const numSpend = gameInput.clientOptions?.resourcesToSpend;
      // const numGain = gameInput.clientOptions?.resourcesToGain;
      // if (numSpend > 2 || numGain !== numSpend) {
      //   throw new Error("Invalid input");
      // }

      // const player = gameState.getActivePlayer();
      // player.spendResources(gameInput.clientOptions?.resourcesToSpend);
      // player.gainResources(gameInput.clientOptions?.resourcesToGain);
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
    isOpenDestination: true,
    canPlayInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // Need at least 2 cards to visit this card
        const player = gameState.getActivePlayer();
        return player.cardsInHand.length >= 2;
      }
      return true;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYER,
          prevInputType: gameInput.inputType,
          cardContext: CardName.POST_OFFICE,
          playerOptions: gameState.players
            .filter((p) => p.playerId !== player.playerId)
            .map((p) => p.playerId),
          mustSelectOne: true,
          clientOptions: {
            selectedPlayer: null,
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYER) {
        if (!gameInput.clientOptions.selectedPlayer) {
          throw new Error("Must select a player");
        }
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_MULTIPLE_CARDS,
          prevInputType: gameInput.inputType,
          prevInput: gameInput,
          cardContext: CardName.POST_OFFICE,
          cardOptions: player.cardsInHand,
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_MULTIPLE_CARDS) {
        if (
          gameInput.prevInput &&
          gameInput.prevInput.inputType === GameInputType.SELECT_PLAYER
        ) {
          if (!gameInput.prevInput.clientOptions.selectedPlayer) {
            throw new Error("Invalid input");
          }
          if (gameInput.clientOptions.selectedCards.length !== 2) {
            throw new Error("Must select 2 cards");
          }
          const selectedPlayer = gameState.getPlayer(
            gameInput.prevInput.clientOptions.selectedPlayer
          );
          gameInput.clientOptions.selectedCards.forEach((cardName) => {
            player.removeCardFromHand(cardName);
            selectedPlayer.addCardToHand(gameState, cardName);
          });
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_MULTIPLE_CARDS,
            prevInputType: gameInput.inputType,
            cardContext: CardName.POST_OFFICE,
            cardOptions: player.cardsInHand,
            maxToSelect: player.cardsInHand.length,
            minToSelect: 0,
            clientOptions: {
              selectedCards: [],
            },
          });
        } else {
          gameInput.clientOptions.selectedCards.forEach((cardName) => {
            player.removeCardFromHand(cardName);
            gameState.discardPile.addToStack(cardName);
          });
          player.drawMaxCards(gameState);
        }
      }
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
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        if (gameState.pendingGameInputs.length !== 0) {
          throw new Error("Should not have any pending game input");
        }
        const cardOptions = [gameState.drawCard(), gameState.drawCard()];
        const player = gameState.getActivePlayer();
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARD,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.POSTAL_PIGEON,
          mustSelectOne: false,
          cardOptions: cardOptions.filter((cardName) => {
            const cardOption = Card.fromName(cardName);
            if (cardOption.baseVP > 3) {
              return false;
            }
            return player.canAddToCity(cardName);
          }),
          cardOptionsUnfiltered: cardOptions,
          clientOptions: {
            selectedCard: null,
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARD &&
        gameInput.prevInputType === GameInputType.PLAY_CARD &&
        gameInput.cardContext === CardName.POSTAL_PIGEON
      ) {
        const player = gameState.getActivePlayer();
        const cardOptionsUnfiltered = [...gameInput.cardOptionsUnfiltered];
        if (gameInput.clientOptions.selectedCard) {
          player.addToCity(gameInput.clientOptions.selectedCard);
          cardOptionsUnfiltered.splice(
            cardOptionsUnfiltered.indexOf(gameInput.clientOptions.selectedCard),
            1
          );
        }
        cardOptionsUnfiltered.forEach((cardName) => {
          gameState.discardPile.addToStack(cardName);
        });
      } else {
        throw new Error("Invalid game input");
      }
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
      throw new Error("Not implemented");
      // if (gameInput.inputType === GameInputType.PLAY_CARD) {
      //   // If you have workers deployed
      //   const locations: LocationName[] = [];
      //   gameState.pendingGameInputs.push({
      //     inputType: GameInputType.SELECT_LOCATION,
      //     prevInputType: gameInput.inputType,
      //     locationOptions: locations,
      //     cardContext: CardName.RANGER,
      //     clientOptions: {
      //       selectedLocation: null,
      //     },
      //   });
      // } else if (gameInput.inputType === GameInputType.SELECT_LOCATION) {
      // } else {
      //   throw new Error(`Unexpected input type: ${gameInput.inputType}`);
      // }
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
    resourcesToGain: {
      [ResourceType.RESIN]: 1,
    },
  }),
  [CardName.RUINS]: new Card({
    name: CardName.RUINS,
    cardType: CardType.TRAVELER,
    baseCost: {},
    baseVP: 0,
    isUnique: false,
    isConstruction: true,
    associatedCard: CardName.PEDDLER,
    canPlayInner: (gameState: GameState, gameInput: GameInput) => {
      // Need to be able to ruin an existing construction.
      const player = gameState.getActivePlayer();
      let hasConstruction = false;
      player.forEachPlayedCard(({ cardName }) => {
        if (!hasConstruction) {
          const card = Card.fromName(cardName);
          hasConstruction = card.isConstruction;
        }
      });
      return hasConstruction;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        const cardOptions: CardName[] = [];
        player.forEachPlayedCard(({ cardName }) => {
          const card = Card.fromName(cardName);
          if (card.isConstruction) {
            cardOptions.push(cardName);
          }
        });
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARD,
          prevInputType: GameInputType.PLAY_CARD,
          cardOptions,
          cardOptionsUnfiltered: cardOptions,
          cardContext: CardName.RUINS,
          mustSelectOne: true,
          clientOptions: {
            selectedCard: null,
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_CARD) {
        if (
          !gameInput.clientOptions.selectedCard ||
          !player.hasCardInCity(gameInput.clientOptions.selectedCard)
        ) {
          throw new Error("Invalid input");
        }
        const targetCard = Card.fromName(gameInput.clientOptions.selectedCard);
        if (!targetCard.isConstruction) {
          throw new Error("Cannot ruins non-construction");
        }
        player.removeCardFromCity(gameState, targetCard.name, true);
        player.drawCards(gameState, 2);
      } else {
        throw new Error("Invalid input type");
      }
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
    pointsInner: getPointsPerRarityLabel({ isCritter: true, isUnique: false }),
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
    resourcesToGain: {},
    playedCardInfoInner: () => ({
      resources: {
        [ResourceType.TWIG]: 0,
        [ResourceType.RESIN]: 0,
        [ResourceType.PEBBLE]: 0,
        [ResourceType.BERRY]: 0,
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
    resourcesToGain: {},
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
    pointsInner: getPointsPerRarityLabel({ isCritter: true, isUnique: true }),
  }),
  [CardName.TWIG_BARGE]: new Card({
    name: CardName.TWIG_BARGE,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.TWIG]: 1, [ResourceType.PEBBLE]: 1 },
    baseVP: 1,
    isUnique: false,
    isConstruction: true,
    associatedCard: CardName.BARGE_TOAD,
    resourcesToGain: {
      [ResourceType.TWIG]: 2,
    },
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
      throw new Error("Not implemented");
      // if (gameInput.inputType !== GameInputType.VISIT_DESTINATION_CARD) {
      //   throw new Error("Invalid input type");
      // }
      // if (
      //   !gameInput.clientOptions?.targetCard ||
      //   !gameInput.clientOptions?.resourcesToGain ||
      //   sumResources(gameInput.clientOptions?.resourcesToGain) !== 0 ||
      //   gameInput.clientOptions?.resourcesToGain[ResourceType.VP]
      // ) {
      //   throw new Error("Invalid input");
      // }
      // const player = gameState.getActivePlayer();
      // const card = Card.fromName(gameInput.clientOptions?.targetCard);
      // if (!card.isConstruction) {
      //   throw new Error("Can only ruin constructions");
      // }
      // player.removeCardFromCity(gameState, gameInput.clientOptions?.targetCard);
      // player.gainResources(card.baseCost);
      // player.gainResources(gameInput.clientOptions?.resourcesToGain);
      // player.gainResources({
      //   [ResourceType.VP]: 1,
      // });
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
    resourcesToGain: {
      CARD: 3,
    },
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
    resourcesToGain: {},
    playInner: playSpendResourceToGetVPFactory({
      resourceType: ResourceType.TWIG,
      maxToSpend: 3,
    }),
  }),
};
