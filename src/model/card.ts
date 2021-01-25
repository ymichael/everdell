import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";
import omit from "lodash/omit";

import {
  ExpansionType,
  ResourceType,
  ProductionResourceMap,
  LocationType,
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
  sumResources,
  GainAnyResource,
  GainMoreThan1AnyResource,
} from "./gameStatePlayHelpers";
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
type ProductionWillActivateInnerFn = (
  gameState: GameState,
  cardOwner: Player,
  playedCard: PlayedCardInfo
) => boolean;

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
  readonly numInDeck: number;
  readonly cardType: TCardType;
  readonly isUnique: boolean;
  readonly isCritter: boolean;
  readonly expansion: ExpansionType | null;
  readonly isConstruction: boolean;
  readonly associatedCard: CardName | null;
  readonly isOpenDestination: boolean;

  readonly productionInner: ProductionInnerFn | undefined;
  readonly productionWillActivateInner:
    | ProductionWillActivateInnerFn
    | undefined;
  readonly resourcesToGain: ProductionResourceMap | undefined;
  readonly numWorkersForPlayerInner: NumWorkersInnerFn | undefined;
  readonly maxWorkerSpots: number;

  constructor({
    name,
    baseCost,
    baseVP,
    cardType,
    numInDeck,
    isUnique,
    isConstruction,
    associatedCard,
    resourcesToGain,
    productionInner,
    productionWillActivateInner,
    cardDescription,
    expansion = null,
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
    numInDeck: number;
    isConstruction: boolean;
    associatedCard: CardName | null;
    isOpenDestination?: boolean;
    expansion?: ExpansionType | null;
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
        productionWillActivateInner?: ProductionWillActivateInnerFn | undefined;
      }
    : {
        resourcesToGain?: ProductionResourceMap;
        productionInner?: undefined;
        productionWillActivateInner?: undefined;
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
    this.numInDeck = numInDeck;
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
    this.expansion = expansion;

    // Production cards
    this.productionInner = productionInner;
    this.productionWillActivateInner = productionWillActivateInner;
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

  canPlayIgnoreCostAndSource(gameState: GameState): boolean {
    const player = gameState.getActivePlayer();
    if (this.name !== CardName.FOOL) {
      if (!player.canAddToCity(this.name, true /* strict */)) {
        return false;
      }
    }
    if (this.canPlayCheckInner) {
      const errorMsg = this.canPlayCheckInner(
        gameState,
        this.getPlayCardInput()
      );
      if (errorMsg) {
        return false;
      }
    }
    return true;
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

  addToCityAndPlay(gameState: GameState, gameInput: GameInput): void {
    const player = gameState.getActivePlayer();

    let playedCard: PlayedCardInfo | undefined = undefined;
    if (this.name !== CardName.FOOL && this.name !== CardName.RUINS) {
      playedCard = player.addToCity(this.name);
    }

    const playCardGameInput = this.getPlayCardInput(gameInput, playedCard);

    // Do this first so that logs are ordered properly:
    // 1. play card
    // 2. historian/shopkeeper etc
    // 3+. card related actions..
    [CardName.HISTORIAN, CardName.SHOPKEEPER, CardName.COURTHOUSE].forEach(
      (cardName) => {
        if (player.hasCardInCity(cardName)) {
          const card = Card.fromName(cardName);
          card.activateCard(
            gameState,
            playCardGameInput,
            player,
            player.getFirstPlayedCard(cardName) as PlayedCardInfo
          );
        }
      }
    );

    if (
      this.cardType === CardType.PRODUCTION ||
      this.cardType === CardType.TRAVELER
    ) {
      this.activateCard(gameState, playCardGameInput, player, playedCard!);
    }
  }

  canReactivateCard(gameState: GameState): boolean {
    if (
      !(
        this.cardType === CardType.PRODUCTION ||
        this.cardType === CardType.TRAVELER
      )
    ) {
      return false;
    }
    if (this.canPlayCheckInner) {
      const errorMsg = this.canPlayCheckInner(
        gameState,
        this.getPlayCardInput()
      );
      if (errorMsg) {
        return false;
      }
    }
    return true;
  }

  reactivateCard(
    gameState: GameState,
    gameInput: GameInput,
    cardOwner: Player,
    playedCard: PlayedCardInfo
  ): void {
    if (
      this.cardType === CardType.PRODUCTION ||
      this.cardType === CardType.TRAVELER
    ) {
      this.activateCard(gameState, gameInput, cardOwner, playedCard);
    }
  }

  private getPlayCardInput(
    gameInput: GameInput | null = null,
    playedCard: PlayedCardInfo | undefined = undefined
  ): GameInput {
    let playCardGameInput: GameInput;
    if (gameInput && gameInput.inputType === GameInputType.PLAY_CARD) {
      if (playedCard) {
        gameInput.playedCardContext = playedCard;
      }
      playCardGameInput = gameInput;
    } else {
      playCardGameInput = {
        inputType: GameInputType.PLAY_CARD as const,
        prevInputType: gameInput?.inputType,
        playedCardContext: playedCard,
        clientOptions: {
          card: this.name,
          fromMeadow: false,
          paymentOptions: { resources: {} },
        },
      };
    }
    return playCardGameInput;
  }

  activateCard(
    gameState: GameState,
    gameInput: GameInput,
    cardOwner: Player,
    playedCard: PlayedCardInfo
  ): void {
    const player = gameState.getActivePlayer();
    if (this.resourcesToGain && sumResources(this.resourcesToGain)) {
      player.gainResources(gameState, this.resourcesToGain);
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
    if (this.playInner) {
      const playCardGameInput = this.getPlayCardInput(gameInput, playedCard);
      this.playInner(gameState, playCardGameInput);
    }
  }

  productionWillActivate(
    gameState: GameState,
    cardOwner: Player,
    playedCard: PlayedCardInfo
  ): boolean {
    if (this.productionWillActivateInner) {
      return this.productionWillActivateInner(gameState, cardOwner, playedCard);
    }
    return true;
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
    numInDeck: 2,
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
    numInDeck: 2,
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
          label: "Discard up to 5 CARD to gain 1 VP each",
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
          if (numDiscarded === 0 && gameInput.isAutoAdvancedInput) {
            gameState.addGameLogFromCard(CardName.BARD, [
              player,
              ` has no CARD to discard.`,
            ]);
          } else {
            gameState.addGameLogFromCard(CardName.BARD, [
              player,
              ` discarded ${numDiscarded} CARD to gain ${numDiscarded} VP.`,
            ]);
          }
          gameInput.clientOptions.cardsToDiscard.forEach((cardName) => {
            player.removeCardFromHand(cardName);
            gameState.discardPile.addToStack(cardName);
          });
          player.gainResources(gameState, {
            [ResourceType.VP]: numDiscarded,
          });
        }
      } else {
        throw new Error(`Unexpected input type ${gameInput.inputType}`);
      }
    },
  }),
  [CardName.BARGE_TOAD]: new Card({
    name: CardName.BARGE_TOAD,
    numInDeck: 3,
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
    productionWillActivateInner: (gameState: GameState, cardOwner: Player) => {
      return cardOwner.getPlayedCardInfos(CardName.FARM).length !== 0;
    },
    productionInner: (
      gameState: GameState,
      gameInput: GameInput,
      cardOwner: Player
    ) => {
      const player = gameState.getActivePlayer();
      const playedFarms = cardOwner.getPlayedCardInfos(CardName.FARM);
      if (playedFarms.length !== 0) {
        player.gainResources(gameState, {
          [ResourceType.TWIG]: 2 * playedFarms.length,
        });
        gameState.addGameLogFromCard(CardName.BARGE_TOAD, [
          player,
          ` gained ${2 * playedFarms.length} TWIG.`,
        ]);
      }
    },
  }),
  [CardName.CASTLE]: new Card({
    name: CardName.CASTLE,
    numInDeck: 2,
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
    numInDeck: 2,
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
          label: "Select where to draw CARD",
          options: [
            gameState.deck.length >= 4 && "Deck",
            gameState.discardPile.length >= 4 && "Discard Pile",
          ].filter(Boolean) as string[],
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
        const filteredOptions = revealedCards.filter((cardName) => {
          const card = Card.fromName(cardName);
          return card.canPlayIgnoreCostAndSource(gameState);
        });
        gameState.addGameLogFromCard(CardName.CEMETARY, [
          player,
          " revealed ",
          ...cardListToGameText(revealedCards),
          ` from the ${selectedOption}${
            filteredOptions.length === 0 ? " but is unable to play any" : ""
          }.`,
        ]);
        if (filteredOptions.length !== 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: gameInput.inputType,
            label: "Select 1 CARD to play for free",
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
    numInDeck: 2,
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
    numInDeck: 3,
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
        gameState.addGameLogFromCard(CardName.CHIP_SWEEP, [
          player,
          " activated ",
          targetCard,
          ".",
        ]);
        targetCard.reactivateCard(
          gameState,
          gameInput,
          player,
          selectedCards[0]
        );
      }
    },
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const cardOptions = onlyRelevantProductionCards(
        gameState,
        player
          .getAllPlayedCardsByType(CardType.PRODUCTION)
          .filter(({ cardName }) => {
            // Don't let the CHIP_SWEEP copy CHIP_SWEEP
            return cardName !== CardName.CHIP_SWEEP;
          })
      );
      if (cardOptions.length !== 0) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: gameInput.inputType,
          label: "Select 1 PRODUCTION to activate",
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
    productionWillActivateInner: (gameState: GameState, cardOwner: Player) => {
      // Activating CHIP_SWEEP is useless if you only have it.
      // TODO: What if you only have CHIP_SWEEP & MINER_MOLE
      return (
        cardOwner
          .getAllPlayedCardsByType(CardType.PRODUCTION)
          .filter(({ cardName }) => cardName !== CardName.CHIP_SWEEP).length !==
        0
      );
    },
  }),
  [CardName.CLOCK_TOWER]: new Card({
    name: CardName.CLOCK_TOWER,
    numInDeck: 3,
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
    numInDeck: 2,
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

        player.gainResources(gameState, {
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
    numInDeck: 3,
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
    numInDeck: 2,
    baseVP: 4,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.UNIVERSITY,
    resourcesToGain: {},
    cardDescription: toGameText("You may pay up to 3 BERRY to gain 1 VP each."),
    productionInner: activateCardSpendResourceToGetVPFactory({
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
    numInDeck: 2,
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
    numInDeck: 2,
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
    numInDeck: 3,
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
    numInDeck: 8,
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
    numInDeck: 2,
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
        if (
          gameInput.playedCardContext &&
          player.findPlayedCard(gameInput.playedCardContext)
        ) {
          player.removeCardFromCity(
            gameState,
            gameInput.playedCardContext,
            false /* don't add to discard */
          );
          gameState.addGameLogFromCard(CardName.FOOL, [
            player,
            " removed the ",
            Card.fromName(CardName.FOOL),
            " from their city.",
          ]);
        }
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYER,
          prevInputType: gameInput.inputType,
          label: [
            "Select player to play ",
            { type: "entity", entityType: "card", card: CardName.FOOL },
          ],
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
    numInDeck: 3,
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
      player.gainResources(gameState, {
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
    numInDeck: 3,
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
    numInDeck: 4,
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
      const gainAnyHelper = new GainAnyResource({
        cardContext: CardName.HUSBAND,
      });
      if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
      }
    },
    productionWillActivateInner: (gameState: GameState, cardOwner: Player) => {
      const playedHusbands = cardOwner.getPlayedCardInfos(CardName.HUSBAND);
      const playedWifes = cardOwner.getPlayedCardInfos(CardName.WIFE);
      return (
        cardOwner.hasCardInCity(CardName.FARM) &&
        playedHusbands.length <= playedWifes.length
      );
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
        const gainAnyHelper = new GainAnyResource({
          cardContext: CardName.HUSBAND,
        });
        gameState.pendingGameInputs.push(
          gainAnyHelper.getGameInput({ prevInputType: gameInput.inputType })
        );
      }
    },
  }),
  [CardName.INN]: new Card({
    name: CardName.INN,
    cardType: CardType.DESTINATION,
    baseCost: { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 },
    baseVP: 2,
    numInDeck: 3,
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
            card.canPlayIgnoreCostAndSource(gameState) &&
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
          label: "Select 1 CARD from the Meadow to play for 3 fewer ANY",
          cardOptions: gameState.meadowCards.filter((cardName) => {
            const card = Card.fromName(cardName);
            return (
              card.canPlayIgnoreCostAndSource(gameState) &&
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
        if (!selectedCard.canPlayIgnoreCostAndSource(gameState)) {
          throw new Error(`Unable to play ${selectedCardName}`);
        }

        gameState.addGameLogFromCard(CardName.INN, [
          player,
          " selected ",
          selectedCard,
          " to play from the Meadow.",
        ]);

        if (sumResources(selectedCard.baseCost) <= 3) {
          gameState.removeCardFromMeadow(selectedCard.name);
          gameState.replenishMeadow();
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

        gameState.removeCardFromMeadow(card.name);
        gameState.replenishMeadow();

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
    numInDeck: 3,
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
    numInDeck: 2,
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
    numInDeck: 2,
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
    numInDeck: 2,
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
          label: "Select location to copy",
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
        gameState.addGameLogFromCard(CardName.LOOKOUT, [
          player,
          " copied ",
          location,
          ".",
        ]);
        location.triggerLocation(gameState);
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
    numInDeck: 3,
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
    numInDeck: 3,
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
        gameState.addGameLogFromCard(CardName.MINER_MOLE, [
          player,
          " activated ",
          targetCard,
          " from ",
          cardOwner,
          "'s city.",
        ]);
        targetCard.reactivateCard(
          gameState,
          gameInput,
          cardOwner,
          selectedCards[0]
        );
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
      const cardOptions = onlyRelevantProductionCards(
        gameState,
        productionPlayedCards.filter((playedCardInfo) => {
          // Don't MINER_MOLE MINER_MOLE OR CHIP_SWEEP
          return (
            playedCardInfo.cardName !== CardName.MINER_MOLE &&
            playedCardInfo.cardName !== CardName.CHIP_SWEEP
          );
        })
      );
      if (cardOptions.length !== 0) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: gameInput.inputType,
          cardContext: CardName.MINER_MOLE,
          label: "Select 1 PRODUCTION to activate",
          cardOptions,
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [],
          },
        });
      }
    },
    productionWillActivateInner: (gameState: GameState, cardOwner: Player) => {
      let foundCardToCopy = false;
      gameState.players.forEach((p) => {
        if (!foundCardToCopy && p.playerId !== cardOwner.playerId) {
          foundCardToCopy =
            p
              .getAllPlayedCardsByType(CardType.PRODUCTION)
              .filter(
                ({ cardName }) =>
                  cardName !== CardName.CHIP_SWEEP &&
                  cardName !== CardName.MINER_MOLE
              ).length !== 0;
        }
      });
      return foundCardToCopy;
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
    numInDeck: 2,
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
          toSpend: true,
          label: "Select 2 ANY to give to another player",
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
          label: [
            "Select player to give ",
            ...resourceMapToGameText(gameInput.clientOptions.resources),
          ],
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
        targetPlayer.gainResources(gameState, resources);
        player.gainResources(gameState, {
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
    numInDeck: 2,
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
          // Only log if its not an auto advanced input.
          if (!gameInput.isAutoAdvancedInput) {
            gameState.addGameLogFromCard(CardName.MONK, [
              player,
              " decline to give up any BERRY.",
            ]);
          }
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
          label: `Select player to give ${numBerries} BERRY`,
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
        targetPlayer.gainResources(gameState, {
          [ResourceType.BERRY]: numBerries,
        });
        player.gainResources(gameState, {
          [ResourceType.VP]: 2 * numBerries,
        });
        gameState.addGameLogFromCard(CardName.MONK, [
          player,
          ` gave ${numBerries} BERRY to `,
          targetPlayer,
          ` to gain ${numBerries * 2} VP.`,
        ]);
      }
    },
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_RESOURCES,
        label: "Give another player up to 2 BERRY to gain 2 VP each",
        toSpend: true,
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
    numInDeck: 2,
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
    numInDeck: 3,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.RUINS,
    resourcesToGain: {},
    cardDescription: toGameText(
      "You may pay up to 2 ANY to gain an equal amount of ANY."
    ),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const gainAnyHelper = new GainMoreThan1AnyResource({
        cardContext: CardName.PEDDLER,
      });
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
            gameState.pendingGameInputs.push(
              gainAnyHelper.getGameInput(numResources, {
                prevInputType: gameInput.inputType,
              })
            );

            player.spendResources(gameInput.clientOptions.resources);
            gameState.addGameLogFromCard(CardName.PEDDLER, [
              player,
              " paid ",
              ...resourceMapToGameText(gameInput.clientOptions.resources),
              ".",
            ]);
          }
        } else {
          gainAnyHelper.play(gameState, gameInput);
        }
      }
    },
    productionInner: (gameState: GameState, gameInput: GameInput) => {
      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_RESOURCES,
        toSpend: true,
        label: `Pay up to 2 ANY to gain an equal amount of ANY`,
        prevInputType: gameInput.inputType,
        cardContext: CardName.PEDDLER,
        maxResources: 2,
        minResources: 0,
        clientOptions: {
          resources: {},
        },
      });
    },
  }),
  [CardName.POST_OFFICE]: new Card({
    name: CardName.POST_OFFICE,
    cardType: CardType.DESTINATION,
    baseCost: { [ResourceType.TWIG]: 1, [ResourceType.RESIN]: 2 },
    baseVP: 2,
    numInDeck: 3,
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
          label: "Select Player to give 2 CARD",
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
        const selectedPlayer = gameState.getPlayer(
          gameInput.clientOptions.selectedPlayer
        );
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          label: [
            "Select 2 CARD to give to ",
            selectedPlayer.getGameTextPart(),
          ],
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
            label: `Select any number of CARD to discard from your hand`,
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
    numInDeck: 3,
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
          label: `Select up to 1 CARD to play for free`,
          maxToSelect: 1,
          minToSelect: 0,
          cardOptions: cardOptions.filter((cardName) => {
            const cardOption = Card.fromName(cardName);
            if (cardOption.baseVP > 3) {
              return false;
            }
            return cardOption.canPlayIgnoreCostAndSource(gameState);
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
    numInDeck: 2,
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
          return card.baseVP <= 3 && card.canPlayIgnoreCostAndSource(gameState);
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
        // Find all playable cards worth up to 3 baseVP
        const playableCards: CardName[] = [];
        [...player.cardsInHand, ...gameState.meadowCards].forEach(
          (cardName) => {
            const card = Card.fromName(cardName as CardName);
            if (
              card.baseVP <= 3 &&
              card.canPlayIgnoreCostAndSource(gameState)
            ) {
              playableCards.push(card.name);
            }
          }
        );

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: gameInput.inputType,
          label: "Select CARD to play for free",
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
          throw new Error("No card selected");
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

        const cardExistInHand = player.cardsInHand.indexOf(card.name) !== -1;
        const cardExistInMeadow =
          gameState.meadowCards.indexOf(card.name) !== -1;

        if (cardExistInHand && cardExistInMeadow) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: gameInput.inputType,
            prevInput: gameInput,
            cardContext: CardName.QUEEN,
            label: ["Select where to play ", card.getGameTextPart(), " from"],
            options: ["Meadow", "Hand"],
            clientOptions: {
              selectedOption: null,
            },
          });
        } else if (cardExistInMeadow || cardExistInHand) {
          if (cardExistInMeadow) {
            gameState.removeCardFromMeadow(card.name);
            gameState.addGameLogFromCard(CardName.QUEEN, [
              player,
              " played ",
              card,
              " from the Meadow.",
            ]);
          } else {
            player.removeCardFromHand(card.name);
            gameState.addGameLogFromCard(CardName.QUEEN, [
              player,
              " played ",
              card,
              " from their hand.",
            ]);
          }
          card.addToCityAndPlay(gameState, gameInput);
        } else {
          throw new Error(
            "Cannot find the selected card in the Meadow or your hand."
          );
        }
      } else if (
        gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
        gameInput.cardContext === CardName.QUEEN &&
        gameInput.prevInput &&
        gameInput.prevInput.inputType === GameInputType.SELECT_CARDS
      ) {
        const selectedCards = gameInput.prevInput.clientOptions.selectedCards;
        if (!selectedCards) {
          throw new Error("No card selected");
        }
        if (selectedCards.length !== 1) {
          throw new Error("Incorrect number of cards selected");
        }
        const card = Card.fromName(selectedCards[0]);
        if (card.baseVP > 3) {
          throw new Error(
            "Cannot use Queen to play a card worth more than 3 base VP"
          );
        }
        if (gameInput.clientOptions.selectedOption === "Meadow") {
          gameState.removeCardFromMeadow(card.name);
          gameState.addGameLogFromCard(CardName.QUEEN, [
            player,
            " played ",
            card,
            " from the Meadow.",
          ]);
        } else if (gameInput.clientOptions.selectedOption === "Hand") {
          player.removeCardFromHand(card.name);
          gameState.addGameLogFromCard(CardName.QUEEN, [
            player,
            " played ",
            card,
            " from their hand.",
          ]);
        } else {
          throw new Error("Please choose one of the options");
        }
        card.addToCityAndPlay(gameState, gameInput);
      }
    },
  }),
  [CardName.RANGER]: new Card({
    name: CardName.RANGER,
    cardType: CardType.TRAVELER,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 1,
    numInDeck: 2,
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
    numInDeck: 3,
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
    numInDeck: 3,
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
          if (
            gameInput.playedCardContext &&
            isEqual(gameInput.playedCardContext, playedCardInfo)
          ) {
            return;
          }
          if (card.isConstruction) {
            cardOptions.push(playedCardInfo);
          }
        });
        if (cardOptions.length !== 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: gameInput.inputType,
            label: "Select 1 Construction to discard from your city",
            playedCardContext: gameInput.playedCardContext,
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
        player.gainResources(gameState, targetCard.baseCost);
        // This doesn't if we're reactiving a played RUINS
        if (!gameInput.playedCardContext) {
          player.addToCity(CardName.RUINS);
        }
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
    numInDeck: 2,
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
    numInDeck: 2,
    isUnique: true,
    isConstruction: false,
    associatedCard: CardName.CHAPEL,
    cardDescription: toGameText([
      "Gain 3 BERRY, then gain 1 VP for each VP on your ",
      { type: "entity", entityType: "card", card: CardName.CHAPEL },
      ".",
      { type: "HR" },
      "If paying for card with resources, pay resources to an opponent.",
    ]),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        if (
          sumResources(gameInput.clientOptions.paymentOptions.resources) > 0
        ) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_PLAYER,
            label: [
              "Select Player to pay ",
              ...resourceMapToGameText(
                gameInput.clientOptions.paymentOptions.resources
              ),
              " to",
            ],
            prevInputType: gameInput.inputType,
            // Leave out the playedCardContext here otherwise tests get really
            // complicated without much gain.
            prevInput: omit(gameInput, ["playedCardContext"]),
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
          player.gainResources(gameState, { [ResourceType.BERRY]: 3 });
          const chapelInfo = player.getPlayedCardInfos(CardName.CHAPEL);
          if (chapelInfo.length > 0) {
            const chapel = chapelInfo[0].resources;
            if (!chapel) {
              throw new Error("invalid chapel card info");
            }

            const numVP = chapel[ResourceType.VP] || 0;
            player.gainResources(gameState, { [ResourceType.VP]: numVP });
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
        targetPlayer.gainResources(gameState, resourcesToGive);
        gameState.addGameLogFromCard(CardName.SHEPHERD, [
          player,
          " gave ",
          targetPlayer,
          " ",
          ...resourceMapToGameText(resourcesToGive),
          ".",
        ]);
      } else if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // give the player their berries + VP, don't ask them to select a player

        player.gainResources(gameState, { [ResourceType.BERRY]: 3 });
        const chapelInfo = player.getPlayedCardInfos(CardName.CHAPEL);

        if (chapelInfo.length > 0) {
          const chapel = chapelInfo[0].resources;
          if (!chapel) {
            throw new Error("invalid chapel card info");
          }

          const numVP = chapel[ResourceType.VP] || 0;
          player.gainResources(gameState, { [ResourceType.VP]: numVP });
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
    numInDeck: 3,
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
        player.gainResources(gameState, {
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
    numInDeck: 3,
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
        const newPlayedCard = cloneDeep(origPlayedCard);
        if (selectedOption === "3 TWIG") {
          newPlayedCard.resources![ResourceType.TWIG]! += 3;
          gameState.addGameLogFromCard(CardName.STOREHOUSE, [
            player,
            " added 3 TWIG.",
          ]);
        } else if (selectedOption === "2 RESIN") {
          newPlayedCard.resources![ResourceType.RESIN]! += 2;
          gameState.addGameLogFromCard(CardName.STOREHOUSE, [
            player,
            " added 2 RESIN.",
          ]);
        } else if (selectedOption === "1 PEBBLE") {
          newPlayedCard.resources![ResourceType.PEBBLE]! += 1;
          gameState.addGameLogFromCard(CardName.STOREHOUSE, [
            player,
            " added 1 PEBBLE.",
          ]);
        } else if (selectedOption === "2 BERRY") {
          newPlayedCard.resources![ResourceType.BERRY]! += 2;
          gameState.addGameLogFromCard(CardName.STOREHOUSE, [
            player,
            " added 2 BERRY.",
          ]);
        } else {
          throw new Error("Must select an option!");
        }
        player.updatePlayedCard(gameState, origPlayedCard, newPlayedCard);
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
        player.gainResources(gameState, origPlayedCard.resources!);

        player.updatePlayedCard(gameState, origPlayedCard, {
          ...cloneDeep(origPlayedCard),
          resources: {
            [ResourceType.TWIG]: 0,
            [ResourceType.RESIN]: 0,
            [ResourceType.PEBBLE]: 0,
            [ResourceType.BERRY]: 0,
          },
        });
      }
    },
  }),
  [CardName.TEACHER]: new Card({
    name: CardName.TEACHER,
    cardType: CardType.PRODUCTION,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 2,
    numInDeck: 3,
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
          label: "Select player to give the other CARD",
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
    numInDeck: 2,
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
    numInDeck: 3,
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
    numInDeck: 2,
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
          label: "Discard 3 CARD from the Meadow",
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
          label: "Select 1 CARD from the Meadow to keep",
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
    numInDeck: 2,
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
      const gainAnyHelper = new GainAnyResource({
        cardContext: CardName.UNIVERSITY,
        skipGameLog: true,
      });

      if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
        // choose a card to destroy
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          label: "Select 1 CARD to discard from your city",
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
        gameState.pendingGameInputs.push(
          gainAnyHelper.getGameInput({
            prevInputType: gameInput.inputType,
            prevInput: gameInput,
          })
        );
      } else if (
        gainAnyHelper.matchesGameInput(gameInput) &&
        gameInput.prevInputType === GameInputType.SELECT_PLAYED_CARDS &&
        !!gameInput.prevInput &&
        gameInput.prevInput.inputType === GameInputType.SELECT_PLAYED_CARDS
      ) {
        // remove card from city + put in discard pile
        const prevInput = gameInput.prevInput;
        const cardToRemove = prevInput.clientOptions.selectedCards[0];
        player.removeCardFromCity(gameState, cardToRemove, true);

        // give player resources from base cost + the resource they chose
        const removedCard = Card.fromName(cardToRemove.cardName);
        player.gainResources(gameState, removedCard.baseCost);
        player.gainResources(gameState, { [ResourceType.VP]: 1 });

        gainAnyHelper.play(gameState, gameInput);
        gameState.addGameLogFromCard(CardName.UNIVERSITY, [
          player,
          " discarded ",
          removedCard,
          ` from their city and gained ${gameInput.clientOptions.selectedOption} and 1 VP.`,
        ]);
      }
    },
  }),
  [CardName.WANDERER]: new Card({
    name: CardName.WANDERER,
    cardType: CardType.TRAVELER,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 1,
    numInDeck: 3,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.LOOKOUT,
    cardDescription: toGameText([
      "Draw 3 CARD.",
      { type: "HR" },
      "Does not take up a space in your city.",
    ]),
    resourcesToGain: {
      CARD: 3,
    },
  }),
  [CardName.WIFE]: new Card({
    name: CardName.WIFE,
    cardType: CardType.PROSPERITY,
    baseCost: { [ResourceType.BERRY]: 2 },
    baseVP: 2,
    numInDeck: 4,
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
    numInDeck: 3,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.STOREHOUSE,
    resourcesToGain: {},
    cardDescription: toGameText("You may pay up to 3 TWIG to gain 1 VP each"),
    productionInner: activateCardSpendResourceToGetVPFactory({
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

  /**
   * WIP: Pearlbrook Cards
   */
  [CardName.BRIDGE]: new Card({
    expansion: ExpansionType.PEARLBROOK,
    name: CardName.BRIDGE,
    associatedCard: CardName.MESSENGER,
    cardType: CardType.GOVERNANCE,
    cardDescription: toGameText([
      "Increase your hand size by 1 for every PEARL you have.",
      { type: "BR" },
      "Also draw 2 CARD every time you gain a PEARL.",
    ]),
    isConstruction: true,
    isUnique: true,
    baseVP: 1,
    numInDeck: 2,
    baseCost: {
      [ResourceType.TWIG]: 2,
      [ResourceType.PEBBLE]: 1,
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.PLAY_CARD) {
        gameState.addGameLogFromCard(CardName.BRIDGE, [
          player,
          "'s hand size is now ${player.maxHandSize}.",
        ]);
      }
    },
  }),
  [CardName.HARBOR]: new Card({
    expansion: ExpansionType.PEARLBROOK,
    name: CardName.HARBOR,
    associatedCard: CardName.SHIPWRIGHT,
    cardType: CardType.PRODUCTION,
    cardDescription: toGameText("If you have at least 2 PEARL, gain 2 ANY."),
    isUnique: true,
    isConstruction: true,
    baseVP: 3,
    numInDeck: 2,
    resourcesToGain: {},
    baseCost: {
      [ResourceType.TWIG]: 3,
      [ResourceType.RESIN]: 1,
      [ResourceType.PEBBLE]: 1,
    },
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const gainAnyHelper = new GainMoreThan1AnyResource({
        cardContext: CardName.HARBOR,
      });
      if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
      }
    },
    productionWillActivateInner: (gameState: GameState, cardOwner: Player) => {
      return cardOwner.getNumResourcesByType(ResourceType.PEARL) >= 2;
    },
    productionInner: (
      gameState: GameState,
      gameInput: GameInput,
      cardOwner: Player
    ) => {
      const numPearls = cardOwner.getNumResourcesByType(ResourceType.PEARL);
      if (numPearls >= 2) {
        const gainAnyHelper = new GainMoreThan1AnyResource({
          cardContext: CardName.HARBOR,
        });
        gameState.pendingGameInputs.push(
          gainAnyHelper.getGameInput(2, { prevInputType: gameInput.inputType })
        );
      }
    },
  }),
  [CardName.MESSENGER]: new Card({
    expansion: ExpansionType.PEARLBROOK,
    name: CardName.MESSENGER,
    associatedCard: CardName.BRIDGE,
    cardType: CardType.TRAVELER,
    cardDescription: toGameText([
      "Draw 1 CARD and gain 1 VP",
      { type: "HR" },
      "Must share a space with a Construction.",
      { type: "BR" },
      "When visiting a River Destination, this Messenger is considered the same color as the shared Construction.",
    ]),
    baseVP: 0,
    numInDeck: 3,
    isConstruction: false,
    isUnique: false,
    baseCost: { [ResourceType.BERRY]: 2 },
    canPlayCheckInner: () => {
      throw new Error("Not Implemented");
    },
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.SHIPWRIGHT]: new Card({
    expansion: ExpansionType.PEARLBROOK,
    name: CardName.SHIPWRIGHT,
    associatedCard: CardName.HARBOR,
    cardType: CardType.PROSPERITY,
    cardDescription: toGameText([
      "Worth 1 VP for each Pearlbrook card in your city.",
      { type: "BR" },
      "Do not count ",
      { type: "em", text: "Adornments" },
      ".",
    ]),
    baseVP: 2,
    numInDeck: 2,
    isUnique: true,
    isConstruction: false,
    baseCost: {
      [ResourceType.BERRY]: 4,
    },
    pointsInner: () => {
      throw new Error("Not Implemented");
    },
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.PIRATE]: new Card({
    expansion: ExpansionType.PEARLBROOK,
    name: CardName.PIRATE,
    associatedCard: CardName.PIRATE_SHIP,
    cardType: CardType.TRAVELER,
    cardDescription: toGameText([
      "Discard up to 4 CARD to draw and reveal an equal amount of CARD.",
      { type: "BR" },
      "If total point base value of drawn CARD is at least 7, gain 1 PEARL.",
      { type: "HR" },
      "Does not take up a space in your city.",
    ]),
    baseVP: 1,
    numInDeck: 3,
    isConstruction: false,
    isUnique: false,
    baseCost: {
      [ResourceType.BERRY]: 3,
    },
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.PIRATE_SHIP]: new Card({
    expansion: ExpansionType.PEARLBROOK,
    name: CardName.PIRATE_SHIP,
    associatedCard: CardName.PIRATE,
    cardType: CardType.DESTINATION,
    cardDescription: toGameText([
      "Move this ",
      { type: "entity", entityType: "card", card: CardName.PIRATE_SHIP },
      " to an empty space in an opponent's city. ",
      "Then gain 1 ANY and 1 VP per PEARL that opponent has, up to a maximum of 3.",
    ]),
    isUnique: false,
    isConstruction: true,
    baseVP: 0,
    numInDeck: 3,
    baseCost: {},
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.FERRY]: new Card({
    expansion: ExpansionType.PEARLBROOK,
    name: CardName.FERRY,
    associatedCard: CardName.FERRY_FERRET,
    cardType: CardType.DESTINATION,
    cardDescription: toGameText([
      "Copy any revealed ",
      { type: "em", text: "River Destination" },
      ".",
      { type: "HR" },
      "Other players may visit this card.",
    ]),
    isConstruction: true,
    isUnique: true,
    baseVP: 2,
    numInDeck: 3,
    baseCost: {
      [ResourceType.TWIG]: 2,
      [ResourceType.RESIN]: 2,
    },
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
  [CardName.FERRY_FERRET]: new Card({
    expansion: ExpansionType.PEARLBROOK,
    name: CardName.FERRY_FERRET,
    associatedCard: CardName.FERRY,
    cardType: CardType.PRODUCTION,
    cardDescription: toGameText("If you have at least 2 PEARL, gain 2 VP"),
    isConstruction: false,
    isUnique: true,
    baseVP: 1,
    numInDeck: 2,
    resourcesToGain: {},
    baseCost: {
      [ResourceType.BERRY]: 3,
    },
    productionInner: () => {
      throw new Error("Not Implemented");
    },
    playInner: () => {
      throw new Error("Not Implemented");
    },
  }),
};

function getPointsPerRarityLabel({
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

function playSpendResourceToGetVPFactory({
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

function activateCardSpendResourceToGetVPFactory({
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
