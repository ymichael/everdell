import {
  ResourceType,
  ProductionResourceMap,
  LocationType,
  LocationName,
  CardCost,
  CardType,
  CardName,
  EventName,
  EventType,
  GameInput,
  GameInputType,
  PlayedCardInfo,
  GameText,
  TextPartEntity,
  IGameTextEntity,
} from "./types";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayCheckFn,
  GameStateCountPointsFn,
} from "./gameState";
import { Location } from "./location";
import { Event } from "./event";
import { Player } from "./player";
import {
  playSpendResourceToGetVPFactory,
  gainProductionSpendResourceToGetVPFactory,
  sumResources,
  getPointsPerRarityLabel,
} from "./gameStatePlayHelpers";
import cloneDeep from "lodash/cloneDeep";
import {
  toGameText,
  cardListToGameText,
  resourceMapToGameText,
  workerPlacementToGameText,
} from "./gameText";
import { assertUnreachable } from "../utils";

type NumWorkersInnerFn = (cardOwner: Player) => number;
type ProductionInnerFn = (
  gameState: GameState,
  gameInput: GameInput,
  cardOwner: Player,
  playedCard: PlayedCardInfo
) => void;

export class Card<TCardType extends CardType = CardType>
  implements GameStatePlayable, IGameTextEntity {
  readonly cardDescription: GameText | undefined;
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
  readonly numWorkersForPlayerInner: NumWorkersInnerFn | undefined;
  readonly maxWorkerSpots: number;

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
    maxWorkerSpots = null,
    numWorkersForPlayerInner,
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
    maxWorkerSpots?: number | null;
    numWorkersForPlayerInner?: NumWorkersInnerFn;
    cardDescription?: GameText | undefined;
  } & (TCardType extends CardType.PRODUCTION
    ? {
        resourcesToGain: ProductionResourceMap;
        productionInner?: ProductionInnerFn | undefined;
      }
    : {
        resourcesToGain?: ProductionResourceMap;
        productionInner?: undefined;
      }) &
    (TCardType extends CardType.PROSPERITY
      ? {
          pointsInner: (gameState: GameState, playerId: string) => number;
        }
      : {
          pointsInner?: (gameState: GameState, playerId: string) => number;
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

    this.maxWorkerSpots =
      maxWorkerSpots == null
        ? cardType === CardType.DESTINATION
          ? 1
          : 0
        : maxWorkerSpots;
    this.numWorkersForPlayerInner = numWorkersForPlayerInner;
  }

  getGameTextPart(): TextPartEntity {
    return {
      type: "entity",
      entityType: "card",
      card: this.name,
    };
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
    if (gameInput.inputType === GameInputType.PLAY_CARD) {
      this.addToCityAndPlay(gameState, gameInput);
    } else if (
      gameInput.inputType === GameInputType.SELECT_CARDS ||
      gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS ||
      gameInput.inputType === GameInputType.SELECT_LOCATION ||
      gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC ||
      gameInput.inputType === GameInputType.SELECT_PAYMENT_FOR_CARD ||
      gameInput.inputType === GameInputType.SELECT_WORKER_PLACEMENT ||
      gameInput.inputType === GameInputType.SELECT_PLAYER ||
      gameInput.inputType === GameInputType.SELECT_RESOURCES ||
      gameInput.inputType === GameInputType.DISCARD_CARDS
    ) {
      if (gameInput.cardContext === this.name) {
        if (this.playInner) {
          this.playInner(gameState, gameInput);
        }
      } else {
        throw new Error(
          "Unexpected cardContext, did you mean to use addToCityAndPlay?"
        );
      }
    } else {
      if (this.playInner) {
        this.playInner(gameState, gameInput);
      }
    }
  }

  gainProduction(
    gameState: GameState,
    gameInput: GameInput,
    cardOwner: Player,
    playedCard: PlayedCardInfo
  ): void {
    const player = gameState.getActivePlayer();
    if (this.resourcesToGain && sumResources(this.resourcesToGain)) {
      player.gainResources(this.resourcesToGain);
      if (this.resourcesToGain.CARD) {
        player.drawCards(gameState, this.resourcesToGain.CARD);
      }
      if (sumResources(this.resourcesToGain) === this.resourcesToGain.CARD) {
        gameState.addGameLogFromCard(this.name, [
          player,
          ` drew ${this.resourcesToGain.CARD} CARD.`,
        ]);
      } else {
        gameState.addGameLogFromCard(this.name, [
          player,
          " gained ",
          ...resourceMapToGameText(this.resourcesToGain),
          ".",
        ]);
      }
    }
    if (this.productionInner) {
      this.productionInner(gameState, gameInput, cardOwner, playedCard);
    }
  }

  addToCityAndPlay(gameState: GameState, gameInput: GameInput): void {
    const player = gameState.getActivePlayer();

    let playedCard: PlayedCardInfo | null = null;
    if (this.name !== CardName.FOOL && this.name !== CardName.RUINS) {
      playedCard = player.addToCity(this.name);
    }

    const playCardGameInput =
      gameInput.inputType === GameInputType.PLAY_CARD
        ? gameInput
        : {
            inputType: GameInputType.PLAY_CARD as const,
            prevInputType: gameInput.inputType,
            clientOptions: {
              card: this.name,
              fromMeadow: false,
              paymentOptions: { resources: {} },
            },
          };

    // Do this first so that logs are ordered properly:
    // 1. play card
    // 2. historian/shopkeeper etc
    // 3+. card related actions..
    [CardName.HISTORIAN, CardName.SHOPKEEPER, CardName.COURTHOUSE].forEach(
      (cardName) => {
        if (player.hasCardInCity(cardName)) {
          const card = Card.fromName(cardName);
          card.playCardInner(
            gameState,
            playCardGameInput,
            player.getFirstPlayedCard(cardName) as PlayedCardInfo
          );
        }
      }
    );

    if (
      this.cardType === CardType.PRODUCTION ||
      this.cardType === CardType.TRAVELER
    ) {
      this.playCardInner(gameState, playCardGameInput, playedCard!);
    }
  }

  playCardInner(
    gameState: GameState,
    gameInput: GameInput,
    playedCard: PlayedCardInfo
  ): void {
    const player = gameState.getActivePlayer();
    this.gainProduction(gameState, gameInput, player, playedCard);
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

  getNumWorkerSpotsForPlayer(cardOwner: Player): number {
    if (this.numWorkersForPlayerInner) {
      return this.numWorkersForPlayerInner(cardOwner);
    }
    return this.maxWorkerSpots;
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
      throw new Error(`Invalid Card name: ${JSON.stringify(name)}`);
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
    cardDescription: toGameText(
      "VP for each of your unused RESIN and PEBBLE, to a maximum of 6."
    ),
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
    cardDescription: toGameText(
      "You may discard up to 5 CARD to gain 1 VP each."
    ),
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
      } else if (
        gameInput.inputType === GameInputType.DISCARD_CARDS &&
        gameInput.cardContext === CardName.BARD
      ) {
        if (gameInput.clientOptions?.cardsToDiscard) {
          if (gameInput.clientOptions.cardsToDiscard.length > 5) {
            throw new Error("Discarding too many cards");
          }
          const numDiscarded = gameInput.clientOptions.cardsToDiscard.length;
          gameInput.clientOptions.cardsToDiscard.forEach((cardName) => {
            player.removeCardFromHand(cardName);
            gameState.discardPile.addToStack(cardName);
          });
          player.gainResources({
            [ResourceType.VP]: numDiscarded,
          });
          gameState.addGameLogFromCard(CardName.BARD, [
            player,
            ` discarded ${numDiscarded} CARD to gain ${numDiscarded} VP.`,
          ]);
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
    cardDescription: toGameText([
      "Gain 2 TWIG for each ",
      { type: "entity", entityType: "card", card: CardName.FARM },
      " in your city.",
    ]),
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
    cardDescription: toGameText([
      "VP for each ",
      { type: "em", text: "Common Construction" },
      " in your city.",
    ]),
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
    cardDescription: toGameText([
      "Reveal 4 CARD from the deck or discard pile and play 1 for free. ",
      "Discard the others.",
      { type: "HR" },
      "Worker stays here permanently. ",
    ]),
    maxWorkerSpots: 2,
    numWorkersForPlayerInner: (cardOwner: Player) => {
      return cardOwner.hasCardInCity(CardName.UNDERTAKER) ? 2 : 1;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      // When you place a worker here, reveal 4 cards from the draw pile or
      // discard pile and play 1 of them for free. Discard the others. Your
      // worker must stay here permanently. Cemetery may only have up to 2
      // workers on it, but the second spot must be unlocked by having a Undertaker
      // in your city.
      const player = gameState.getActivePlayer();
      if (gameInput.inputType == GameInputType.VISIT_DESTINATION_CARD) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: gameInput.inputType,
          label: "Select where to draw cards",
          options: ["Deck", "Discard Pile"],
          cardContext: CardName.CEMETARY,
          clientOptions: {
            selectedOption: null,
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
        gameInput.cardContext === CardName.CEMETARY
      ) {
        const selectedOption = gameInput.clientOptions.selectedOption;
        if (selectedOption !== "Deck" && selectedOption !== "Discard Pile") {
          throw new Error("Must choose either Deck or Discard Pile");
        }
        const revealedCards =
          selectedOption === "Deck"
            ? [
                gameState.drawCard(),
                gameState.drawCard(),
                gameState.drawCard(),
                gameState.drawCard(),
              ]
            : [
                gameState.discardPile.drawInner(),
                gameState.discardPile.drawInner(),
                gameState.discardPile.drawInner(),
                gameState.discardPile.drawInner(),
              ];
        const filteredOptions = revealedCards.filter((cardName) =>
          player.canAddToCity(cardName, true /* strict */)
        );
        gameState.addGameLogFromCard(CardName.CEMETARY, [
          player,
          " revealed ",
          ...cardListToGameText(revealedCards),
          ` from the ${selectedOption} ${
            filteredOptions.length === 0 ? " but is unable to play any" : ""
          }.`,
        ]);
        if (filteredOptions.length !== 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: gameInput.inputType,
            cardOptions: filteredOptions,
            cardOptionsUnfiltered: revealedCards,
            maxToSelect: 1,
            minToSelect: 1,
            cardContext: CardName.CEMETARY,
            clientOptions: {
              selectedCards: [],
            },
          });
        } else {
          revealedCards.forEach((cardName) => {
            gameState.discardPile.addToStack(cardName);
          });
        }
      } else if (
        gameInput.inputType == GameInputType.SELECT_CARDS &&
        gameInput.cardContext === CardName.CEMETARY
      ) {
        const selectedCards = gameInput.clientOptions?.selectedCards;
        if (!selectedCards) {
          throw new Error("Must specify gameInput.clientOptions.selectedCards");
        }
        if (selectedCards.length !== 1) {
          throw new Error("Must select 1 card");
        }
        const selectedCard = selectedCards[0];
        const card = Card.fromName(selectedCard);
        gameState.addGameLogFromCard(CardName.CEMETARY, [
          player,
          " played ",
          card,
          ".",
        ]);
        card.addToCityAndPlay(gameState, gameInput);

        const cardOptionsUnfiltered = [...gameInput.cardOptionsUnfiltered!];
        cardOptionsUnfiltered.splice(
          cardOptionsUnfiltered.indexOf(selectedCard),
          1
        );
        cardOptionsUnfiltered.forEach((cardName) => {
          gameState.discardPile.addToStack(cardName);
        });
      } else {
        throw new Error("Invalid input type");
      }
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
    cardDescription: toGameText([
      "Place 1 VP on this ",
      { type: "entity", entityType: "card", card: CardName.CHAPEL },
      " then draw 2 CARD for each VP on this ",
      { type: "entity", entityType: "card", card: CardName.CHAPEL },
      ".",
    ]),
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
      const chapelInfo = player.getPlayedCardInfos(CardName.CHAPEL);
      if (chapelInfo.length === 0) {
        throw new Error("Invalid action");
      }
      const playedChapel = chapelInfo[0];
      (playedChapel.resources![ResourceType.VP] as number) += 1;
      player.drawCards(
        gameState,
        (playedChapel.resources![ResourceType.VP] as number) * 2
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
    cardDescription: toGameText("Activate 1 PRODUCTION in your city."),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS &&
        gameInput.cardContext === CardName.CHIP_SWEEP
      ) {
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
        targetCard.gainProduction(
          gameState,
          gameInput,
          player,
          selectedCards[0]
        );
        gameState.addGameLogFromCard(CardName.CHIP_SWEEP, [
          player,
          " activated ",
          targetCard,
          ".",
        ]);
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
    cardDescription: toGameText([
      "When played, place 3 VP here. ",
      { type: "HR" },
      "At the beginning of Preparing for Season, you may pay 1 VP from here to activate 1 of the Basic or Forest locations where you have a worker deployed.",
    ]),
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
            label:
              "You may pay 1 VP from here to activate 1 of the following locations",
            options: basicAndForestLocationOptions,
            cardContext: CardName.CLOCK_TOWER,
            mustSelectOne: false,
            clientOptions: {
              selectedOption: null,
            },
          });
        }
      } else if (
        gameInput.inputType === GameInputType.SELECT_WORKER_PLACEMENT &&
        gameInput.cardContext === CardName.CLOCK_TOWER
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
          location.triggerLocation(gameState);
          playedClockTower.resources[ResourceType.VP] =
            (playedClockTower.resources[ResourceType.VP] || 0) - 1;

          gameState.addGameLogFromCard(CardName.CLOCK_TOWER, [
            player,
            " spent 1 VP to activate worker on ",
            location,
            ".",
          ]);
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
    cardDescription: toGameText([
      "Gain 1 TWIG or 1 RESIN or 1 PEBBLE after you play a ",
      { type: "em", text: "Construction" },
      ".",
    ]),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.PLAY_CARD &&
        gameInput.clientOptions.card !== CardName.COURTHOUSE &&
        gameInput.clientOptions.card &&
        Card.fromName(gameInput.clientOptions.card).isConstruction
      ) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          label: "Select TWIG / RESIN / PEBBLE",
          prevInputType: gameInput.inputType,
          cardContext: CardName.COURTHOUSE,
          options: ["TWIG", "RESIN", "PEBBLE"],
          clientOptions: {
            selectedOption: null,
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
        gameInput.cardContext === CardName.COURTHOUSE
      ) {
        const selectedOption = gameInput.clientOptions?.selectedOption;
        if (["TWIG", "RESIN", "PEBBLE"].indexOf(selectedOption as any) === -1) {
          throw new Error("Invalid input");
        }

        player.gainResources({
          [selectedOption as ResourceType]: 1,
        });
        gameState.addGameLogFromCard(CardName.COURTHOUSE, [
          player,
          ` gained ${selectedOption} for playing a Construction.`,
        ]);
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
    cardDescription: toGameText([
      "When playing a ",
      { type: "em", text: "Construction" },
      ", you may discard this ",
      { type: "entity", entityType: "card", card: CardName.CRANE },
      " from your city to play that ",
      { type: "em", text: "Construction" },
      " for 3 fewer ANY.",
    ]),
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
    cardDescription: toGameText("You may pay up to 3 BERRY to gain 1 VP each."),
    productionInner: gainProductionSpendResourceToGetVPFactory({
      card: CardName.DOCTOR,
      resourceType: ResourceType.BERRY,
      maxToSpend: 3,
    }),
    playInner: playSpendResourceToGetVPFactory({
      card: CardName.DOCTOR,
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
    cardDescription: toGameText([
      "When playing a ",
      { type: "em", text: "Construction" },
      " or ",
      { type: "em", text: "Critter" },
      ", you may place a ",
      { type: "em", text: "Critter" },
      " from your city beneath this ",
      { type: "entity", entityType: "card", card: CardName.DUNGEON },
      " to decrease the cost by 3 ANY.",
    ]),
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
    cardDescription: toGameText("VP for each PROSPERITY in your city."),
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
    cardDescription: toGameText("Draw 2 CARD."),
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
    cardDescription: toGameText([
      "Play this ",
      { type: "entity", entityType: "card", card: CardName.FOOL },
      " into an empty space in an opponent's city.",
    ]),
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
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYER &&
        gameInput.cardContext === CardName.FOOL
      ) {
        if (!gameInput.clientOptions.selectedPlayer) {
          throw new Error("invalid input");
        }
        const selectedPlayer = gameState.getPlayer(
          gameInput.clientOptions.selectedPlayer
        );
        selectedPlayer.addToCity(CardName.FOOL);
        gameState.addGameLogFromCard(CardName.FOOL, [
          player,
          " added the ",
          Card.fromName(CardName.FOOL),
          " to ",
          selectedPlayer,
          "'s city.",
        ]);
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
    cardDescription: toGameText([
      "Gain 1 BERRY. If you have a ",
      { type: "entity", entityType: "card", card: CardName.FARM },
      " in your city, gain 1 additional BERRY.",
    ]),
    productionInner: (
      gameState: GameState,
      gameInput: GameInput,
      cardOwner: Player
    ) => {
      const player = gameState.getActivePlayer();
      const numToGain = cardOwner.hasCardInCity(CardName.FARM) ? 2 : 1;
      player.gainResources({
        [ResourceType.BERRY]: numToGain,
      });
      gameState.addGameLogFromCard(CardName.GENERAL_STORE, [
        player,
        ` gained ${numToGain} BERRY.`,
      ]);
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
    cardDescription: toGameText([
      "Draw 1 CARD after you play a ",
      { type: "em", text: "Critter" },
      " or ",
      { type: "em", text: "Construction" },
      ".",
    ]),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.PLAY_CARD &&
        gameInput.clientOptions.card !== CardName.HISTORIAN
      ) {
        player.drawCards(gameState, 1);
        gameState.addGameLogFromCard(CardName.HISTORIAN, [
          player,
          ` drew 1 CARD.`,
        ]);
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
    cardDescription: toGameText([
      "Gain 1 ANY if paired with a ",
      { type: "entity", entityType: "card", card: CardName.WIFE },
      " and you have at least 1 ",
      { type: "entity", entityType: "card", card: CardName.FARM },
      " in your city.",
    ]),
    resourcesToGain: {},
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.SELECT_RESOURCES &&
        gameInput.cardContext === CardName.HUSBAND
      ) {
        const resources = gameInput.clientOptions?.resources;
        if (!resources || (resources as any)[ResourceType.VP]) {
          throw new Error("Invalid input");
        }
        const numToGain = sumResources(resources);
        if (numToGain !== 1) {
          throw new Error(`Invalid resources: ${JSON.stringify(resources)}`);
        }
        player.gainResources(resources);
        gameState.addGameLogFromCard(CardName.HUSBAND, [
          player,
          " gained ",
          ...resourceMapToGameText(resources),
          ".",
        ]);
      }
    },
    productionInner: (
      gameState: GameState,
      gameInput: GameInput,
      cardOwner: Player
    ) => {
      const playedHusbands = cardOwner.getPlayedCardInfos(CardName.HUSBAND);
      const playedWifes = cardOwner.getPlayedCardInfos(CardName.WIFE);
      if (
        cardOwner.hasCardInCity(CardName.FARM) &&
        playedHusbands.length <= playedWifes.length
      ) {
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
    cardDescription: toGameText([
      "Play a ",
      { type: "em", text: "Critter" },
      " or ",
      { type: "em", text: "Construction" },
      " from the Meadow for 3 fewer ANY.",
      { type: "HR" },
      "Other players may visit this card.",
    ]),
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        const resources = player.getResources();
        const canPlayMeadowCard = gameState.meadowCards.some((cardName) => {
          const card = Card.fromName(cardName);
          return (
            player.canAddToCity(cardName, true /* strict */) &&
            player.isPaidResourcesValid(
              resources,
              card.baseCost,
              "ANY 3",
              false
            )
          );
        });
        if (!canPlayMeadowCard) {
          return `Cannot play any cards from the Meadow`;
        }
      }
      return null;
    },
    // Play meadow card for 3 less resources
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // add pending input to select 1 card from the list of meadow cards
        const resources = player.getResources();
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          cardOptions: gameState.meadowCards.filter((cardName) => {
            const card = Card.fromName(cardName);
            return (
              player.canAddToCity(cardName, true /* strict */) &&
              player.isPaidResourcesValid(
                resources,
                card.baseCost,
                "ANY 3",
                false
              )
            );
          }),
          maxToSelect: 1,
          minToSelect: 1,
          cardContext: CardName.INN,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.cardContext === CardName.INN
      ) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (!selectedCards) {
          throw new Error("Must select card to play.");
        }
        if (selectedCards.length !== 1) {
          throw new Error("Can only play 1 card.");
        }
        const selectedCardName = selectedCards[0];
        if (gameState.meadowCards.indexOf(selectedCardName) < 0) {
          throw new Error("Cannot find selected card in the Meadow.");
        }
        const selectedCard = Card.fromName(selectedCardName);
        if (!player.canAddToCity(selectedCardName, true /* strict */)) {
          throw new Error(`Unable to add ${selectedCardName} to city`);
        }

        gameState.addGameLogFromCard(CardName.INN, [
          player,
          " selected ",
          selectedCard,
          " to play from the Meadow.",
        ]);

        if (sumResources(selectedCard.baseCost) <= 3) {
          selectedCard.addToCityAndPlay(gameState, gameInput);
          gameState.addGameLogFromCard(CardName.INN, [
            player,
            " played ",
            selectedCard,
            " from the Meadow.",
          ]);
        } else {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_PAYMENT_FOR_CARD,
            prevInputType: gameInput.inputType,
            cardContext: CardName.INN,
            card: selectedCardName,
            clientOptions: {
              card: selectedCardName,
              paymentOptions: { resources: {} },
            },
          });
        }
      } else if (
        gameInput.inputType === GameInputType.SELECT_PAYMENT_FOR_CARD &&
        gameInput.cardContext === CardName.INN
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
          "ANY 3"
        );
        if (paymentError) {
          throw new Error(paymentError);
        }
        player.payForCard(gameState, gameInput);
        card.addToCityAndPlay(gameState, gameInput);
        gameState.addGameLogFromCard(CardName.INN, [
          player,
          " played ",
          card,
          " from the Meadow.",
        ]);
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
    cardDescription: toGameText([
      "When playing a ",
      { type: "em", text: "Critter" },
      ", you may discard this ",
      { type: "entity", entityType: "card", card: CardName.INNKEEPER },
      " from your city to decrease the cost by 3 BERRY.",
    ]),
  }),
  [CardName.JUDGE]: new Card({
    name: CardName.JUDGE,
    cardType: CardType.GOVERNANCE,
    baseCost: { [ResourceType.BERRY]: 3 },
    baseVP: 2,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.COURTHOUSE,
    cardDescription: toGameText([
      "When you play a ",
      { type: "em", text: "Critter" },
      " or ",
      { type: "em", text: "Construction" },
      ", you may replace 1 ANY with 1 ANY.",
    ]),
  }),
  [CardName.KING]: new Card({
    name: CardName.KING,
    cardType: CardType.PROSPERITY,
    baseCost: { [ResourceType.BERRY]: 6 },
    baseVP: 4,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.CASTLE,
    cardDescription: toGameText([
      "1 VP for each basic event you achieved.",
      { type: "BR" },
      "2 VP for each special event you achieved.",
    ]),
    pointsInner: (gameState: GameState, playerId: string) => {
      let numPoints = 0;
      const player = gameState.getPlayer(playerId);
      Object.keys(player.claimedEvents).forEach((eventName) => {
        const event = Event.fromName(eventName as EventName);
        if (event.type === EventType.BASIC) {
          numPoints += 1;
        } else if (event.type === EventType.SPECIAL) {
          numPoints += 2;
        }
      });
      return numPoints;
    },
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
    cardDescription: [
      {
        type: "text",
        text: "Copy any Basic or Forest location.",
      },
    ],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // Ask player which location they want to copy
        const possibleLocations = gameState
          .getPlayableLocations({ checkCanPlaceWorker: false })
          .map((locationName) => {
            return Location.fromName(locationName);
          })
          .filter((location) => {
            return (
              location.type === LocationType.BASIC ||
              location.type === LocationType.FOREST
            );
          });

        if (possibleLocations.length === 0) {
          // This should never happen because there are unlimited basic locations.
          throw new Error("No location available to copy.");
        }

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_LOCATION,
          prevInputType: gameInput.inputType,
          cardContext: CardName.LOOKOUT,
          locationOptions: possibleLocations.map((x) => x.name),
          clientOptions: {
            selectedLocation: null,
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_LOCATION &&
        gameInput.cardContext === CardName.LOOKOUT
      ) {
        const selectedLocation = gameInput.clientOptions.selectedLocation;
        if (
          !selectedLocation ||
          gameInput.locationOptions.indexOf(selectedLocation) === -1
        ) {
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
          throw new Error("Location can't be played");
        }
        location.triggerLocation(gameState);
        gameState.addGameLogFromCard(CardName.LOOKOUT, [
          player,
          " copied ",
          location,
          ".",
        ]);
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
    cardDescription: toGameText("Copy 1 PRODUCTION in an opponent's city"),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS &&
        gameInput.cardContext === CardName.MINER_MOLE
      ) {
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
        targetCard.gainProduction(
          gameState,
          gameInput,
          cardOwner,
          selectedCards[0]
        );
        gameState.addGameLogFromCard(CardName.MINER_MOLE, [
          player,
          " activated ",
          targetCard,
          " from ",
          cardOwner,
          "'s city.",
        ]);
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
    cardDescription: toGameText([
      "Give 2 ANY to an opponent and gain 4 VP.",
      { type: "HR" },
      "Worker stays here permanently.",
    ]),
    maxWorkerSpots: 2,
    numWorkersForPlayerInner: (cardOwner: Player) => {
      return cardOwner.hasCardInCity(CardName.MONK) ? 2 : 1;
    },
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        const numResources =
          player.getNumResourcesByType(ResourceType.BERRY) +
          player.getNumResourcesByType(ResourceType.TWIG) +
          player.getNumResourcesByType(ResourceType.PEBBLE) +
          player.getNumResourcesByType(ResourceType.RESIN);
        if (numResources < 2) {
          return "Need at least 2 resources to visit the Monastery";
        }
      }
      return null;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: gameInput.inputType,
          cardContext: CardName.MONASTERY,
          maxResources: 2,
          minResources: 2,
          clientOptions: {
            resources: {},
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_RESOURCES &&
        gameInput.cardContext === CardName.MONASTERY
      ) {
        if (sumResources(gameInput.clientOptions.resources) !== 2) {
          throw new Error(
            `Must choose 2 resources, got: ${JSON.stringify(
              gameInput.clientOptions.resources
            )}`
          );
        }
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYER,
          prevInputType: gameInput.inputType,
          prevInput: gameInput,
          cardContext: CardName.MONASTERY,
          playerOptions: gameState.players
            .filter((p) => p.playerId !== player.playerId)
            .map((p) => p.playerId),
          mustSelectOne: true,
          clientOptions: {
            selectedPlayer: null,
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYER &&
        gameInput.cardContext === CardName.MONASTERY
      ) {
        const selectedPlayer = gameInput.clientOptions.selectedPlayer;
        if (!selectedPlayer) {
          throw new Error(
            "Must specify gameInput.clientOptions.selectedPlayer"
          );
        }
        if (selectedPlayer == player.playerId) {
          throw new Error("Cannot select yourself");
        }
        const prevInput = gameInput.prevInput;
        if (prevInput?.inputType !== GameInputType.SELECT_RESOURCES) {
          throw new Error("Unexpected game input");
        }
        const targetPlayer = gameState.getPlayer(selectedPlayer);
        const resources = prevInput.clientOptions.resources;
        player.spendResources(resources);
        targetPlayer.gainResources(resources);
        player.gainResources({
          [ResourceType.VP]: 4,
        });
        gameState.addGameLogFromCard(CardName.MONASTERY, [
          player,
          " gave ",
          ...resourceMapToGameText(resources),
          " to ",
          targetPlayer,
          " to gain 4 VP.",
        ]);
      } else {
        throw new Error("Invalid input type");
      }
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
    cardDescription: toGameText([
      "You may give up to 2 BERRY to an opponent to gain 2 VP each.",
      { type: "HR" },
      "Unlocks second ",
      { type: "entity", entityType: "card", card: CardName.MONASTERY },
      ".",
    ]),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.SELECT_RESOURCES &&
        gameInput.cardContext === CardName.MONK
      ) {
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
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYER &&
        gameInput.cardContext === CardName.MONK
      ) {
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
        if (numBerries === 0) {
          gameState.addGameLogFromCard(CardName.MONK, [
            player,
            " decline to give any BERRY.",
          ]);
        } else {
          gameState.addGameLogFromCard(CardName.MONK, [
            player,
            ` gave ${numBerries} BERRY to `,
            targetPlayer,
            ` to gain ${numBerries * 2} VP.`,
          ]);
        }
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
    cardDescription: toGameText([
      "VP for each ",
      { type: "em", text: "Unique Construction" },
      " in your city",
    ]),
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
    cardDescription: toGameText(
      "You may pay up to 2 ANY to gain an equal amount of ANY."
    ),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.SELECT_RESOURCES &&
        gameInput.cardContext === CardName.PEDDLER
      ) {
        if (gameInput.prevInputType !== GameInputType.SELECT_RESOURCES) {
          const numResources = sumResources(gameInput.clientOptions.resources);
          if (numResources < gameInput.minResources) {
            throw new Error("Too few resources");
          } else if (numResources > gameInput.maxResources) {
            throw new Error("Too many resources");
          }
          if (numResources !== 0) {
            gameState.pendingGameInputs.push({
              inputType: GameInputType.SELECT_RESOURCES,
              label: `Choose ${numResources} ANY to gain`,
              prevInputType: gameInput.inputType,
              cardContext: CardName.PEDDLER,
              maxResources: numResources,
              minResources: numResources,
              clientOptions: {
                resources: {},
              },
            });
            player.spendResources(gameInput.clientOptions.resources);
            gameState.addGameLogFromCard(CardName.PEDDLER, [
              player,
              " paid ",
              ...resourceMapToGameText(gameInput.clientOptions.resources),
              ".",
            ]);
          }
        } else {
          const numResources = sumResources(gameInput.clientOptions.resources);
          if (numResources < gameInput.minResources) {
            throw new Error("Too few resources");
          } else if (numResources > gameInput.maxResources) {
            throw new Error("Too many resources");
          }
          player.gainResources(gameInput.clientOptions.resources);
          gameState.addGameLogFromCard(CardName.PEDDLER, [
            player,
            " gained ",
            ...resourceMapToGameText(gameInput.clientOptions.resources),
            ".",
          ]);
        }
      }
    },
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (player.getNumResources() !== 0) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          label: `Pay up to 2 ANY to gain an equal amount of ANY`,
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
    cardDescription: toGameText([
      "Give an opponent 2 CARD, then discard any number of CARD ",
      "and draw up to your hand limit.",
      { type: "HR" },
      "Other players may visit this card.",
    ]),
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
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYER &&
        gameInput.cardContext === CardName.POST_OFFICE
      ) {
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
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.cardContext === CardName.POST_OFFICE
      ) {
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
          gameState.addGameLogFromCard(CardName.POST_OFFICE, [
            player,
            " gave ",
            selectedPlayer,
            " 2 CARD.",
          ]);
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
          const numDiscarded = gameInput.clientOptions.selectedCards.length;
          const numDrawn = player.drawMaxCards(gameState);
          gameState.addGameLogFromCard(CardName.POST_OFFICE, [
            player,
            ` discarded ${numDiscarded} CARD and drew ${numDrawn} CARD.`,
          ]);
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
    cardDescription: toGameText([
      "Reveal 2 CARD. ",
      "You may play 1 worth up to 3 VP for free. ",
      "Discard the other.",
    ]),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        const cardOptions = [gameState.drawCard(), gameState.drawCard()];
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
        gameState.addGameLogFromCard(CardName.POSTAL_PIGEON, [
          player,
          " revealed ",
          ...cardListToGameText(cardOptions),
          ".",
        ]);
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
          const selectedCard = selectedCards[0];
          const card = Card.fromName(selectedCard);
          gameState.addGameLogFromCard(CardName.POSTAL_PIGEON, [
            player,
            " chose to play ",
            card,
            ".",
          ]);
          card.addToCityAndPlay(gameState, gameInput);
          cardOptionsUnfiltered.splice(
            cardOptionsUnfiltered.indexOf(selectedCard),
            1
          );
        } else {
          gameState.addGameLogFromCard(CardName.POSTAL_PIGEON, [
            player,
            " chose to play none of the cards.",
          ]);
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
    cardDescription: toGameText("Play a CARD worth up to 3 VP for free."),
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        const hasPlayableCard = [
          ...gameState.meadowCards,
          ...player.cardsInHand,
        ].some((cardName) => {
          const card = Card.fromName(cardName);
          return card.baseVP <= 3;
        });
        if (!hasPlayableCard) {
          return "No playable cards worth less than 3 VP";
        }
      }
      return null;
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // find all cards worth up to 3 baseVP

        const playableCards: CardName[] = [];

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
          prevInputType: gameInput.inputType,
          cardOptions: playableCards,
          maxToSelect: 1,
          minToSelect: 1,
          cardContext: CardName.QUEEN,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.cardContext === CardName.QUEEN
      ) {
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
        gameState.addGameLogFromCard(CardName.QUEEN, [
          player,
          " played ",
          card,
          ".",
        ]);
        card.addToCityAndPlay(gameState, gameInput);
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
    cardDescription: toGameText([
      "Move 1 of your deployed workers to a new location.",
      { type: "HR" },
      "Unlocks second ",
      { type: "entity", entityType: "card", card: CardName.DUNGEON },
      ".",
    ]),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        const recallableWorkers = player.getRecallableWorkers();
        if (recallableWorkers.length !== 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_WORKER_PLACEMENT,
            label: "Select a deployed worker to move",
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
        gameInput.inputType === GameInputType.SELECT_WORKER_PLACEMENT &&
        gameInput.cardContext === CardName.RANGER
      ) {
        const selectedOption = gameInput.clientOptions.selectedOption;
        if (!selectedOption) {
          throw new Error("Must specify clientOptions.selectedOption");
        }
        if (gameInput.prevInputType === GameInputType.PLAY_CARD) {
          player.recallWorker(gameState, selectedOption, {
            removeFromGameState: false,
          });
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_WORKER_PLACEMENT,
            label: "Place your worker",
            prevInput: gameInput,
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
          const recalledWorkerInfo =
            gameInput.prevInput &&
            gameInput.prevInput.inputType ===
              GameInputType.SELECT_WORKER_PLACEMENT &&
            gameInput.prevInput?.clientOptions?.selectedOption;
          if (!recalledWorkerInfo) {
            throw new Error("Invalid input");
          }
          player.recallWorker(gameState, recalledWorkerInfo, {
            removeFromPlacedWorkers: false,
          });
          gameState.addGameLogFromCard(CardName.RANGER, [
            player,
            " moved deployed worker on ",
            ...workerPlacementToGameText(recalledWorkerInfo),
            " to ",
            ...workerPlacementToGameText(selectedOption),
            ".",
          ]);

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
    cardDescription: toGameText([
      "Discard a ",
      { type: "em", text: "Construction" },
      " from your city. Gain resources equal to that ",
      { type: "em", text: "Construction's" },
      " cost and draw 2 CARD.",
    ]),
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
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS &&
        gameInput.cardContext === CardName.RUINS
      ) {
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
        gameState.addGameLogFromCard(CardName.RUINS, [
          player,
          " ruined ",
          targetCard,
          " and drew 2 CARD.",
        ]);
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
    cardDescription: toGameText([
      "VP for each ",
      { type: "em", text: "Common Critter" },
      " in your city.",
    ]),
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
    cardDescription: toGameText([
      "Gain 3 BERRY, then gain 1 VP for each VP on your ",
      { type: "entity", entityType: "card", card: CardName.CHAPEL },
      ".",
    ]),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        if (
          sumResources(gameInput.clientOptions.paymentOptions.resources) > 0
        ) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: gameInput.inputType,
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
            gameState.addGameLogFromCard(CardName.SHEPHERD, [
              player,
              ` gained 3 BERRY and ${numVP} VP.`,
            ]);
          } else {
            gameState.addGameLogFromCard(CardName.SHEPHERD, [
              player,
              ` gained 3 BERRY.`,
            ]);
          }
        }
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYER &&
        gameInput.prevInputType === GameInputType.PLAY_CARD &&
        gameInput.cardContext === CardName.SHEPHERD &&
        !!gameInput.prevInput &&
        gameInput.prevInput.inputType === GameInputType.PLAY_CARD
      ) {
        const selectedPlayer = gameInput.clientOptions.selectedPlayer;
        if (!selectedPlayer) {
          throw new Error("Must select a player");
        }
        const resourcesToGive =
          gameInput.prevInput.clientOptions.paymentOptions.resources;
        const targetPlayer = gameState.getPlayer(selectedPlayer);
        if (targetPlayer.playerId === player.playerId) {
          throw new Error("Cannot select yourself");
        }
        targetPlayer.gainResources(resourcesToGive);
        gameState.addGameLogFromCard(CardName.SHEPHERD, [
          player,
          " gave ",
          targetPlayer,
          ...resourceMapToGameText(resourcesToGive),
          ".",
        ]);
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
          gameState.addGameLogFromCard(CardName.SHEPHERD, [
            player,
            ` gained 3 BERRY and ${numVP} VP.`,
          ]);
        } else {
          gameState.addGameLogFromCard(CardName.SHEPHERD, [
            player,
            ` gained 3 BERRY.`,
          ]);
        }
      } else {
        throw new Error(
          "Unexpected input type ${gameInput.inputType} with previous input type ${gameInput.prevInputType}"
        );
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
    cardDescription: toGameText([
      "Gain 1 BERRY after you play a ",
      { type: "em", text: "Critter" },
      ".",
    ]),
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
        gameState.addGameLogFromCard(CardName.SHOPKEEPER, [
          player,
          " gained 1 BERRY for playing a Critter.",
        ]);
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
    cardDescription: toGameText([
      "Place either 3 TWIG, 2 RESIN, 1 PEBBLE or 2 BERRY on this ",
      { type: "entity", entityType: "card", card: CardName.STOREHOUSE },
      " from the Supply.",
      { type: "HR" },
      "Place worker: Take all resources on this card.",
    ]),
    maxWorkerSpots: 1,
    numWorkersForPlayerInner: () => 1,
    playedCardInfoDefault: {
      workers: [],
      resources: {
        [ResourceType.TWIG]: 0,
        [ResourceType.RESIN]: 0,
        [ResourceType.PEBBLE]: 0,
        [ResourceType.BERRY]: 0,
      },
    },
    productionInner: (
      gameState: GameState,
      gameInput: GameInput,
      cardOwner: Player,
      playedCard: PlayedCardInfo
    ) => {
      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_OPTION_GENERIC,
        prevInputType: gameInput.inputType,
        cardContext: CardName.STOREHOUSE,
        playedCardContext: playedCard,
        label: "Choose resource(s) to add",
        options: ["3 TWIG", "2 RESIN", "1 PEBBLE", "2 BERRY"],
        clientOptions: {
          selectedOption: null,
        },
      });
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
        gameInput.cardContext === CardName.STOREHOUSE
      ) {
        const playedCard = gameInput.playedCardContext;
        if (!playedCard) {
          throw new Error("Missing played card context.");
        }
        const origPlayedCard = player.findPlayedCard(playedCard);
        if (!origPlayedCard) {
          throw new Error("Cannot find played card");
        }
        const selectedOption = gameInput.clientOptions.selectedOption;
        if (selectedOption === "3 TWIG") {
          origPlayedCard.resources![ResourceType.TWIG]! += 3;
          gameState.addGameLogFromCard(CardName.STOREHOUSE, [
            player,
            " added 3 TWIG.",
          ]);
        } else if (selectedOption === "2 RESIN") {
          origPlayedCard.resources![ResourceType.RESIN]! += 2;
          gameState.addGameLogFromCard(CardName.STOREHOUSE, [
            player,
            " added 2 RESIN.",
          ]);
        } else if (selectedOption === "1 PEBBLE") {
          origPlayedCard.resources![ResourceType.PEBBLE]! += 1;
          gameState.addGameLogFromCard(CardName.STOREHOUSE, [
            player,
            " added 1 PEBBLE.",
          ]);
        } else if (selectedOption === "2 BERRY") {
          origPlayedCard.resources![ResourceType.BERRY]! += 2;
          gameState.addGameLogFromCard(CardName.STOREHOUSE, [
            player,
            " added 2 BERRY.",
          ]);
        } else {
          throw new Error("Must select an option!");
        }
      } else if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        const playedCard = gameInput.clientOptions.playedCard;
        if (!playedCard) {
          throw new Error("Invalid input");
        }
        const origPlayedCard = player.findPlayedCard(playedCard);
        if (!origPlayedCard) {
          throw new Error("Cannot find played card");
        }
        gameState.addGameLogFromCard(CardName.STOREHOUSE, [
          player,
          " gained ",
          ...resourceMapToGameText(origPlayedCard.resources!),
          ".",
        ]);
        player.gainResources(origPlayedCard.resources!);
        origPlayedCard.resources = {
          [ResourceType.TWIG]: 0,
          [ResourceType.RESIN]: 0,
          [ResourceType.PEBBLE]: 0,
          [ResourceType.BERRY]: 0,
        };
      }
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
    cardDescription: toGameText(
      "Draw 2 CARD, keep 1, and give the other to an opponent."
    ),
    // draw 2 cards + give 1 to an opponent
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      const cardOptions = [gameState.drawCard(), gameState.drawCard()];
      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_CARDS,
        label: "Choose one CARD to keep",
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
      if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.cardContext === CardName.TEACHER
      ) {
        if (!gameInput.clientOptions.selectedCards) {
          throw new Error("Invalid selected cards");
        }
        if (gameInput.clientOptions.selectedCards.length !== 1) {
          throw new Error("Incorrect number of cards selected");
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
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYER &&
        gameInput.cardContext === CardName.TEACHER
      ) {
        if (
          !gameInput.prevInput ||
          gameInput.prevInput.inputType !== GameInputType.SELECT_CARDS
        ) {
          throw new Error("Invalid input");
        }
        const selectedPlayerId = gameInput.clientOptions.selectedPlayer;
        if (!selectedPlayerId) {
          throw new Error("Must select a player");
        }
        const selectedPlayer = gameState.getPlayer(selectedPlayerId);
        if (!selectedPlayer || selectedPlayer.playerId === player.playerId) {
          throw new Error("Must select a different player");
        }

        // based on wording of the Teacher card, the selected card is the card
        // that the active player keeps
        const cardToKeep = gameInput.prevInput.clientOptions.selectedCards[0];
        player.addCardToHand(gameState, cardToKeep);

        const cardOptions = gameInput.prevInput.cardOptions;
        const cardToGive =
          cardOptions[0] === cardToKeep ? cardOptions[1] : cardOptions[0];
        selectedPlayer.addCardToHand(gameState, cardToGive);

        gameState.addGameLogFromCard(CardName.TEACHER, [
          player,
          " drew 2 CARD and gave 1 to ",
          selectedPlayer,
          ".",
        ]);
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
    cardDescription: toGameText([
      "VP for each ",
      { type: "em", text: "Unique Critter" },
      " in your city.",
    ]),
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
    cardDescription: toGameText([
      "Discard 3 CARD from the Meadow, replenish, then draw 1 CARD from the Meadow.",
      { type: "HR" },
      "Unlocks second Cemetary.",
    ]),
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
        gameInput.prevInputType === GameInputType.PLAY_CARD &&
        gameInput.cardContext === CardName.UNDERTAKER
      ) {
        // Discard the cards from the meadow + replenish
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length !== 3) {
          throw new Error(
            "Must choose exactly 3 cards to remove from the Meadow."
          );
        }

        gameState.addGameLogFromCard(CardName.UNDERTAKER, [
          player,
          " discarded ",
          ...cardListToGameText(selectedCards),
          " from the Meadow.",
        ]);

        selectedCards.forEach((cardName) => {
          gameState.removeCardFromMeadow(cardName);
          gameState.discardPile.addToStack(cardName);
        });

        gameState.replenishMeadow();

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
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
        gameInput.prevInputType === GameInputType.SELECT_CARDS &&
        gameInput.cardContext === CardName.UNDERTAKER
      ) {
        // add this card to player's hand + replenish meadow
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length !== 1) {
          throw new Error("May only choose 1 card from the Meadow");
        }

        const card = selectedCards[0];
        gameState.removeCardFromMeadow(card);
        gameState.replenishMeadow();
        player.addCardToHand(gameState, card);

        gameState.addGameLogFromCard(CardName.UNDERTAKER, [
          player,
          " selected ",
          ...cardListToGameText([card]),
          " from the Meadow.",
        ]);
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
    cardDescription: toGameText([
      "Discard a ",
      { type: "em", text: "Critter" },
      " or ",
      { type: "em", text: "Construction" },
      " from your city. Gain resources equal to that card's cost, ",
      "then gain 1 ANY and gain 1 VP.",
    ]),
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        if (player.getNumCardsInCity() === 1) {
          return `No cards to discard from your city`;
        }
      }
      return null;
    },
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
      } else if (
        gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS &&
        gameInput.cardContext === CardName.UNIVERSITY
      ) {
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
        gameInput.cardContext === CardName.UNIVERSITY &&
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

        gameState.addGameLogFromCard(CardName.UNIVERSITY, [
          player,
          " discarded ",
          removedCard,
          " from their city and gained ",
          ...resourceMapToGameText(resourceToGain),
          " and 1 VP.",
        ]);
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
    cardDescription: toGameText("Draw 3 CARD."),
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
    cardDescription: toGameText([
      "3 VP if paired with a ",
      { type: "entity", entityType: "card", card: CardName.HUSBAND },
    ]),
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
    cardDescription: toGameText("You may pay up to 3 TWIG to gain 1 VP each"),
    productionInner: gainProductionSpendResourceToGetVPFactory({
      card: CardName.WOODCARVER,
      resourceType: ResourceType.TWIG,
      maxToSpend: 3,
    }),
    playInner: playSpendResourceToGetVPFactory({
      card: CardName.WOODCARVER,
      resourceType: ResourceType.TWIG,
      maxToSpend: 3,
    }),
  }),
};
