import {
  AdornmentName,
  AmbassadorPlacementInfo,
  CardName,
  CardType,
  EventName,
  EventType,
  EventNameToPlayerId,
  GameInput,
  GameInputClaimEvent,
  GameInputGameEnd,
  GameInputMultiStep,
  GameInputPlaceWorker,
  GameInputPlayAdornment,
  GameInputPlayCard,
  GameInputPrepareForSeason,
  GameInputType,
  GameInputVisitDestinationCard,
  GameInputPlaceAmbassador,
  GameInputWorkerPlacementTypes,
  GameLogEntry,
  GameOptions,
  GameText,
  LocationName,
  LocationNameToPlayerIds,
  PlayedCardInfo,
  PlayerStatus,
  ResourceType,
  RiverDestinationName,
  RiverDestinationSpotName,
  Season,
  TextPart,
} from "./types";
import { GameStateJSON } from "./jsonTypes";
import { Player } from "./player";
import { Adornment, allAdornments } from "./adornment";
import { Card } from "./card";
import { CardStack, discardPile } from "./cardStack";
import { Location, initialLocationsMap } from "./location";
import {
  initialRiverDestinationMap,
  RiverDestination,
  RiverDestinationMap,
  RiverDestinationSpot,
} from "./riverDestination";
import { Event, initialEventMap } from "./event";
import { initialDeck } from "./deck";
import { assertUnreachable } from "../utils";
import {
  toGameText,
  cardListToGameText,
  workerPlacementToGameText,
} from "./gameText";

import cloneDeep from "lodash/cloneDeep";
import isEqual from "lodash/isEqual";
import omit from "lodash/omit";

const MEADOW_SIZE = 8;
const STARTING_PLAYER_HAND_SIZE = 5;
const MAX_GAME_LOG_BUFFER = 500;

const PRINT_GAME_LOGS = false;

export const gameTextToDebugStr = (gameText: GameText): string => {
  return gameText
    .map((part: TextPart, idx: number) => {
      switch (part.type) {
        case "text":
        case "em":
          return part.text;
        case "BR":
          return "\n";
        case "HR":
          return "\n---\n";
        case "resource":
          return part.resourceType;
        case "cardType":
          return part.cardType;
        case "symbol":
          return part.symbol;
        case "points":
          return `${part.value} points`;
        case "player":
          return part.name;
        case "entity":
          if (part.entityType === "event") {
            return gameTextToDebugStr(
              Event.fromName(part.event).getShortName()
            );
          }
          if (part.entityType === "location") {
            return gameTextToDebugStr(
              Location.fromName(part.location).shortName
            );
          }
          if (part.entityType === "card") {
            return part.card;
          }
          if (part.entityType === "adornment") {
            return part.adornment;
          }
          if (part.entityType === "riverDestination") {
            return part.riverDestination;
          }
          if (part.entityType === "riverDestinationSpot") {
            return gameTextToDebugStr(
              RiverDestinationSpot.fromName(part.spot).shortName
            );
          }
          assertUnreachable(part, `Unexpected part: ${JSON.stringify(part)}`);
          break;
        default:
          assertUnreachable(part, `Unexpected part: ${JSON.stringify(part)}`);
      }
    })
    .join("");
};

const defaultGameOptions = (gameOptions: Partial<GameOptions>): GameOptions => {
  return {
    realtimePoints: false,
    pearlbrook: false,
    ...gameOptions,
  };
};

export class GameState {
  readonly gameStateId: number;
  readonly gameOptions: GameOptions;
  readonly gameLog: GameLogEntry[];

  // GameInputs that need to be shown to the user.
  readonly pendingGameInputs: GameInputMultiStep[];

  // List of game inputs that have been played since the
  // start of the active player's turn.
  private playedGameInputs: GameInput[];

  // Player & Active Player
  private _activePlayerId: Player["playerId"];
  readonly players: Player[];

  readonly discardPile: CardStack<CardName>;
  readonly deck: CardStack<CardName>;

  readonly meadowCards: CardName[];
  readonly locationsMap: LocationNameToPlayerIds;
  readonly eventsMap: EventNameToPlayerId;

  readonly adornmentsPile: CardStack<AdornmentName> | null;
  readonly riverDestinationMap: RiverDestinationMap | null;

  constructor({
    gameStateId,
    activePlayerId,
    players,
    meadowCards,
    discardPile,
    deck,
    locationsMap,
    eventsMap,
    gameLog = [],
    gameOptions = {},
    pendingGameInputs = [],
    playedGameInputs = [],
    adornmentsPile = null,
    riverDestinationMap = null,
  }: {
    gameStateId: number;
    activePlayerId?: Player["playerId"];
    players: Player[];
    meadowCards: CardName[];
    discardPile: CardStack<CardName>;
    deck: CardStack<CardName>;
    locationsMap: LocationNameToPlayerIds;
    eventsMap: EventNameToPlayerId;
    adornmentsPile?: CardStack<AdornmentName> | null;
    riverDestinationMap?: RiverDestinationMap | null;
    pendingGameInputs: GameInputMultiStep[];
    playedGameInputs?: GameInput[];
    gameLog: GameLogEntry[];
    gameOptions?: Partial<GameOptions>;
  }) {
    this.gameStateId = gameStateId;
    this.players = players;
    this.locationsMap = locationsMap;
    this.meadowCards = meadowCards;
    this.discardPile = discardPile;
    this.deck = deck;
    this.eventsMap = eventsMap;
    this._activePlayerId = activePlayerId || players[0].playerId;
    this.pendingGameInputs = pendingGameInputs;
    this.playedGameInputs = playedGameInputs;
    this.gameLog = gameLog;
    this.adornmentsPile = adornmentsPile;
    this.riverDestinationMap = riverDestinationMap;
    this.gameOptions = defaultGameOptions(gameOptions);
  }

  get activePlayerId(): string {
    return this._activePlayerId;
  }

  addGameLogFromRiverDestinationSpot(
    name: RiverDestinationSpotName,
    args: Parameters<typeof toGameText>[0]
  ): void {
    if (typeof args === "string") {
      this.addGameLog([RiverDestinationSpot.fromName(name), ": ", args]);
    } else {
      this.addGameLog([RiverDestinationSpot.fromName(name), ": ", ...args]);
    }
  }

  addGameLogFromRiverDestination(
    name: RiverDestinationName,
    args: Parameters<typeof toGameText>[0]
  ): void {
    if (typeof args === "string") {
      this.addGameLog([RiverDestination.fromName(name), ": ", args]);
    } else {
      this.addGameLog([RiverDestination.fromName(name), ": ", ...args]);
    }
  }

  addGameLogFromAdornment(
    adornment: AdornmentName,
    args: Parameters<typeof toGameText>[0]
  ): void {
    if (typeof args === "string") {
      this.addGameLog([Adornment.fromName(adornment), ": ", args]);
    } else {
      this.addGameLog([Adornment.fromName(adornment), ": ", ...args]);
    }
  }

  addGameLogFromCard(
    card: CardName,
    args: Parameters<typeof toGameText>[0]
  ): void {
    if (typeof args === "string") {
      this.addGameLog([Card.fromName(card), ": ", args]);
    } else {
      this.addGameLog([Card.fromName(card), ": ", ...args]);
    }
  }

  addGameLogFromLocation(
    location: LocationName,
    args: Parameters<typeof toGameText>[0]
  ): void {
    if (typeof args === "string") {
      this.addGameLog([Location.fromName(location), ": ", args]);
    } else {
      this.addGameLog([Location.fromName(location), ": ", ...args]);
    }
  }

  addGameLogFromEvent(
    event: EventName,
    args: Parameters<typeof toGameText>[0]
  ): void {
    if (typeof args === "string") {
      this.addGameLog([Event.fromName(event), ": ", args]);
    } else {
      this.addGameLog([Event.fromName(event), ": ", ...args]);
    }
  }

  addGameLog(args: Parameters<typeof toGameText>[0]): void {
    const logSize = this.gameLog.length;
    if (logSize > MAX_GAME_LOG_BUFFER) {
      this.gameLog.splice(0, Math.floor(MAX_GAME_LOG_BUFFER / 2));
    }
    const entry = toGameText(args);
    if (PRINT_GAME_LOGS) {
      const debugStr = gameTextToDebugStr(entry);
      console.log(debugStr);
    }
    this.gameLog.push({ entry });
  }

  debugPrintLogs(): void {
    this.gameLog.forEach((log) => {
      console.log(gameTextToDebugStr(log.entry));
    });
  }

  toJSON(includePrivate: boolean): GameStateJSON {
    return cloneDeep({
      ...{
        gameStateId: this.gameStateId,
        activePlayerId: this.activePlayerId,
        players: this.players.map((p) => p.toJSON(includePrivate)),
        meadowCards: this.meadowCards,
        locationsMap: this.locationsMap,
        eventsMap: this.eventsMap,
        pendingGameInputs: [],
        playedGameInputs: [],
        deck: this.deck.toJSON(includePrivate),
        discardPile: this.discardPile.toJSON(includePrivate),
        gameLog: this.gameLog,
        gameOptions: this.gameOptions,
        riverDestinationMap: this.riverDestinationMap
          ? this.riverDestinationMap.toJSON(includePrivate)
          : null,
        adornmentsPile: this.adornmentsPile
          ? this.adornmentsPile.toJSON(includePrivate)
          : null,
      },
      ...(includePrivate
        ? {
            pendingGameInputs: this.pendingGameInputs,
            playedGameInputs: this.playedGameInputs,
          }
        : {}),
    });
  }

  nextPlayer(): void {
    const remainingPlayers = this.getRemainingPlayers();
    if (remainingPlayers.length !== 0) {
      const player = this.getActivePlayer();

      // Make a list of 2 copies of the players list so we'll encounter
      // each player at least once no matter where we start in the first list.
      const playerTurnOrder = [...this.players, ...this.players];

      const startIdx = playerTurnOrder.indexOf(player);
      for (let i = startIdx + 1; i < playerTurnOrder.length; i++) {
        // Find the first next player that doesn't have a GAME_ENDED status.
        if (playerTurnOrder[i].playerStatus !== PlayerStatus.GAME_ENDED) {
          this._activePlayerId = playerTurnOrder[i].playerId;
          break;
        }
      }
    }
  }

  // returns list of players who do not have the GAME_END playerStatus
  getRemainingPlayers(): Player[] {
    return this.players.filter((player) => {
      return player.playerStatus !== PlayerStatus.GAME_ENDED;
    });
  }

  // returns list of players who do not have the GAME_END playerStatus
  getRemainingPlayersExceptActivePlayer(): Player[] {
    return this.players.filter((player) => {
      return (
        player.playerStatus !== PlayerStatus.GAME_ENDED &&
        player.playerId !== this.activePlayerId
      );
    });
  }

  // returns list of players who have space in their hands
  getPlayersWithHandSpace(): Player[] {
    return this.players.filter((player) => {
      return player.cardsInHand.length < player.maxHandSize;
    });
  }

  isGameOver(): boolean {
    return this.getRemainingPlayers().length === 0;
  }

  replenishMeadow(): void {
    while (this.meadowCards.length < MEADOW_SIZE) {
      this.meadowCards.push(this.drawCard());
    }
  }

  removeCardFromMeadow(
    cardName: CardName,
    replenishMeadow: boolean = true
  ): void {
    const idx = this.meadowCards.indexOf(cardName);
    if (idx === -1) {
      throw new Error(
        `Unable to remove meadow card ${cardName}.\n meadowCards: ${JSON.stringify(
          this.meadowCards,
          null,
          2
        )}`
      );
    } else {
      this.meadowCards.splice(idx, 1);
    }
    if (replenishMeadow) {
      this.replenishMeadow();
    }
  }

  clone(): GameState {
    const gameStateJSON = this.toJSON(true /* includePrivate */);
    gameStateJSON.gameStateId += 1;
    return GameState.fromJSON(gameStateJSON);
  }

  private handlePlayCardGameInput(gameInput: GameInputPlayCard): void {
    if (!gameInput.clientOptions?.card) {
      throw new Error("Please select a card to play.");
    }

    const card = Card.fromName(gameInput.clientOptions.card);
    const player = this.getActivePlayer();
    const canPlayErr = card.canPlayCheck(this, gameInput);
    if (canPlayErr) {
      throw new Error(canPlayErr);
    }

    const paymentOptionsError = player.validatePaymentOptions(gameInput);
    if (paymentOptionsError) {
      throw new Error(paymentOptionsError);
    }

    this.addGameLog(this.playCardInputLog(gameInput));

    player.payForCard(this, gameInput);
    if (gameInput.clientOptions.fromMeadow) {
      this.removeCardFromMeadow(card.name);
    } else {
      player.removeCardFromHand(this, card.name, false /* addToDiscardPile */);
    }
    card.play(this, gameInput);
  }

  private handlePlaceWorkerGameInput(gameInput: GameInputPlaceWorker): void {
    if (!gameInput.clientOptions?.location) {
      throw new Error("Please select a location to visit");
    }
    const location = Location.fromName(gameInput.clientOptions.location);
    const canPlaceWorkerCheckErr = location.canPlaceWorkerCheck(
      this,
      gameInput
    );
    if (canPlaceWorkerCheckErr) {
      throw new Error(canPlaceWorkerCheckErr);
    }
    const canPlayErr = location.canPlayCheck(this, gameInput);
    if (canPlayErr) {
      throw new Error(canPlayErr);
    }

    const player = this.getActivePlayer();
    this.addGameLog([player, " placed a worker on ", location, "."]);

    // Before we place the worker because locations need to check occupancy.
    location.play(this, gameInput);

    player.placeWorkerOnLocation(location.name);
    this.locationsMap[location.name]!.push(player.playerId);
  }

  updatePendingGameInputs(
    mapFn: (gameInput: GameInputMultiStep) => GameInputMultiStep
  ): void {
    const newPendingInputs = this.pendingGameInputs.map(mapFn);
    while (this.pendingGameInputs.length !== 0) {
      this.pendingGameInputs.pop();
    }
    this.pendingGameInputs.push(...newPendingInputs);
  }

  private removeMultiStepGameInput(gameInput: GameInputMultiStep): void {
    const found = this.pendingGameInputs.find((pendingGameInput) => {
      const keysToOmit = ["clientOptions", "label", "isAutoAdvancedInput"];
      return isEqual(
        omit(pendingGameInput, keysToOmit),
        omit(gameInput, keysToOmit)
      );
    });
    if (!found) {
      throw new Error(
        `Invalid multi-step input. \n gameInput: ${JSON.stringify(
          gameInput,
          null,
          2
        )} \n\nexpected one of: ${JSON.stringify(
          this.pendingGameInputs,
          null,
          2
        )}`
      );
    }
    const idx = this.pendingGameInputs.indexOf(found);
    this.pendingGameInputs.splice(idx, 1);
  }

  private validateMultiStepGameInput(gameInput: GameInputMultiStep): void {
    switch (gameInput.inputType) {
      case GameInputType.SELECT_OPTION_GENERIC:
        if (
          !gameInput.clientOptions.selectedOption ||
          gameInput.options.indexOf(gameInput.clientOptions.selectedOption) ===
            -1
        ) {
          throw new Error("Please select one of the options.");
        }
        break;
      case GameInputType.SELECT_CARDS:
        if (
          gameInput.minToSelect === gameInput.maxToSelect &&
          gameInput.clientOptions.selectedCards.length !== gameInput.minToSelect
        ) {
          throw new Error(`Please select ${gameInput.minToSelect} cards.`);
        }
        if (
          gameInput.clientOptions.selectedCards.length < gameInput.minToSelect
        ) {
          throw new Error(
            `Please select at least ${gameInput.minToSelect} cards.`
          );
        }
        if (
          gameInput.clientOptions.selectedCards.length > gameInput.maxToSelect
        ) {
          throw new Error(
            `Please select a max of ${gameInput.maxToSelect} cards.`
          );
        }
        gameInput.clientOptions.selectedCards.forEach((a) => {
          if (!gameInput.cardOptions.find((b) => isEqual(a, b))) {
            throw new Error("Selected card is not a valid option.");
          }
        });
        break;
      case GameInputType.SELECT_PLAYED_CARDS:
        if (
          gameInput.minToSelect === gameInput.maxToSelect &&
          gameInput.clientOptions.selectedCards.length !== gameInput.minToSelect
        ) {
          throw new Error(`Please select ${gameInput.minToSelect} cards.`);
        }
        if (
          gameInput.clientOptions.selectedCards.length < gameInput.minToSelect
        ) {
          throw new Error(
            `Please select at least ${gameInput.minToSelect} cards.`
          );
        }
        if (
          gameInput.clientOptions.selectedCards.length > gameInput.maxToSelect
        ) {
          throw new Error(
            `Please select a max of ${gameInput.maxToSelect} cards.`
          );
        }
        gameInput.clientOptions.selectedCards.forEach((a) => {
          if (!gameInput.cardOptions.find((b) => isEqual(a, b))) {
            throw new Error("Selected card is not a valid option.");
          }
        });
        break;
      case GameInputType.SELECT_PLAYER:
        if (
          gameInput.mustSelectOne &&
          !gameInput.clientOptions.selectedPlayer
        ) {
          throw new Error("Please select a player");
        }
        if (
          gameInput.clientOptions.selectedPlayer &&
          gameInput.playerOptions.indexOf(
            gameInput.clientOptions.selectedPlayer
          ) === -1
        ) {
          throw new Error("Invalid player selected");
        }
        break;
      case GameInputType.SELECT_LOCATION:
        if (!gameInput.clientOptions.selectedLocation) {
          throw new Error("Please select a Location");
        }
        if (
          gameInput.locationOptions.indexOf(
            gameInput.clientOptions.selectedLocation
          ) === -1
        ) {
          throw new Error("Invalid Location selected");
        }
        break;
      // case GameInputType.SELECT_WORKER_PLACEMENT:
      // case GameInputType.SELECT_PAYMENT_FOR_CARD:
      // case GameInputType.SELECT_RESOURCES:
      // case GameInputType.DISCARD_CARDS:
      // case GameInputType.SELECT_PLAYED_ADORNMENT:
      // case GameInputType.SELECT_RIVER_DESTINATION:
      default:
        break;
    }
  }

  private handleMultiStepGameInput(gameInput: GameInputMultiStep): void {
    this.validateMultiStepGameInput(gameInput);
    if (gameInput.cardContext) {
      const card = Card.fromName(gameInput.cardContext);
      const canPlayCardErr = card.canPlayCheck(this, gameInput);
      if (canPlayCardErr) {
        throw new Error(canPlayCardErr);
      }
      card.play(this, gameInput);
      return;
    }

    if (gameInput.locationContext) {
      const location = Location.fromName(gameInput.locationContext);
      const canPlayLocationErr = location.canPlayCheck(this, gameInput);
      if (canPlayLocationErr) {
        throw new Error(canPlayLocationErr);
      }
      location.play(this, gameInput);
      return;
    }

    if (gameInput.eventContext) {
      const event = Event.fromName(gameInput.eventContext);
      const canPlayEventErr = event.canPlayCheck(this, gameInput);
      if (canPlayEventErr) {
        throw new Error(canPlayEventErr);
      }
      event.play(this, gameInput);
      return;
    }

    if (gameInput.adornmentContext) {
      const adornment = Adornment.fromName(gameInput.adornmentContext);
      const canPlayAdornmentErr = adornment.canPlayCheck(this, gameInput);
      if (canPlayAdornmentErr) {
        throw new Error(canPlayAdornmentErr);
      }
      adornment.play(this, gameInput);
      return;
    }

    if (gameInput.riverDestinationContext) {
      const riverDestination = RiverDestination.fromName(
        gameInput.riverDestinationContext
      );
      riverDestination.play(this, gameInput);
      return;
    }

    if (
      gameInput.prevInputType === GameInputType.PREPARE_FOR_SEASON &&
      gameInput.inputType === GameInputType.SELECT_CARDS
    ) {
      const selectedCards = gameInput.clientOptions.selectedCards;

      if (selectedCards.length !== gameInput.minToSelect) {
        throw new Error("Not enough cards");
      }
      const player = this.getActivePlayer();

      selectedCards.forEach((cardName) => {
        this.removeCardFromMeadow(cardName);
        player.addCardToHand(this, cardName);
      });

      this.addGameLog([
        { type: "em", text: "Prepare for season" },
        ": ",
        player,
        " selected ",
        ...cardListToGameText(selectedCards),
        " from the Meadow.",
      ]);

      return;
    }

    throw new Error(`Unhandled game input: ${JSON.stringify(gameInput)}`);
  }

  private handleClaimEventGameInput(gameInput: GameInputClaimEvent): void {
    if (!gameInput.clientOptions?.event) {
      throw new Error("Please select an event to claim");
    }

    const event = Event.fromName(gameInput.clientOptions.event);
    const canPlayErr = event.canPlayCheck(this, gameInput);
    if (canPlayErr) {
      throw new Error(canPlayErr);
    }

    const player = this.getActivePlayer();
    if (event.type === EventType.WONDER) {
      this.addGameLog([player, " claimed ", event, "."]);
    } else {
      this.addGameLog([player, " claimed the ", event, " event."]);
    }

    event.play(this, gameInput);
    this.eventsMap[event.name] = this._activePlayerId;
  }

  private handleVisitDestinationCardGameInput(
    gameInput: GameInputVisitDestinationCard
  ): void {
    const playedCard = gameInput.clientOptions.playedCard;
    if (!playedCard) {
      throw new Error("Please select a card to visit");
    }
    const cardOwner = this.getPlayer(playedCard.cardOwnerId);
    const origPlayedCard = cardOwner.findPlayedCard(
      playedCard,
      false /* withWorker */
    );
    if (!origPlayedCard) {
      throw new Error(
        `Could not find played card: ${JSON.stringify(playedCard, null, 2)}`
      );
    }

    const card = Card.fromName(origPlayedCard.cardName);
    const activePlayer = this.getActivePlayer();

    const canPlayErr = card.canPlayCheck(this, gameInput);
    if (canPlayErr) {
      throw new Error(canPlayErr);
    }

    this.addGameLog([
      activePlayer,
      " place a worker on ",
      ...workerPlacementToGameText({ playedCard }),
      ".",
    ]);

    activePlayer.placeWorkerOnCard(this, origPlayedCard);

    // If card isn't owned by active player, pay the other player a VP
    if (cardOwner.playerId !== activePlayer.playerId) {
      cardOwner.gainResources(this, { [ResourceType.VP]: 1 });
      this.addGameLog([
        cardOwner,
        " gained 1 VP when ",
        activePlayer,
        " placed a worker on ",
        ...workerPlacementToGameText({ playedCard }),
        ".",
      ]);
    }

    // Take card's effect
    card.play(this, gameInput);
  }

  private handlePlayAdornmentGameInput(
    gameInput: GameInputPlayAdornment
  ): void {
    if (!gameInput.clientOptions?.adornment) {
      throw new Error("Please select an adornment to play");
    }

    const adornment = Adornment.fromName(gameInput.clientOptions.adornment);

    const player = this.getActivePlayer();

    const canPlayErr = adornment.canPlayCheck(this, gameInput);
    if (canPlayErr) {
      throw new Error(canPlayErr);
    }

    this.addGameLog([player, " played ", adornment, "."]);

    adornment.play(this, gameInput);
    player.spendResources({ [ResourceType.PEARL]: 1 });
    player.playedAdornments.push(adornment.name);
    const idx = player.adornmentsInHand.indexOf(adornment.name);
    if (idx === -1) {
      throw new Error(`${adornment.name} isn't in player's hand`);
    } else {
      player.adornmentsInHand.splice(idx, 1);
    }
  }

  private handlePlaceAmbassador(gameInput: GameInputPlaceAmbassador): void {
    if (!this.gameOptions.pearlbrook) {
      throw new Error(
        "Unexpected action, not playing with the Pearlbook expansion."
      );
    }

    const player = this.getActivePlayer();
    if (!player.hasUnusedAmbassador()) {
      throw new Error("No unused ambassador");
    }

    const loc = gameInput.clientOptions.loc;
    if (!loc) {
      throw new Error("Please select an Ambassador location");
    }

    if (loc.type === "spot") {
      const riverDestinationMap = this.riverDestinationMap;
      if (!riverDestinationMap) {
        throw new Error("Game does not have river destinations");
      }
      const riverDestinationSpotName = loc.spot;
      if (!riverDestinationSpotName) {
        throw new Error("Please select a river destination spot to visit");
      }
      const canVisitErr = riverDestinationMap.canVisitSpotCheck(
        this,
        riverDestinationSpotName
      );
      if (canVisitErr) {
        throw new Error(canVisitErr);
      }
      riverDestinationMap.visitSpot(this, gameInput, riverDestinationSpotName);
    } else if (loc.type === "card") {
      const playedCard = loc.playedCard;
      if (!playedCard) {
        throw new Error("Please select a card to place your ambassador on");
      }
      const cardOwner = this.getPlayer(playedCard.cardOwnerId);
      const origPlayedCard = cardOwner.findPlayedCard(playedCard);
      if (!origPlayedCard) {
        throw new Error(
          `Could not find played card: ${JSON.stringify(playedCard, null, 2)}`
        );
      }

      if (origPlayedCard.ambassador) {
        throw new Error("Card already has an ambassador on it");
      }

      const card = Card.fromName(origPlayedCard.cardName);
      const activePlayer = this.getActivePlayer();
      const canPlayErr = card.canPlayCheck(this, gameInput);
      if (canPlayErr) {
        throw new Error(canPlayErr);
      }

      this.addGameLog([
        activePlayer,
        " place their ambassador on ",
        ...workerPlacementToGameText({ playedCard }),
        ".",
      ]);

      // If card isn't owned by active player, pay the other player a VP
      if (cardOwner.playerId !== activePlayer.playerId) {
        cardOwner.gainResources(this, { [ResourceType.VP]: 1 });
        this.addGameLog([
          cardOwner,
          " gained 1 VP when ",
          activePlayer,
          " placed their ambassador on ",
          ...workerPlacementToGameText({ playedCard }),
          ".",
        ]);
      }

      cardOwner.updatePlayedCard(this, origPlayedCard, {
        ambassador: player.playerId,
      });

      // Take card's effect
      card.play(this, gameInput);
    } else {
      assertUnreachable(loc, loc);
    }

    player.useAmbassador();
  }

  handleWorkerPlacementGameInput(
    gameInput: GameInputWorkerPlacementTypes
  ): void {
    switch (gameInput.inputType) {
      case GameInputType.CLAIM_EVENT:
        this.handleClaimEventGameInput(gameInput);
        break;
      case GameInputType.PLACE_WORKER:
        this.handlePlaceWorkerGameInput(gameInput);
        break;
      case GameInputType.VISIT_DESTINATION_CARD:
        this.handleVisitDestinationCardGameInput(gameInput);
        break;
      default:
        assertUnreachable(
          gameInput,
          `Unhandled worker placement game input: ${JSON.stringify(gameInput)}`
        );
    }
  }

  handlePrepareForSeason(gameInput: GameInputPrepareForSeason): void {
    const player = this.getActivePlayer();
    if (player.numAvailableWorkers !== 0) {
      throw new Error("Still have available workers");
    }
    if (player.playerStatus !== PlayerStatus.DURING_SEASON) {
      throw new Error(`Unexpected playerStatus: ${player.playerStatus}`);
    }

    this.addGameLog([player, " took the prepare for season action."]);

    player.playerStatus = PlayerStatus.PREPARING_FOR_SEASON;

    if (player.hasCardInCity(CardName.CLOCK_TOWER)) {
      const clocktower = Card.fromName(CardName.CLOCK_TOWER);
      clocktower.play(this, gameInput);
    }
  }

  private prepareForSeason(player: Player, gameInput: GameInput): void {
    if (
      player.currentSeason === Season.WINTER ||
      player.currentSeason === Season.SUMMER
    ) {
      const productionCards = player
        .getAllPlayedCardsByType(CardType.PRODUCTION)
        .map(({ cardName }) => cardName);
      this.addGameLog([
        { type: "em", text: "Prepare for season" },
        ": ",
        player,
        " activated PRODUCTION",
        ...(productionCards.length === 0
          ? []
          : [" on ", ...cardListToGameText(productionCards), ""]),
        ".",
      ]);
      player.activateProduction(this, gameInput);
    } else {
      // if the player is at max hand size, don't make them
      // draw/discard cards from the meadow
      if (player.cardsInHand.length < player.maxHandSize) {
        const cardsToTake =
          player.cardsInHand.length === player.maxHandSize - 1 ? 1 : 2;

        this.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          label: `Select ${cardsToTake} CARD from the Meadow`,
          prevInputType: GameInputType.PREPARE_FOR_SEASON,
          cardOptions: this.meadowCards,
          maxToSelect: cardsToTake,
          minToSelect: cardsToTake,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else {
        this.addGameLog([
          { type: "em", text: "Prepare for season" },
          ": ",
          player,
          " did not select any cards from the Meadow.",
        ]);
      }
    }

    player.playerStatus = PlayerStatus.DURING_SEASON;
    player.recallWorkers(this);
    this.addGameLog([
      { type: "em", text: "Prepare for season" },
      ": ",
      player,
      " recalled their workers.",
    ]);

    if (this.gameOptions.pearlbrook) {
      if (!player.hasUnusedAmbassador()) {
        this.addGameLog([
          { type: "em", text: "Prepare for season" },
          ": ",
          player,
          " recalled their ambassador.",
        ]);
        player.recallAmbassador(this);
      }
    }

    player.nextSeason();
    this.addGameLog([
      { type: "em", text: "Prepare for season" },
      ": ",
      player,
      " is now in ",
      { type: "em", text: player.currentSeason },
      ".",
    ]);
  }

  private handleGameEndGameInput(gameInput: GameInputGameEnd): void {
    const player = this.getActivePlayer();
    if (player.currentSeason !== Season.AUTUMN) {
      throw new Error("Cannot end game unless you're in Autumn");
    }
    player.playerStatus = PlayerStatus.GAME_ENDED;
    this.addGameLog([player, ` took the game end action.`]);
  }

  next(gameInput: GameInput, autoAdvance = true): GameState {
    return this.clone().nextInner(gameInput, autoAdvance);
  }

  addPlayedGameInput(gameInput: GameInput): void {
    this.playedGameInputs.push(gameInput);
  }

  private nextInner(gameInput: GameInput, autoAdvance = true): GameState {
    if (this.pendingGameInputs.length !== 0) {
      this.removeMultiStepGameInput(gameInput as any);
    }

    this.addPlayedGameInput(gameInput);

    switch (gameInput.inputType) {
      case GameInputType.SELECT_CARDS:
      case GameInputType.SELECT_PLAYED_CARDS:
      case GameInputType.SELECT_LOCATION:
      case GameInputType.SELECT_PAYMENT_FOR_CARD:
      case GameInputType.SELECT_WORKER_PLACEMENT:
      case GameInputType.SELECT_PLAYER:
      case GameInputType.SELECT_RESOURCES:
      case GameInputType.DISCARD_CARDS:
      case GameInputType.SELECT_OPTION_GENERIC:
      case GameInputType.SELECT_PLAYED_ADORNMENT:
      case GameInputType.SELECT_RIVER_DESTINATION:
        this.handleMultiStepGameInput(gameInput);
        break;
      case GameInputType.PLAY_CARD:
        this.handlePlayCardGameInput(gameInput);
        break;
      case GameInputType.PLACE_WORKER:
      case GameInputType.VISIT_DESTINATION_CARD:
      case GameInputType.CLAIM_EVENT:
        this.handleWorkerPlacementGameInput(gameInput);
        break;
      case GameInputType.PLAY_ADORNMENT:
        this.handlePlayAdornmentGameInput(gameInput);
        break;
      case GameInputType.PLACE_AMBASSADOR:
        this.handlePlaceAmbassador(gameInput);
        break;
      case GameInputType.PREPARE_FOR_SEASON:
        this.handlePrepareForSeason(gameInput);
        break;
      case GameInputType.GAME_END:
        this.handleGameEndGameInput(gameInput);
        break;
      default:
        assertUnreachable(
          gameInput,
          `Unhandled game input: ${JSON.stringify(gameInput)}`
        );
    }

    const player = this.getActivePlayer();

    // A player is preparing for season, complete that first.
    if (
      this.pendingGameInputs.length === 0 &&
      player.playerStatus === PlayerStatus.PREPARING_FOR_SEASON
    ) {
      this.prepareForSeason(player, gameInput);
    }

    // A player played a card, resolve triggered effects
    if (
      this.pendingGameInputs.length === 0 &&
      this.playedGameInputs.length !== 0
    ) {
      const playedGameInputs = [...this.playedGameInputs];
      this.playedGameInputs = [];
      player.handlePlayedGameInputs(this, playedGameInputs);
    }

    // If there are no more pending game inputs go to the next player.
    if (this.pendingGameInputs.length === 0) {
      this.nextPlayer();
    }

    this.handleGameOver();

    if (autoAdvance) {
      return this.maybeAutoAdvance();
    }

    return this;
  }

  private maybeAutoAdvance(): GameState {
    // Check if we can advance any select player inputs.
    const selectPlayerInputs = this.pendingGameInputs.find((input) => {
      return input.inputType === GameInputType.SELECT_PLAYER;
    });
    const selectPlayerGameInput =
      selectPlayerInputs && this.getAutoAdvanceInput(selectPlayerInputs);
    if (selectPlayerGameInput) {
      return this.next(selectPlayerGameInput);
    }

    // Check if we can advance other types of inputs.
    const pendingInputs = this.pendingGameInputs.map((input) => {
      return this.getAutoAdvanceInput(input);
    });
    if (pendingInputs.every(Boolean) && this.pendingGameInputs.length !== 0) {
      return this.next(pendingInputs[0]!);
    }
    return this;
  }

  private getAutoAdvanceInput(
    pendingInput: GameInputMultiStep
  ): GameInputMultiStep | null {
    const player = this.getActivePlayer();
    if (
      pendingInput.inputType === GameInputType.SELECT_PLAYER &&
      pendingInput.playerOptions.length === 1 &&
      pendingInput.mustSelectOne
    ) {
      return {
        ...pendingInput,
        clientOptions: {
          selectedPlayer: pendingInput.playerOptions[0],
        },
      };
    }
    if (
      pendingInput.inputType === GameInputType.DISCARD_CARDS &&
      pendingInput.minCards === player.cardsInHand.length
    ) {
      return {
        ...pendingInput,
        clientOptions: { cardsToDiscard: player.cardsInHand },
        isAutoAdvancedInput: true,
      };
    }

    if (
      pendingInput.inputType === GameInputType.SELECT_PLAYED_CARDS &&
      pendingInput.cardOptions.length === pendingInput.minToSelect
    ) {
      return {
        ...pendingInput,
        clientOptions: { selectedCards: pendingInput.cardOptions },
      };
    }

    if (
      pendingInput.inputType === GameInputType.SELECT_RIVER_DESTINATION &&
      pendingInput.options.length === 1
    ) {
      return {
        ...pendingInput,
        clientOptions: { riverDestination: pendingInput.options[0] },
      };
    }

    if (
      pendingInput.inputType === GameInputType.SELECT_CARDS &&
      pendingInput.cardOptions.length === pendingInput.minToSelect
    ) {
      return {
        ...pendingInput,
        clientOptions: { selectedCards: pendingInput.cardOptions },
      };
    }

    if (
      pendingInput.inputType === GameInputType.SELECT_WORKER_PLACEMENT &&
      pendingInput.mustSelectOne &&
      pendingInput.options.length === 1
    ) {
      return {
        ...pendingInput,
        clientOptions: { selectedOption: pendingInput.options[0] },
      };
    }

    if (
      pendingInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
      pendingInput.options.length === 1
    ) {
      return {
        ...pendingInput,
        clientOptions: {
          selectedOption: pendingInput.options[0],
        },
      };
    }

    if (
      pendingInput.inputType === GameInputType.SELECT_RESOURCES &&
      pendingInput.toSpend
    ) {
      if (
        pendingInput.specificResource &&
        player.getNumResourcesByType(pendingInput.specificResource) == 0
      ) {
        return {
          ...pendingInput,
          isAutoAdvancedInput: true,
        };
      } else if (player.getNumCardCostResources() == 0) {
        return {
          ...pendingInput,
          isAutoAdvancedInput: true,
        };
      } else if (
        !pendingInput.specificResource &&
        !pendingInput.excludeResource &&
        pendingInput.minResources === pendingInput.maxResources &&
        player.getNumCardCostResources() === pendingInput.minResources
      ) {
        return {
          ...pendingInput,
          clientOptions: {
            resources: player.getCardCostResources(),
          },
          isAutoAdvancedInput: true,
        };
      }
    }

    return null;
  }

  private handleGameOver(): void {
    if (this.isGameOver()) {
      this.addGameLog("Game over");

      this.players.forEach((player) => {
        this.addGameLog([player, ` has ${player.getPoints(this)} points.`]);
      });
    }
  }

  private playCardInputLog(
    gameInput: GameInputPlayCard
  ): Parameters<typeof toGameText>[0] {
    const player = this.getActivePlayer();
    const card = Card.fromName(gameInput.clientOptions.card!);
    const ret = [player, " played ", card];

    const paymentOptions = gameInput.clientOptions.paymentOptions;
    if (paymentOptions.useAssociatedCard) {
      ret.push(
        " by occupying ",
        card.associatedCard &&
          player.hasUnoccupiedConstruction(card.associatedCard)
          ? Card.fromName(card.associatedCard)
          : player.hasUnoccupiedConstruction(CardName.EVERTREE)
          ? Card.fromName(CardName.EVERTREE)
          : "??"
      );
    } else if (paymentOptions.cardToUse) {
      ret.push(" using ", Card.fromName(paymentOptions.cardToUse));
    } else if (paymentOptions.cardToDungeon) {
      ret.push(
        " by adding ",
        Card.fromName(paymentOptions.cardToDungeon),
        " to ",
        Card.fromName(CardName.DUNGEON)
      );
    }
    ret.push(".");
    return ret;
  }

  static fromJSON(gameStateJSON: GameStateJSON): GameState {
    return new GameState({
      ...gameStateJSON,
      deck: CardStack.fromJSON(gameStateJSON.deck),
      discardPile: CardStack.fromJSON(gameStateJSON.discardPile),
      players: gameStateJSON.players.map((pJSON: any) =>
        Player.fromJSON(pJSON)
      ),
      adornmentsPile: gameStateJSON.adornmentsPile
        ? CardStack.fromJSON(gameStateJSON.adornmentsPile)
        : null,
      riverDestinationMap: gameStateJSON.riverDestinationMap
        ? RiverDestinationMap.fromJSON(gameStateJSON.riverDestinationMap)
        : null,
    });
  }

  static initialGameState({
    players,
    gameOptions = {},
    shuffleDeck = true,
  }: {
    players: Player[];
    gameOptions: Partial<GameOptions>;
    shuffleDeck?: boolean;
  }): GameState {
    if (players.length < 2) {
      throw new Error(`Unable to create a game with ${players.length} players`);
    }

    const gameOptionsWithDefaults = defaultGameOptions(gameOptions);
    const withPearlbrook = gameOptionsWithDefaults.pearlbrook;
    const gameState = new GameState({
      gameStateId: 1,
      players,
      meadowCards: [],
      deck: initialDeck(gameOptionsWithDefaults),
      discardPile: discardPile(),
      locationsMap: initialLocationsMap(
        players.length,
        gameOptionsWithDefaults
      ),
      adornmentsPile: withPearlbrook ? allAdornments() : null,
      riverDestinationMap: withPearlbrook ? initialRiverDestinationMap() : null,
      eventsMap: initialEventMap(gameOptionsWithDefaults),
      gameOptions: gameOptionsWithDefaults,
      gameLog: [],
      pendingGameInputs: [],
    });

    gameState.addGameLog(`Game created with ${players.length} players.`);
    if (withPearlbrook) {
      gameState.addGameLog([
        `Playing with the `,
        { type: "em", text: "Pearlbrook" },
        ` expansion.`,
      ]);
    }

    if (shuffleDeck) {
      if (withPearlbrook) {
        gameState.adornmentsPile!.shuffle();
      }
      gameState.deck.shuffle();
    }

    // Players draw cards
    players.forEach((p, idx) => {
      if (withPearlbrook) {
        p.recallAmbassador(gameState);
        p.adornmentsInHand.push(
          gameState.adornmentsPile!.drawInner(),
          gameState.adornmentsPile!.drawInner()
        );
      }
      p.drawCards(gameState, STARTING_PLAYER_HAND_SIZE + idx);
    });

    gameState.replenishMeadow();
    gameState.addGameLog(`Dealing cards to each player.`);
    gameState.addGameLog(`Dealing cards to the Meadow.`);
    if (withPearlbrook) {
      gameState.addGameLog(`Dealing 2 adornment cards to each player.`);
    }

    return gameState;
  }

  getActivePlayer(): Player {
    return this.getPlayer(this.activePlayerId);
  }

  getPlayer(playerId: string): Player {
    const ret = this.players.find((player) => player.playerId === playerId);
    if (!ret) {
      throw new Error(`Unable to find player: ${playerId}`);
    }
    return ret;
  }

  drawCard(): CardName {
    if (!this.deck.isEmpty) {
      return this.deck.drawInner();
    }

    while (!this.discardPile.isEmpty) {
      this.deck.addToStack(this.discardPile.drawInner());
    }

    this.deck.shuffle();
    if (!this.deck.isEmpty) {
      return this.drawCard();
    }

    throw new Error("No more cards to draw");
  }

  getClaimableEvents = (): EventName[] => {
    const keys = (Object.keys(this.eventsMap) as unknown) as EventName[];
    return keys.filter((eventName) => {
      const event = Event.fromName(eventName);
      return event.canPlay(this, {
        inputType: GameInputType.CLAIM_EVENT,
        clientOptions: {
          event: eventName,
        },
      });
    });
  };

  getPlayableLocations = (
    { checkCanPlaceWorker }: { checkCanPlaceWorker: boolean } = {
      checkCanPlaceWorker: true,
    }
  ): LocationName[] => {
    const keys = (Object.keys(this.locationsMap) as unknown) as LocationName[];
    return keys.filter((locationName) => {
      const location = Location.fromName(locationName);
      const gameInput = {
        inputType: GameInputType.PLACE_WORKER as const,
        clientOptions: {
          location: locationName,
        },
      };
      if (!checkCanPlaceWorker) {
        return !location.canPlayCheck(this, gameInput);
      }
      return location.canPlay(this, gameInput);
    });
  };

  getPlayableAmbassadorLocations(): AmbassadorPlacementInfo[] {
    const riverDestinationMap = this.riverDestinationMap;
    if (!riverDestinationMap || !this.gameOptions.pearlbrook) {
      throw new Error("Only playable with Pearlbrook.");
    }
    const ret: AmbassadorPlacementInfo[] = [];
    riverDestinationMap.forEachSpot((spot) => {
      if (!riverDestinationMap.canVisitSpotCheck(this, spot)) {
        ret.push({ type: "spot", spot });
      }
    });

    const card = Card.fromName(CardName.FERRY);
    if (
      card.canPlay(this, {
        inputType: GameInputType.PLACE_AMBASSADOR,
        clientOptions: { loc: null },
      })
    ) {
      this.players.forEach((player) => {
        player.getPlayedCardForCardName(card.name).forEach((playedCard) => {
          if (!playedCard.ambassador) {
            ret.push({ type: "card", playedCard });
          }
        });
      });
    }
    return ret;
  }

  getPlayableAdornments(): AdornmentName[] {
    const player = this.getActivePlayer();
    return player.adornmentsInHand.filter((name) => {
      return Adornment.fromName(name).canPlay(this, {
        inputType: GameInputType.PLAY_ADORNMENT,
        clientOptions: { adornment: name },
      });
    });
  }

  getVisitableDestinationCards = (): PlayedCardInfo[] => {
    const activePlayer = this.getActivePlayer();
    const ret = [...activePlayer.getAvailableClosedDestinationCards()];
    this.players.forEach((player) => {
      ret.push(...player.getAvailableOpenDestinationCards());
    });
    return ret.filter((playedCard) => {
      const card = Card.fromName(playedCard.cardName);
      return card.canPlay(this, {
        inputType: GameInputType.VISIT_DESTINATION_CARD,
        clientOptions: {
          playedCard,
        },
      });
    });
  };

  getPlayableCards(): { card: CardName; fromMeadow: boolean }[] {
    const player = this.getActivePlayer();
    const ret: { card: CardName; fromMeadow: boolean }[] = [];

    this.meadowCards.forEach((cardName) => {
      const card = Card.fromName(cardName);
      if (
        player.canAffordCard(card.name, true) &&
        card.canPlayIgnoreCostAndSource(this, false /* strict */)
      ) {
        ret.push({ card: cardName, fromMeadow: true });
      }
    });
    player.cardsInHand.forEach((cardName) => {
      const card = Card.fromName(cardName);
      if (
        player.canAffordCard(card.name, true) &&
        card.canPlayIgnoreCostAndSource(this, false /* strict */)
      ) {
        ret.push({ card: cardName, fromMeadow: false });
      }
    });
    return ret;
  }

  getPossibleGameInputs(): GameInput[] {
    if (this.isGameOver()) {
      return [];
    }

    if (this.pendingGameInputs.length !== 0) {
      return this.pendingGameInputs;
    }

    const player = this.getActivePlayer();
    const possibleGameInputs: GameInput[] = [];

    if (player.numAvailableWorkers > 0) {
      if (this.getPlayableLocations().length !== 0) {
        possibleGameInputs.push({
          inputType: GameInputType.PLACE_WORKER,
          clientOptions: {
            location: null,
          },
        });
      }
      if (this.getVisitableDestinationCards().length !== 0) {
        possibleGameInputs.push({
          inputType: GameInputType.VISIT_DESTINATION_CARD,
          clientOptions: {
            playedCard: null,
          },
        });
      }
      if (this.getClaimableEvents().length !== 0) {
        possibleGameInputs.push({
          inputType: GameInputType.CLAIM_EVENT,
          clientOptions: {
            event: null,
          },
        });
      }
    } else if (player.currentSeason !== Season.AUTUMN) {
      possibleGameInputs.push({
        inputType: GameInputType.PREPARE_FOR_SEASON,
      });
    } else {
      possibleGameInputs.push({
        inputType: GameInputType.GAME_END,
      });
    }

    if (this.getPlayableCards().length !== 0) {
      possibleGameInputs.push({
        inputType: GameInputType.PLAY_CARD,
        clientOptions: {
          card: null,
          fromMeadow: false,
          paymentOptions: {
            resources: {},
          },
        },
      });
    }

    if (this.gameOptions.pearlbrook) {
      if (player.hasUnusedAmbassador()) {
        if (this.getPlayableAmbassadorLocations().length !== 0) {
          possibleGameInputs.push({
            inputType: GameInputType.PLACE_AMBASSADOR,
            clientOptions: {
              loc: null,
            },
          });
        }
      }
      if (this.getPlayableAdornments().length !== 0) {
        possibleGameInputs.push({
          inputType: GameInputType.PLAY_ADORNMENT,
          clientOptions: {
            adornment: null,
          },
        });
      }
    }

    return possibleGameInputs;
  }
}

export type GameStatePlayFn = (
  gameState: GameState,
  gameInput: GameInput
) => void;

export type GameStateCanPlayCheckFn = (
  gameState: GameState,
  gameInput: GameInput
) => string | null;

export type GameStateCanPlayFn = (
  gameState: GameState,
  gameInput: GameInput
) => boolean;

export type GameStatePointsFn = (
  player: Player,
  gameState: GameState
) => number;

export interface GameStatePlayable {
  canPlay: GameStateCanPlayFn;
  canPlayCheck: GameStateCanPlayCheckFn;
  play: GameStatePlayFn;
  getPoints: GameStatePointsFn;
}
