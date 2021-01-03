import {
  GameInputPlaceWorker,
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
  GameStateCanPlayCheckFn,
  GameStateCountPointsFn,
} from "./gameState";
import { Location } from "./location";
import { Player } from "./player";
import {
  playSpendResourceToGetVPFactory,
  gainProductionSpendResourceToGetVPFactory,
  sumResources,
  getPointsPerRarityLabel,
} from "./gameStatePlayHelpers";
import cloneDeep from "lodash/cloneDeep";
import pull from "lodash/pull";
import { assertUnreachable } from "../utils";

type MaxWorkersInnerFn = (cardOwner: Player) => number;
type ProductionInnerFn = (
  gameState: GameState,
  gameInput: GameInput,
  cardOwner: Player
) => void;

export class Card<TCardType extends CardType = CardType>
  implements GameStatePlayable {
  readonly cardDescription: string[] | undefined;
  readonly playInner: GameStatePlayFn | undefined;
  readonly canPlayCheckInner: GameStateCanPlayCheckFn | undefined;
  readonly playedCardInfoDefault:
    | Partial<Omit<PlayedCardInfo, "playerId">>
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

  readonly productionInner: ProductionInnerFn | undefined;
  readonly resourcesToGain: ProductionResourceMap | undefined;
  readonly maxWorkersInner: MaxWorkersInnerFn | undefined;

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
    cardDescription,
    isOpenDestination = false, // if the destination is an open destination
    playInner, // called when the card is played
    canPlayCheckInner, // called when we check canPlay function
    playedCardInfoDefault,
    pointsInner, // computed if specified + added to base points
    maxWorkersInner,
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
    canPlayCheckInner?: GameStateCanPlayCheckFn;
    playedCardInfoDefault?: Partial<Omit<PlayedCardInfo, "playerId">>;
    pointsInner?: (gameState: GameState, playerId: string) => number;
    maxWorkersInner?: MaxWorkersInnerFn;
    cardDescription?: string[] | undefined;
  } & (TCardType extends CardType.PRODUCTION
    ? {
        resourcesToGain: ProductionResourceMap;
        productionInner?: ProductionInnerFn | undefined;
      }
    : {
        resourcesToGain?: ProductionResourceMap;
        productionInner?: undefined;
      })) {
    this.name = name;
    this.baseCost = Object.freeze(baseCost);
    this.baseVP = baseVP;
    this.cardType = cardType;
    this.isUnique = isUnique;
    this.isCritter = !isConstruction;
    this.isConstruction = isConstruction;
    this.associatedCard = associatedCard;
    this.isOpenDestination = isOpenDestination;
    this.playInner = playInner;
    this.canPlayCheckInner = canPlayCheckInner;
    this.playedCardInfoDefault = playedCardInfoDefault;
    this.pointsInner = pointsInner;
    this.cardDescription = cardDescription;

    // Production cards
    this.productionInner = productionInner;
    this.resourcesToGain = resourcesToGain;

    this.maxWorkersInner = maxWorkersInner;
  }

  getPlayedCardInfo(playerId: string): PlayedCardInfo {
    const ret: PlayedCardInfo = {
      cardOwnerId: playerId,
      cardName: this.name,
    };
    if (this.isConstruction) {
      ret.usedForCritter = false;
    }
    if (this.cardType == CardType.DESTINATION) {
      ret.workers = [];
    }
    return {
      ...ret,
      ...cloneDeep(this.playedCardInfoDefault || {}),
    };
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    return !this.canPlayCheck(gameState, gameInput);
  }

  canPlayCheck(gameState: GameState, gameInput: GameInput): string | null {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.PLAY_CARD) {
      // Don't check for FOOL since its not played in the active player's city
      if (this.name !== CardName.FOOL) {
        if (!player.canAddToCity(this.name, false /* strict */)) {
          return `Cannot add ${this.name} to player's city`;
        }
      }
      if (
        gameInput.clientOptions.fromMeadow &&
        gameState.meadowCards.indexOf(this.name) === -1
      ) {
        return `Card ${
          this.name
        } does not exist in the meadow.\n ${JSON.stringify(
          gameState.meadowCards,
          null,
          2
        )}`;
      }
      if (
        !gameInput.clientOptions.fromMeadow &&
        player.cardsInHand.indexOf(this.name) === -1
      ) {
        return `Card ${
          this.name
        } does not exist in your hand.\n ${JSON.stringify(
          player.cardsInHand,
          null,
          2
        )}`;
      }
    }
    if (this.canPlayCheckInner) {
      const errorMsg = this.canPlayCheckInner(gameState, gameInput);
      if (errorMsg) {
        return errorMsg;
      }
    }
    return null;
  }

  play(gameState: GameState, gameInput: GameInput): void {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.PLAY_CARD) {
      if (this.name !== CardName.FOOL && this.name !== CardName.RUINS) {
        player.addToCity(this.name);
      }
      if (
        this.cardType === CardType.PRODUCTION ||
        this.cardType === CardType.TRAVELER
      ) {
        this.gainProduction(gameState, gameInput, player);
        if (this.playInner) {
          this.playInner(gameState, gameInput);
        }
      }
      [CardName.HISTORIAN, CardName.SHOPKEEPER, CardName.COURTHOUSE].forEach(
        (cardName) => {
          if (player.hasCardInCity(cardName)) {
            const card = Card.fromName(cardName);
            card.playCardEffects(gameState, gameInput);
          }
        }
      );
    } else {
      this.playCardEffects(gameState, gameInput);
    }
  }

  gainProduction(
    gameState: GameState,
    gameInput: GameInput,
    cardOwner: Player
  ): void {
    const player = gameState.getActivePlayer();
    if (this.resourcesToGain) {
      player.gainResources(this.resourcesToGain);
      if (this.resourcesToGain.CARD) {
        player.drawCards(gameState, this.resourcesToGain.CARD);
      }
    }
    if (this.productionInner) {
      this.productionInner(gameState, gameInput, cardOwner);
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

  getMaxWorkers(cardOwner: Player): number {
    if (this.maxWorkersInner) {
      return this.maxWorkersInner(cardOwner);
    }
    if (this.cardType === CardType.DESTINATION) {
      return 1;
    }
    return 0;
  }

  getNumResourcesInCost(): number {
    return (
      (this.baseCost[ResourceType.BERRY] || 0) +
      (this.baseCost[ResourceType.TWIG] || 0) +
      (this.baseCost[ResourceType.RESIN] || 0) +
      (this.baseCost[ResourceType.PEBBLE] || 0)
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
    cardDescription: [
      "VP",
      " for each of your unused ",
      ResourceType.RESIN,
      " and ",
      ResourceType.PEBBLE,
      ", to a maximum of 6.",
    ],
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
    cardDescription: [
      "You may discard up to 5 ",
      "CARD",
      "to gain 1 ",
      "VP",
      " each.",
    ],
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
    cardDescription: [
      "Gain 2 ",
      ResourceType.TWIG,
      " for each Farm in your city.",
    ],
    productionInner: (
      gameState: GameState,
      gameInput: GameInput,
      cardOwner: Player
    ) => {
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
    cardDescription: ["VP", " for each Common Construction in your city."],
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
    cardDescription: [
      "Worker stays here permanently. Reveal 4 ",
      "CARD",
      " from the deck or discard pile and play 1 for free. Discard the others.",
    ],
    maxWorkersInner: (cardOwner: Player) => {
      return cardOwner.hasCardInCity(CardName.UNDERTAKER) ? 2 : 1;
    },
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
    cardDescription: [
      "Place 1 ",
      "VP",
      " on this Chapel, then draw 2 ",
      "CARD",
      " for each ",
      "VP",
      " on this Chapel.",
    ],
    playedCardInfoDefault: {
      resources: {
        [ResourceType.VP]: 0,
      },
    },
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
    cardDescription: ["Activate 1 ", "production card", " in your city."],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (
          !selectedCards ||
          selectedCards.length !== 1 ||
          !selectedCards[0].cardName ||
          !player.hasCardInCity(selectedCards[0].cardName)
        ) {
          throw new Error("Invalid input");
        }
        const targetCard = Card.fromName(selectedCards[0].cardName);
        if (targetCard.cardType !== CardType.PRODUCTION) {
          throw new Error("Invalid input");
        }
        targetCard.gainProduction(gameState, gameInput, player);
      }
    },
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const cardOptions = player
        .getAllPlayedCardsByType(CardType.PRODUCTION)
        .filter(({ cardName }) => cardName !== CardName.CHIP_SWEEP);
      if (cardOptions.length !== 0) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: gameInput.inputType,
          cardOptions,
          cardContext: CardName.CHIP_SWEEP,
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [],
          },
        });
      }
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
    cardDescription: [
      "When played, place 3 ",
      "VP",
      " here. At the beginning of Preparing for Season, you may pay 1 ",
      "VP",
      " from here to activate 1 of the Basic or Forest locations where you have a worker deployed.",
    ],
    playedCardInfoDefault: {
      resources: {
        [ResourceType.VP]: 3,
      },
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const playedClockTower = player.getPlayedCardInfos(
        CardName.CLOCK_TOWER
      )?.[0];
      if (!playedClockTower || !playedClockTower.resources?.[ResourceType.VP]) {
        return;
      }
      if (gameInput.inputType === GameInputType.PREPARE_FOR_SEASON) {
        const basicAndForestLocationOptions = player
          .getRecallableWorkers()
          .filter((workerInfo) => {
            if (!workerInfo.location) {
              return false;
            }
            const location = Location.fromName(workerInfo.location);
            return (
              location.type === LocationType.BASIC ||
              location.type === LocationType.FOREST
            );
          });
        if (basicAndForestLocationOptions.length !== 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_WORKER_PLACEMENT,
            prevInputType: gameInput.inputType,
            options: basicAndForestLocationOptions,
            cardContext: CardName.CLOCK_TOWER,
            mustSelectOne: false,
            clientOptions: {
              selectedOption: null,
            },
          });
        }
      } else if (
        gameInput.inputType === GameInputType.SELECT_WORKER_PLACEMENT
      ) {
        const selectedOption = gameInput.clientOptions.selectedOption;
        if (selectedOption) {
          if (!selectedOption.location) {
            throw new Error("Invalid input");
          }
          const location = Location.fromName(selectedOption.location);
          if (
            location.type !== LocationType.BASIC &&
            location.type !== LocationType.FOREST
          ) {
            throw new Error("Can only active basic / forest locations");
          }
          const locationsMap = gameState.locationsMap[location.name];
          if (!locationsMap || locationsMap.indexOf(player.playerId) === -1) {
            throw new Error("Can't find worker at location");
          }
          location.play(gameState, gameInput);
          playedClockTower.resources[ResourceType.VP] =
            (playedClockTower.resources[ResourceType.VP] || 0) - 1;
        }
      }
    },
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
    cardDescription: [
      "Gain 1 ",
      ResourceType.TWIG,
      " or 1 ",
      ResourceType.RESIN,
      " or 1 ",
      ResourceType.PEBBLE,
      " after you play a Construction.",
    ],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.PLAY_CARD &&
        gameInput.clientOptions.card !== CardName.COURTHOUSE &&
        gameInput.clientOptions.card &&
        Card.fromName(gameInput.clientOptions.card).isConstruction
      ) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: gameInput.inputType,
          cardContext: CardName.COURTHOUSE,
          maxResources: 1,
          minResources: 1,
          excludeResource: ResourceType.BERRY,
          clientOptions: {
            resources: {},
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        const resources = gameInput.clientOptions?.resources;
        if (
          !resources ||
          resources[ResourceType.BERRY] ||
          (resources as any)[ResourceType.VP]
        ) {
          throw new Error("Invalid input");
        }
        const numToGain = sumResources(resources);
        if (numToGain !== 1) {
          throw new Error(`Invalid resources: ${JSON.stringify(resources)}`);
        }
        player.gainResources(resources);
      }
    },
  }),
  [CardName.CRANE]: new Card({
    name: CardName.CRANE,
    cardType: CardType.GOVERNANCE,
    baseCost: { [ResourceType.PEBBLE]: 1 },
    baseVP: 1,
    isUnique: true,
    isConstruction: true,
    associatedCard: CardName.ARCHITECT,
    cardDescription: [
      "When playing a Construction, you may discard this Crane from your city, ",
      "to play that Construction for 3 fewer ",
      "ANY",
      ".",
    ],
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
    cardDescription: [
      "You may pay up to 3 ",
      ResourceType.BERRY,
      " to gain 1 ",
      "VP",
      " each.",
    ],
    productionInner: gainProductionSpendResourceToGetVPFactory({
      card: CardName.DOCTOR,
      resourceType: ResourceType.BERRY,
      maxToSpend: 3,
    }),
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
    cardDescription: [
      "When playing a Construction or Critter, you may place a Critter ",
      "from your city face-down beneatth this Dungeon to ",
      "decrease the cost by 3 ",
      "ANY",
      ".",
    ],
    playedCardInfoDefault: {
      pairedCards: [],
    },
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
    cardDescription: ["VP", " for each Prosperity card in your city."],
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
    cardDescription: ["Draw 2 ", "CARD", "."],
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
    cardDescription: [
      "Play this Fool into an empty space in an opponent's city.",
    ],
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        !gameState.players
          .filter((p) => p.playerId !== player.playerId)
          .some((p) => p.canAddToCity(CardName.FOOL, true /* strict */))
      ) {
        return `Unable to add ${CardName.FOOL} to any player's city`;
      }
      return null;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYER,
          prevInputType: gameInput.inputType,
          cardContext: CardName.FOOL,
          playerOptions: gameState.players
            .filter((p) => {
              return (
                p.playerId !== player.playerId &&
                p.canAddToCity(CardName.FOOL, true /* strict */)
              );
            })
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
    resourcesToGain: {},
    cardDescription: [
      "Gain 1 ",
      ResourceType.BERRY,
      ". ",
      "If you have a Farm in your city, gain 1 additional ",
      ResourceType.BERRY,
      ".",
    ],
    productionInner: (
      gameState: GameState,
      gameInput: GameInput,
      cardOwner: Player
    ) => {
      const player = gameState.getActivePlayer();
      player.gainResources({
        [ResourceType.BERRY]: cardOwner.hasCardInCity(CardName.FARM) ? 2 : 1,
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
    cardDescription: [
      "Draw 1 ",
      "CARD",
      " after you play a Critter or Construction.",
    ],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.PLAY_CARD &&
        gameInput.clientOptions.card !== CardName.HISTORIAN
      ) {
        player.drawCards(gameState, 1);
      }
    },
  }),
  [CardName.HUSBAND]: new Card({
    name: CardName.HUSBAND,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: 2,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.FARM,
    cardDescription: [
      "Gain 1 ",
      "ANY",
      " if paired with a Wife and you have at least 1 Farm in your city.",
    ],
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
    productionInner: (
      gameState: GameState,
      gameInput: GameInput,
      cardOwner: Player
    ) => {
      const player = gameState.getActivePlayer();
      const playedHusbands = cardOwner.getPlayedCardInfos(CardName.HUSBAND);
      const playedWifes = cardOwner.getPlayedCardInfos(CardName.WIFE);
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
    cardDescription: [
      "Play a Critter or Construction from the Meadow ",
      "for 3 fewer ",
      "ANY",
      ".",
    ],
    // Play meadow card for 3 less resources
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // add pending input to select 1 card from the list of meadow cards

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardOptions: gameState.meadowCards,
          maxToSelect: 1,
          minToSelect: 1,
          cardContext: CardName.INN,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        const selectedCards = gameInput.clientOptions.selectedCards;

        if (!selectedCards) {
          throw new Error("no card selected");
        }

        if (selectedCards.length !== 1) {
          throw new Error("incorrect number of cards selected");
        }

        const selectedCard = selectedCards[0];

        if (gameState.meadowCards.indexOf(selectedCard) < 0) {
          throw new Error("must select card from meadow when playing inn");
        }

        // discount cost by 3
        // have player play card to city
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PAYMENT_FOR_CARD,
          prevInputType: GameInputType.SELECT_CARDS,
          cardContext: CardName.INN,
          card: selectedCard,
          clientOptions: {
            card: selectedCard,
            paymentOptions: { resources: {} },
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_PAYMENT_FOR_CARD
      ) {
        if (!gameInput.clientOptions?.paymentOptions?.resources) {
          throw new Error(
            "Invalid input: clientOptions.paymentOptions.resources missing"
          );
        }
        const card = Card.fromName(gameInput.card);
        const paymentError = player.validatePaidResources(
          gameInput.clientOptions.paymentOptions.resources,
          card.baseCost,
          "ANY"
        );
        if (paymentError) {
          throw new Error(paymentError);
        }
        player.payForCard(gameState, gameInput);
        player.addToCity(card.name);
        card.play(gameState, gameInput);
      }
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
    cardDescription: [
      "When playing a Critter, ",
      "you many discard this Innkeeper from your city ",
      "to decrease the cost by 3 ",
      ResourceType.BERRY,
      ".",
    ],
  }),
  [CardName.JUDGE]: new Card({
    name: CardName.JUDGE,
    cardType: CardType.GOVERNANCE,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: 2,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.COURTHOUSE,
    cardDescription: [
      "When you play a Critter or Construction, ",
      "you may replace 1 ",
      "ANY",
      " with 1 ",
      "ANY",
      ".",
    ],
  }),
  [CardName.KING]: new Card({
    name: CardName.KING,
    cardType: CardType.PROSPERITY,
    baseCost: { [ResourceType.BERRY]: 6 },
    baseVP: 4,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.CASTLE,
    cardDescription: [
      "1 VP for each basic Event you achieved.",
      " 2 VP for each special Event you achieved.",
    ],
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
    cardDescription: ["Copy any Basic or Forest loocation."],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // ask player which location they want to copy
        const possibleLocations = (Object.keys(
          gameState.locationsMap
        ) as unknown) as LocationName[];

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.LOOKOUT,
          locationOptions: possibleLocations.filter((locationName) => {
            const location = Location.fromName(locationName);
            return (
              location.type === LocationType.BASIC ||
              location.type === LocationType.FOREST
            );
          }),
          clientOptions: {
            selectedLocation: null,
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_LOCATION) {
        const selectedLocation = gameInput.clientOptions.selectedLocation;
        if (!selectedLocation) {
          throw new Error("Invalid location selected");
        }
        const location = Location.fromName(selectedLocation);
        if (
          location.type !== LocationType.BASIC &&
          location.type !== LocationType.FOREST
        ) {
          throw new Error(
            `Cannot copy ${selectedLocation}. Only basic and forest locations are allowed.`
          );
        }
        if (!location.canPlay(gameState, gameInput)) {
          throw new Error("location can't be played");
        }

        location.play(gameState, gameInput);
      }
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
    cardDescription: ["Copy 1 ", "production card", " in an opponent's city."],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (
          !selectedCards ||
          selectedCards.length !== 1 ||
          !selectedCards[0].cardName
        ) {
          throw new Error("Invalid input");
        }
        const cardOwner = gameState.getPlayer(selectedCards[0].cardOwnerId);
        const targetCard = Card.fromName(selectedCards[0].cardName);
        if (!cardOwner.hasCardInCity(selectedCards[0].cardName)) {
          throw new Error("Can't find card to copy");
        }
        if (targetCard.cardType !== CardType.PRODUCTION) {
          throw new Error("Can only copy production cards");
        }
        targetCard.gainProduction(gameState, gameInput, cardOwner);
      }
    },
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      // If another player has a miner mole, we can copy any card in the game.
      const canMinerMoleMinerMole = gameState.players
        .filter((x) => x.playerId !== player.playerId)
        .some((x) => x.hasCardInCity(CardName.MINER_MOLE));

      const productionPlayedCards: PlayedCardInfo[] = [];
      gameState.players.forEach((p) => {
        if (p.playerId === player.playerId) {
          if (canMinerMoleMinerMole) {
            productionPlayedCards.push(
              ...p.getAllPlayedCardsByType(CardType.PRODUCTION)
            );
          }
        } else {
          productionPlayedCards.push(
            ...p.getAllPlayedCardsByType(CardType.PRODUCTION)
          );
        }
      });
      const cardOptions = productionPlayedCards.filter((playedCardInfo) => {
        // Filter out useless cards to copy
        if (
          playedCardInfo.cardName === CardName.STOREHOUSE &&
          playedCardInfo.cardOwnerId !== player.playerId
        ) {
          return false;
        }
        return (
          playedCardInfo.cardName !== CardName.MINER_MOLE &&
          playedCardInfo.cardName !== CardName.CHIP_SWEEP
        );
      });
      if (cardOptions.length !== 0) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: gameInput.inputType,
          cardContext: CardName.MINER_MOLE,
          cardOptions,
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [],
          },
        });
      }
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
    cardDescription: [
      "Give 2 ",
      "ANY",
      " to an opponent and gain 4 ",
      "VP",
      ".",
    ],
    maxWorkersInner: (cardOwner: Player) => {
      return cardOwner.hasCardInCity(CardName.MONK) ? 2 : 1;
    },
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
    cardDescription: [
      "You may give up to 2 ",
      ResourceType.BERRY,
      " to an opponent to gain 2 ",
      "VP",
      " each. Unlocks second Monastary.",
    ],
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
    cardDescription: ["VP", " for each Unique Construction in your city"],
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
    cardDescription: [
      "You may pay up to 2 ",
      "ANY",
      " to gain an equal amount of ",
      "ANY",
      ".",
    ],
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
    cardDescription: [
      "Give an opponent 2 ",
      "CARD",
      " , then discard any number of ",
      "CARD",
      " and draw up to your hand limit.",
    ],
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // Need at least 2 cards to visit this card
        const player = gameState.getActivePlayer();
        if (player.cardsInHand.length < 2) {
          return `Need at least 2 cards in hand to visit ${
            CardName.POST_OFFICE
          }\n ${JSON.stringify(player.cardsInHand, null, 2)}`;
        }
      }
      return null;
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
          inputType: GameInputType.SELECT_CARDS,
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
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
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
            inputType: GameInputType.SELECT_CARDS,
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
    cardDescription: [
      "Reveal 2 ",
      "CARD",
      ". You may play 1 worth up to 3 VP for free. ",
      "Discard the other.",
    ],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        if (gameState.pendingGameInputs.length !== 0) {
          throw new Error("Should not have any pending game input");
        }
        const cardOptions = [gameState.drawCard(), gameState.drawCard()];
        const player = gameState.getActivePlayer();
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          cardContext: CardName.POSTAL_PIGEON,
          maxToSelect: 1,
          minToSelect: 0,
          cardOptions: cardOptions.filter((cardName) => {
            const cardOption = Card.fromName(cardName);
            if (cardOption.baseVP > 3) {
              return false;
            }
            return player.canAddToCity(cardName, true /* strict */);
          }),
          cardOptionsUnfiltered: cardOptions,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.prevInputType === GameInputType.PLAY_CARD &&
        gameInput.cardContext === CardName.POSTAL_PIGEON &&
        gameInput.cardOptionsUnfiltered
      ) {
        const player = gameState.getActivePlayer();
        const cardOptionsUnfiltered = [...gameInput.cardOptionsUnfiltered];
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length > 1) {
          throw new Error("Too many cards");
        } else if (selectedCards.length === 1) {
          player.addToCity(selectedCards[0]);
          cardOptionsUnfiltered.splice(
            cardOptionsUnfiltered.indexOf(selectedCards[0]),
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
    cardDescription: ["Play a ", "CARD", " worth up to 3 VP for free"],
    // play a card worth up to 3 base VP for free
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // find all cards worth up to 3 baseVP

        let playableCards: CardName[] = [];

        player.cardsInHand.forEach((cardName) => {
          const card = Card.fromName(cardName as CardName);
          if (card.baseVP <= 3) {
            playableCards.push(card.name);
          }
        });

        gameState.meadowCards.forEach((cardName) => {
          const card = Card.fromName(cardName as CardName);
          if (card.baseVP <= 3) {
            playableCards.push(card.name);
          }
        });

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardOptions: playableCards,
          maxToSelect: 1,
          minToSelect: 1,
          cardContext: CardName.QUEEN,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        const selectedCards = gameInput.clientOptions.selectedCards;

        if (!selectedCards) {
          throw new Error("no card selected");
        }

        if (selectedCards.length !== 1) {
          throw new Error("incorrect number of cards selected");
        }

        const card = Card.fromName(selectedCards[0]);

        if (card.baseVP > 3) {
          throw new Error(
            "cannot use Queen to play a card worth more than 3 base VP"
          );
        }

        player.addToCity(card.name);
        card.play(gameState, gameInput);
      }
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
    cardDescription: [
      "Move 1 of your deployed workers to a new location. ",
      "Unlocks second Dungeon.",
    ],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        const recallableWorkers = player.getRecallableWorkers();
        if (recallableWorkers.length !== 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_WORKER_PLACEMENT,
            prevInputType: gameInput.inputType,
            options: recallableWorkers,
            cardContext: CardName.RANGER,
            mustSelectOne: true,
            clientOptions: {
              selectedOption: null,
            },
          });
        }
      } else if (
        gameInput.inputType === GameInputType.SELECT_WORKER_PLACEMENT
      ) {
        const selectedOption = gameInput.clientOptions.selectedOption;
        if (!selectedOption) {
          throw new Error("Must specify clientOptions.selectedOption");
        }
        if (gameInput.prevInputType === GameInputType.PLAY_CARD) {
          player.recallWorker(gameState, selectedOption);
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_WORKER_PLACEMENT,
            prevInputType: gameInput.inputType,
            options: [
              ...gameState
                .getPlayableLocations()
                .map((location) => ({ location })),

              ...gameState.getClaimableEvents().map((event) => ({ event })),

              ...gameState
                .getVisitableDestinationCards()
                .map((playedCard) => ({ playedCard })),
            ],
            cardContext: CardName.RANGER,
            mustSelectOne: true,
            clientOptions: {
              selectedOption: null,
            },
          });
        } else {
          if (selectedOption.event) {
            gameState.handleWorkerPlacementGameInput({
              inputType: GameInputType.CLAIM_EVENT,
              clientOptions: {
                event: selectedOption.event,
              },
            });
          } else if (selectedOption.location) {
            gameState.handleWorkerPlacementGameInput({
              inputType: GameInputType.PLACE_WORKER,
              clientOptions: {
                location: selectedOption.location,
              },
            });
          } else if (selectedOption.playedCard) {
            gameState.handleWorkerPlacementGameInput({
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: selectedOption.playedCard,
              },
            });
          } else {
            assertUnreachable(
              selectedOption,
              `Unexpected selectedOption ${JSON.stringify(selectedOption)}`
            );
          }
        }
      } else {
        throw new Error(`Invalid input type: ${gameInput}`);
      }
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
    cardDescription: [
      "Discard a Construction from your city. ",
      "Gain resources equal to that Construction's cost and draw 2 ",
      "CARD",
      ".",
    ],
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      // Need to be able to ruin an existing construction.
      const player = gameState.getActivePlayer();
      let hasConstruction = false;
      player.forEachPlayedCard(({ cardName }) => {
        if (!hasConstruction) {
          const card = Card.fromName(cardName);
          hasConstruction = card.isConstruction;
        }
      });
      if (!hasConstruction) {
        return `Require an existing construction to play ${CardName.RUINS}`;
      }
      return null;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        const cardOptions: PlayedCardInfo[] = [];
        player.forEachPlayedCard((playedCardInfo) => {
          const card = Card.fromName(playedCardInfo.cardName);
          if (card.isConstruction) {
            cardOptions.push(playedCardInfo);
          }
        });
        if (cardOptions.length !== 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: gameInput.inputType,
            cardOptions,
            cardContext: CardName.RUINS,
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [],
            },
          });
        }
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (
          !selectedCards ||
          selectedCards.length === 0 ||
          !selectedCards[0].cardName ||
          !player.hasCardInCity(selectedCards[0].cardName)
        ) {
          throw new Error("Invalid input");
        }
        const targetCard = Card.fromName(selectedCards[0].cardName);
        if (!targetCard.isConstruction) {
          throw new Error("Cannot ruins non-construction");
        }
        player.removeCardFromCity(gameState, selectedCards[0]);
        player.gainResources(targetCard.baseCost);
        player.addToCity(CardName.RUINS);
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
    cardDescription: ["VP", " for each Common Critter in your city."],
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
    cardDescription: [
      "Gain 3 ",
      ResourceType.BERRY,
      ", then gain 1 ",
      "VP",
      " for each ",
      "VP",
      " on your Chapel.",
    ],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        if (
          sumResources(gameInput.clientOptions.paymentOptions.resources) > 0
        ) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.PLAY_CARD,
            prevInput: gameInput,
            playerOptions: gameState.players
              .filter((p) => p.playerId !== player.playerId)
              .map((p) => p.playerId),
            mustSelectOne: true,
            cardContext: CardName.SHEPHERD,
            clientOptions: {
              selectedPlayer: null,
            },
          });
        } else {
          player.gainResources({ [ResourceType.BERRY]: 3 });
          const chapelInfo = player.getPlayedCardInfos(CardName.CHAPEL);

          if (chapelInfo.length > 0) {
            const chapel = chapelInfo[0].resources;
            if (!chapel) {
              throw new Error("invalid chapel card info");
            }

            const numVP = chapel[ResourceType.VP] || 0;
            player.gainResources({ [ResourceType.VP]: numVP });
          }
        }
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYER &&
        gameInput.prevInputType === GameInputType.PLAY_CARD &&
        !!gameInput.prevInput &&
        gameInput.prevInput.inputType === GameInputType.PLAY_CARD
      ) {
        const selectedPlayer = gameInput.clientOptions.selectedPlayer;
        if (!selectedPlayer) {
          throw new Error("must select a player");
        }
        const resourcesToGive =
          gameInput.prevInput.clientOptions.paymentOptions.resources;
        gameState.getPlayer(selectedPlayer).gainResources(resourcesToGive);
      } else if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // give the player their berries + VP, don't ask them to select a player

        player.gainResources({ [ResourceType.BERRY]: 3 });
        const chapelInfo = player.getPlayedCardInfos(CardName.CHAPEL);

        if (chapelInfo.length > 0) {
          const chapel = chapelInfo[0].resources;
          if (!chapel) {
            throw new Error("invalid chapel card info");
          }

          const numVP = chapel[ResourceType.VP] || 0;
          player.gainResources({ [ResourceType.VP]: numVP });
        }
      } else {
        ("Unexpected input type ${gameInput.inputType} with previous input type ${gameInput.prevInputType}");
      }
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
    cardDescription: [
      "Gain 1 ",
      ResourceType.BERRY,
      " after you play a Critter.",
    ],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.PLAY_CARD &&
        gameInput.clientOptions.card !== CardName.SHOPKEEPER &&
        gameInput.clientOptions.card &&
        Card.fromName(gameInput.clientOptions.card).isCritter
      ) {
        player.gainResources({
          [ResourceType.BERRY]: 1,
        });
      }
    },
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
    cardDescription: [
      "Place either 3 ",
      ResourceType.TWIG,
      ", 2 ",
      ResourceType.RESIN,
      ", 1 ",
      ResourceType.PEBBLE,
      ", or 2 ",
      ResourceType.BERRY,
      " on this Storehouse from the Supply. Place worker: ",
      "Take all resources on this card.",
    ],
    maxWorkersInner: () => 1,
    playedCardInfoDefault: {
      resources: {
        [ResourceType.TWIG]: 0,
        [ResourceType.RESIN]: 0,
        [ResourceType.PEBBLE]: 0,
        [ResourceType.BERRY]: 0,
      },
    },
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
    cardDescription: [
      "Draw 2 ",
      "CARD",
      ", keep 1, and give ",
      "the other to an opponent.",
    ],
    // draw 2 cards + give 1 to an opponent
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const cardOptions = [gameState.drawCard(), gameState.drawCard()];

      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_CARDS,
        prevInputType: gameInput.inputType,
        cardOptions: cardOptions,
        maxToSelect: 1,
        minToSelect: 1,
        cardContext: CardName.TEACHER,
        clientOptions: {
          selectedCards: [],
        },
      });
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        if (!gameInput.clientOptions.selectedCards) {
          throw new Error("invalid selected cards");
        }
        if (gameInput.clientOptions.selectedCards.length !== 1) {
          throw new Error("incorrect number of cards selected");
        }
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYER,
          prevInputType: gameInput.inputType,
          prevInput: gameInput,
          playerOptions: gameState.players
            .filter((p) => p.playerId !== player.playerId)
            .map((p) => p.playerId),
          mustSelectOne: true,
          cardContext: CardName.TEACHER,
          clientOptions: {
            selectedPlayer: null,
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYER) {
        if (
          !gameInput.prevInput ||
          gameInput.prevInput.inputType !== GameInputType.SELECT_CARDS
        ) {
          throw new Error("Invalid input");
        }
        const selectedPlayer = gameInput.clientOptions.selectedPlayer;
        if (!selectedPlayer) {
          throw new Error("must select a player");
        }
        if (
          !gameState.getPlayer(selectedPlayer) ||
          selectedPlayer === player.playerId
        ) {
          throw new Error("invalid playerId provided");
        }
        const cardName = gameInput.prevInput.clientOptions.selectedCards[0];
        gameState.getPlayer(selectedPlayer).addCardToHand(gameState, cardName);
        const cardOptions = gameInput.prevInput.cardOptions;
        const cardToGive =
          cardOptions[0] === cardName ? cardOptions[1] : cardOptions[0];
        player.addCardToHand(gameState, cardToGive);
      }
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
    cardDescription: ["VP", " for each Unique Critter in your city."],
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
    cardDescription: [
      "Discard 3 ",
      "CARD",
      " from the Meadow, replenish, then ",
      "draw 1 ",
      "CARD",
      " from the Meadow. ",
      "Unlocks second Cemetary.",
    ],
    // Discard 3 meadow, replace, draw 1 meadow
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          cardOptions: gameState.meadowCards,
          maxToSelect: 3,
          minToSelect: 3,
          cardContext: CardName.UNDERTAKER,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.prevInputType === GameInputType.PLAY_CARD
      ) {
        // discard the cards from the meadow + replenish
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length !== 3) {
          throw new Error("must choose exactly 3 cards to remove from meadow");
        }

        selectedCards.forEach((cardName) => {
          gameState.removeCardFromMeadow(cardName);
          gameState.discardPile.addToStack(cardName);
        });

        gameState.replenishMeadow();

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.SELECT_CARDS,
          cardOptions: gameState.meadowCards,
          maxToSelect: 1,
          minToSelect: 1,
          cardContext: CardName.UNDERTAKER,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.prevInputType === GameInputType.SELECT_CARDS
      ) {
        // add this card to player's hand + replenish meadow
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length !== 1) {
          throw new Error("may only choose 1 card from meadow");
        }

        const card = selectedCards[0];
        gameState.removeCardFromMeadow(card);
        gameState.replenishMeadow();

        player.addCardToHand(gameState, card);
      } else {
        throw new Error(
          "Unexpected input type ${gameInput.inputType} with previous input type ${gameInput.prevInputType}"
        );
      }
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
    cardDescription: [
      "Discard a Critter or Construction from your city. ",
      "Gain resources equal to that card's cost, ",
      "then gain 1 ",
      "ANY",
      " and gain 1 ",
      "VP",
      ".",
    ],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // choose a card to destroy
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: gameInput.inputType,
          cardOptions: player
            .getAllPlayedCards()
            .filter(({ cardName }) => cardName !== CardName.UNIVERSITY),
          maxToSelect: 1,
          minToSelect: 1,
          cardContext: CardName.UNIVERSITY,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS) {
        // check that they only chose 1 card
        if (gameInput.clientOptions.selectedCards.length !== 1) {
          throw new Error("may only choose one card to remove from city");
        }

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: gameInput.inputType,
          prevInput: gameInput,
          maxResources: 1,
          minResources: 1,
          cardContext: CardName.UNIVERSITY,
          clientOptions: {
            resources: {},
          },
        });
        // ask player what random resources they want to receive
      } else if (
        gameInput.inputType === GameInputType.SELECT_RESOURCES &&
        gameInput.prevInputType === GameInputType.SELECT_PLAYED_CARDS &&
        !!gameInput.prevInput &&
        gameInput.prevInput.inputType === GameInputType.SELECT_PLAYED_CARDS
      ) {
        const resourceToGain = gameInput.clientOptions.resources;
        if (sumResources(resourceToGain) !== 1) {
          throw new Error("may only gain 1 resource");
        }

        // remove card from city + put in discard pile
        const prevInput = gameInput.prevInput;
        const cardToRemove = prevInput.clientOptions.selectedCards[0];
        player.removeCardFromCity(gameState, cardToRemove, true);

        // give player resources from base cost + the resource they chose
        const removedCard = Card.fromName(cardToRemove.cardName);
        player.gainResources(removedCard.baseCost);
        player.gainResources(resourceToGain);
        player.gainResources({ [ResourceType.VP]: 1 });
      }
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
    cardDescription: ["3 VP if paired with a Husband."],
    pointsInner: (gameState: GameState, playerId: string) => {
      // NOTE: this is implemented in player!
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
    cardDescription: [
      "You may pay up to 3 ",
      ResourceType.TWIG,
      " to gain 1 ",
      "VP",
      " each.",
    ],
    productionInner: gainProductionSpendResourceToGetVPFactory({
      card: CardName.WOODCARVER,
      resourceType: ResourceType.TWIG,
      maxToSpend: 3,
    }),
    playInner: playSpendResourceToGetVPFactory({
      resourceType: ResourceType.TWIG,
      maxToSpend: 3,
    }),
  }),
};
