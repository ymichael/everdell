import {
  GameOptions,
  ExpansionType,
  CardName,
  CardType,
  EventType,
  EventName,
  EventNameToPlayerId,
  GameInput,
  GameInputType,
  PlayedCardInfo,
  PlayedEventInfo,
  ResourceType,
  GameText,
  TextPartEntity,
  IGameTextEntity,
  WonderCost,
} from "./types";
import { Card } from "./card";
import {
  GameState,
  GameStatePlayable,
  GameStatePlayFn,
  GameStateCanPlayCheckFn,
} from "./gameState";
import { sumResources, GainMoreThan1AnyResource } from "./gameStatePlayHelpers";
import shuffle from "lodash/shuffle";
import {
  toGameText,
  cardListToGameText,
  resourceMapToGameText,
  workerPlacementToGameText,
} from "./gameText";

export class Event implements GameStatePlayable, IGameTextEntity {
  readonly playInner: GameStatePlayFn | undefined;
  readonly playedEventInfoInner: (() => PlayedEventInfo) | undefined;
  readonly pointsInner:
    | ((gameState: GameState, playerId: string) => number)
    | undefined;

  readonly name: EventName;
  readonly shortName: GameText | undefined;
  readonly expansion: ExpansionType | null;
  readonly type: EventType;
  readonly baseVP: number;
  readonly requiredCards: CardName[] | undefined;
  readonly eventRequirementsDescription: GameText | undefined;
  readonly eventDescription: GameText | undefined;
  // every event has requirements to play,
  // but not all events result in an action when played
  readonly canPlayCheckInner: GameStateCanPlayCheckFn | undefined;

  readonly wonderCost: WonderCost | undefined; // used for Pearlbrook's wonders

  constructor({
    name,
    type,
    baseVP,
    shortName,
    requiredCards,
    eventDescription,
    eventRequirementsDescription,
    playInner, // called when the card is played
    canPlayCheckInner, // called when we check canPlay function
    playedEventInfoInner, // used for cards that accumulate other cards or resources
    pointsInner, // computed if specified + added to base points
    expansion = null,
    wonderCost,
  }: {
    name: EventName;
    type: EventType;
    baseVP: number;
    expansion?: ExpansionType | null;
    shortName?: GameText | undefined;
    requiredCards?: CardName[];
    eventDescription?: GameText;
    eventRequirementsDescription?: GameText;
    canPlayCheckInner?: GameStateCanPlayCheckFn;
    playInner?: GameStatePlayFn;
    playedEventInfoInner?: () => PlayedEventInfo;
    pointsInner?: (gameState: GameState, playerId: string) => number;
    wonderCost?: WonderCost;
  }) {
    this.name = name;
    this.type = type;
    this.expansion = expansion;
    this.baseVP = baseVP;
    this.requiredCards = requiredCards;
    this.eventDescription = eventDescription;
    this.eventRequirementsDescription = eventRequirementsDescription;
    this.canPlayCheckInner = canPlayCheckInner;
    this.playInner = playInner;
    this.playedEventInfoInner = playedEventInfoInner;
    this.pointsInner = pointsInner;
    this.shortName = shortName;
    this.wonderCost = wonderCost;
  }

  getGameTextPart(): TextPartEntity {
    return {
      type: "entity",
      entityType: "event",
      event: this.name,
    };
  }

  getShortName(): GameText {
    if (this.shortName) {
      return this.shortName;
    }
    if (this.eventRequirementsDescription) {
      return this.eventRequirementsDescription;
    }
    if (this.requiredCards) {
      return [
        { type: "text", text: this.requiredCards[0] },
        { type: "text", text: ", " },
        { type: "text", text: this.requiredCards[1] },
      ];
    }
    return [{ type: "text", text: this.name }];
  }

  canPlay(gameState: GameState, gameInput: GameInput): boolean {
    return !this.canPlayCheck(gameState, gameInput);
  }

  canPlayCheck(gameState: GameState, gameInput: GameInput): string | null {
    const player = gameState.getActivePlayer();

    // Check whether the event is in the game
    if (!(this.name in gameState.eventsMap)) {
      return `Event ${
        this.name
      } is not part of the current game. \nGame Events: ${JSON.stringify(
        gameState.eventsMap,
        null,
        2
      )}`;
    }

    if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
      // Check whether the event has been claimed
      if (gameState.eventsMap[this.name]) {
        return `Event ${this.name} is already claimed by ${JSON.stringify(
          gameState.eventsMap[this.name],
          null,
          2
        )}`;
      }

      // Check whether the active player has available workers
      if (player.numAvailableWorkers <= 0) {
        return `Active player (${player.playerId}) doesn't have any workers to place.`;
      }

      // Check whether player has required cards, if any
      if (this.requiredCards) {
        for (let i = 0; i < this.requiredCards.length; i++) {
          if (!player.hasCardInCity(this.requiredCards[i])) {
            return `Need to have played ${this.requiredCards[i]} to claim event ${this.name}`;
          }
        }
      }

      // For wonders, check whether player can pay wonder cost
      if (this.wonderCost) {
        const resourcesNeeded = this.wonderCost.resources;
        const cardsNeeded = this.wonderCost.numCardsToDiscard;
        const playerResources = player.getResources();

        if (
          playerResources[ResourceType.TWIG] <
            resourcesNeeded[ResourceType.TWIG] ||
          playerResources[ResourceType.RESIN] <
            resourcesNeeded[ResourceType.RESIN] ||
          playerResources[ResourceType.PEBBLE] <
            resourcesNeeded[ResourceType.PEBBLE] ||
          playerResources[ResourceType.PEARL] <
            resourcesNeeded[ResourceType.PEARL]
        ) {
          return `Player doesn't have enough resources to pay for Wonder`;
        }

        if (player.cardsInHand.length < cardsNeeded) {
          return `Player doesn't have enough cards to discard for Wonder`;
        }
      }
    }

    // check whether player meets criteria for playing event other than played cards
    if (this.canPlayCheckInner) {
      const errorMsg = this.canPlayCheckInner(gameState, gameInput);
      if (errorMsg) {
        return errorMsg;
      }
    }
    return null;
  }

  play(gameState: GameState, gameInput: GameInput): void {
    const canPlayError = this.canPlayCheck(gameState, gameInput);
    if (canPlayError) {
      throw new Error(canPlayError);
    }

    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
      player.placeWorkerOnEvent(this.name);
    }
    this.playEventEffects(gameState, gameInput);
  }

  playEventEffects(gameState: GameState, gameInput: GameInput): void {
    if (this.playInner) {
      this.playInner(gameState, gameInput);
    }
  }

  getPlayedEventInfo(): PlayedEventInfo {
    return this.playedEventInfoInner ? this.playedEventInfoInner() : {};
  }

  getPoints(gameState: GameState, playerId: string): number {
    return (
      this.baseVP +
      (this.pointsInner ? this.pointsInner(gameState, playerId) : 0)
    );
  }

  static fromName(name: EventName): Event {
    if (oldEventEnums[name]) {
      const oldName = oldEventEnums[name];
      if (oldName in EventName) {
        name = EventName[oldName as keyof typeof EventName];
      }
    }
    return EVENT_REGISTRY[name];
  }

  static byType(type: EventType): EventName[] {
    return ((Object.entries(EVENT_REGISTRY) as unknown) as [EventName, Event][])
      .filter(([_, event]) => {
        return event.type === type;
      })
      .map(([name, _]) => {
        return name;
      });
  }
}

// We previously had EventName be UPPERCASED string, so we have some games
// in the db that store these strings in the game state. Hardcoding these here
// so we don't break those games.
// 1/14/2021
export const oldEventEnums: Record<any, any> = {
  "FOUR PRODUCTION CARDS": "BASIC_FOUR_PRODUCTION",
  "THREE DESTINATION CARDS": "BASIC_THREE_DESTINATION",
  "THREE GOVERNANCE CARDS": "BASIC_THREE_GOVERNANCE",
  "THREE TRAVELER CARDS": "BASIC_THREE_TRAVELER",
  "GRADUATION OF SCHOLARS": "SPECIAL_GRADUATION_OF_SCHOLARS",
  "A BRILLIANT MARKETING PLAN": "SPECIAL_A_BRILLIANT_MARKETING_PLAN",
  "PERFORMER IN RESIDENCE": "SPECIAL_PERFORMER_IN_RESIDENCE",
  "CAPTURE OF THE ACORN THIEVES": "SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES",
  "MINISTERING TO MISCREANTS": "SPECIAL_MINISTERING_TO_MISCREANTS",
  "CROAK WART CURE": "SPECIAL_CROAK_WART_CURE",
  "AN EVENING OF FIREWORKS": "SPECIAL_AN_EVENING_OF_FIREWORKS",
  "A WEE RUN CITY": "SPECIAL_A_WEE_RUN_CITY",
  "TAX RELIEF": "SPECIAL_TAX_RELIEF",
  "UNDER NEW MANAGEMENT": "SPECIAL_UNDER_NEW_MANAGEMENT",
  "ANCIENT SCROLLS DISCOVERED": "SPECIAL_ANCIENT_SCROLLS_DISCOVERED",
  "FLYING DOCTOR SERVICE": "SPECIAL_FLYING_DOCTOR_SERVICE",
  "PATH OF THE PILGRIMS": "SPECIAL_PATH_OF_THE_PILGRIMS",
  "REMEMBERING THE FALLEN": "SPECIAL_REMEMBERING_THE_FALLEN",
  "PRISTINE CHAPEL CEILING": "SPECIAL_PRISTINE_CHAPEL_CEILING",
  "THE EVERDELL GAMES": "SPECIAL_THE_EVERDELL_GAMES",
};

const EVENT_REGISTRY: Record<EventName, Event> = {
  [EventName.BASIC_FOUR_PRODUCTION]: new Event({
    name: EventName.BASIC_FOUR_PRODUCTION,
    type: EventType.BASIC,
    baseVP: 3,
    eventRequirementsDescription: toGameText("4 PRODUCTION"),
    canPlayCheckInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      if (player.getNumCardType(CardType.PRODUCTION) < 4) {
        return `Need at least 4 ${CardType.PRODUCTION} cards to claim event`;
      }
      return null;
    },
  }),
  [EventName.BASIC_THREE_DESTINATION]: new Event({
    name: EventName.BASIC_THREE_DESTINATION,
    type: EventType.BASIC,
    baseVP: 3,
    eventRequirementsDescription: toGameText("3 DESTINATION"),
    canPlayCheckInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      if (player.getNumCardType(CardType.DESTINATION) < 3) {
        return `Need at least 3 ${CardType.DESTINATION} cards to claim event`;
      }
      return null;
    },
  }),
  [EventName.BASIC_THREE_GOVERNANCE]: new Event({
    name: EventName.BASIC_THREE_GOVERNANCE,
    type: EventType.BASIC,
    baseVP: 3,
    eventRequirementsDescription: toGameText("3 GOVERNANCE"),
    canPlayCheckInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      if (player.getNumCardType(CardType.GOVERNANCE) < 3) {
        return `Need at least 3 ${CardType.GOVERNANCE} cards to claim event`;
      }
      return null;
    },
  }),
  [EventName.BASIC_THREE_TRAVELER]: new Event({
    name: EventName.BASIC_THREE_TRAVELER,
    type: EventType.BASIC,
    baseVP: 3,
    eventRequirementsDescription: toGameText("3 TRAVELER"),
    canPlayCheckInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      if (player.getNumCardType(CardType.TRAVELER) < 3) {
        return `Need at least 3 ${CardType.TRAVELER} cards to claim event`;
      }
      return null;
    },
  }),

  [EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN]: new Event({
    name: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.SHOPKEEPER, CardName.POST_OFFICE],
    eventDescription: toGameText([
      "When achieved, you may give opponents up to a total of 3 ANY",
      { type: "BR" },
      "For each donation gain 2 VP.",
    ]),
    playedEventInfoInner: () => ({
      storedResources: {
        [ResourceType.VP]: 0,
      },
    }),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.CLAIM_EVENT ||
        (gameInput.inputType === GameInputType.SELECT_RESOURCES &&
          gameInput.prevInput &&
          gameInput.prevInput.inputType === GameInputType.SELECT_PLAYER)
      ) {
        let maxResources = 3;
        if (
          gameInput.inputType === GameInputType.SELECT_RESOURCES &&
          gameInput.prevInput &&
          gameInput.prevInput.inputType === GameInputType.SELECT_PLAYER
        ) {
          const resources = gameInput.clientOptions.resources;
          const numResources = sumResources(resources);
          if (numResources > gameInput.maxResources) {
            throw new Error(
              "Cannot give more than {gameInput.clientOptions.maxResources} resources."
            );
          }

          const prevInput = gameInput.prevInput;
          const selectedPlayerId = prevInput.clientOptions.selectedPlayer;

          // choosing players is optional, but we should be catching this
          // before you select resources
          if (!selectedPlayerId) {
            throw new Error("Selected player cannot be null");
          }

          const selectedPlayer = gameState.getPlayer(selectedPlayerId);

          gameState.addGameLogFromEvent(
            EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
            [
              player,
              " gave ",
              ...resourceMapToGameText(resources),
              " to ",
              selectedPlayer,
              ` to add ${2 * numResources} VP here.`,
            ]
          );

          selectedPlayer.gainResources(gameState, resources);
          player.spendResources(resources);

          const eventInfo = player.getClaimedEvent(
            EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN
          );
          if (!eventInfo) {
            throw new Error("Cannot find event info");
          }

          // Add VP to this event
          if (eventInfo.storedResources) {
            const storedVP = eventInfo.storedResources[ResourceType.VP];
            const vpToStore = storedVP ? storedVP : 0;
            eventInfo.storedResources = {
              [ResourceType.VP]: numResources * 2 + vpToStore,
            };
          } else {
            eventInfo.storedResources = { [ResourceType.VP]: numResources * 2 };
          }

          maxResources = gameInput.maxResources - numResources;
        }

        if (maxResources > 0 && player.getNumCardCostResources() > 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_PLAYER,
            prevInput: gameInput,
            label: [
              "You may select a player to give resources to (",
              { type: "points", value: 2 },
              " each)",
            ],
            prevInputType: gameInput.inputType,
            playerOptions: gameState.players
              .filter((p) => {
                return p.playerId !== player.playerId;
              })
              .map((p) => p.playerId),
            mustSelectOne: false, // you don't have to choose anyone
            eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
            clientOptions: { selectedPlayer: null },
          });
        }
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYER) {
        // only ask active player to choose resources to donate if they selected a player.
        // if selectedPlayer is null, we assume the active player is done choosing players
        // to donate resources to (ie, no more points)
        if (!gameInput.clientOptions.selectedPlayer) {
          return;
        }
        const selectedPlayer = gameState.getPlayer(
          gameInput.clientOptions.selectedPlayer
        );
        let maxToGive = 3;
        if (
          gameInput.prevInput &&
          gameInput.prevInput.inputType === GameInputType.SELECT_RESOURCES
        ) {
          const prevInput = gameInput.prevInput;
          const prevMax = prevInput.maxResources;
          const prevResourcesGiven = sumResources(
            prevInput.clientOptions.resources
          );
          maxToGive = prevMax - prevResourcesGiven;
        }

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          label: [
            `Give up to ${maxToGive} ANY to `,
            selectedPlayer.getGameTextPart(),
          ],
          toSpend: true,
          prevInputType: gameInput.inputType,
          prevInput: gameInput,
          maxResources: maxToGive,
          minResources: 0,
          eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
          clientOptions: {
            resources: {},
          },
        });
      } else {
        throw new Error(`Invalid input type: ${gameInput}`);
      }
    },
  }),
  [EventName.SPECIAL_A_WEE_RUN_CITY]: new Event({
    name: EventName.SPECIAL_A_WEE_RUN_CITY,
    type: EventType.SPECIAL,
    baseVP: 4,
    requiredCards: [CardName.CHIP_SWEEP, CardName.CLOCK_TOWER],
    eventDescription: toGameText(
      "When achieved, bring back one of your deployed workers"
    ),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        const recallableWorkers = player.getRecallableWorkers();
        if (recallableWorkers.length !== 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_WORKER_PLACEMENT,
            label: "Select a deployed worker to bring back",
            prevInputType: gameInput.inputType,
            options: recallableWorkers,
            eventContext: EventName.SPECIAL_A_WEE_RUN_CITY,
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
        gameState.addGameLogFromEvent(EventName.SPECIAL_A_WEE_RUN_CITY, [
          player,
          " recalled worker on ",
          ...workerPlacementToGameText(selectedOption),
          ".",
        ]);
        player.recallWorker(gameState, selectedOption);
      } else {
        throw new Error(`Invalid input type: ${gameInput}`);
      }
    },
  }),
  [EventName.SPECIAL_AN_EVENING_OF_FIREWORKS]: new Event({
    name: EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.LOOKOUT, CardName.MINER_MOLE],
    eventDescription: toGameText([
      "When achieved, you may place up to 3 TWIG here.",
      { type: "HR" },
      { type: "points", value: 2 },
      " for each TWIG on this Event.",
    ]),
    playedEventInfoInner: () => ({
      storedResources: {
        [ResourceType.TWIG]: 0,
      },
    }),
    // place up to 3 twigs on event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // ask player how many twigs to add to card
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: true,
          label: [
            "Place up to 3 TWIG here (",
            { type: "points", value: 2 },
            " each)",
          ],
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
          maxResources: 3,
          minResources: 0,
          specificResource: ResourceType.TWIG,
          clientOptions: {
            resources: {},
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        const resources = gameInput.clientOptions.resources;
        if (!resources) {
          throw new Error("invalid input");
        }

        const numTwigs = resources[ResourceType.TWIG];

        if (!numTwigs) {
          throw new Error("must provide number of twigs");
        }

        if (numTwigs > 3) {
          throw new Error("too many twigs");
        }

        const eventInfo = player.getClaimedEvent(
          EventName.SPECIAL_AN_EVENING_OF_FIREWORKS
        );

        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // add twigs to this event
        eventInfo.storedResources = resources;
        eventInfo.storedResources[ResourceType.TWIG] = numTwigs;

        // remove twigs from player's supply
        player.spendResources({ [ResourceType.TWIG]: numTwigs });
        gameState.addGameLogFromEvent(
          EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
          [
            player,
            ` placed ${numTwigs} TWIG here (`,
            { type: "points", value: 2 },
            " each).",
          ]
        );
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 2 points per twig on event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_AN_EVENING_OF_FIREWORKS
      );

      if (!eventInfo) {
        throw new Error("Invalid event info");
      }

      const resources = eventInfo.storedResources;
      if (!resources) {
        throw new Error("Invalid resources list");
      }

      const numTwigs = resources[ResourceType.TWIG];

      if (numTwigs === 0) {
        return 0;
      }

      if (!numTwigs || numTwigs > 3) {
        throw new Error("Invalid number of twigs");
      }

      return numTwigs * 2;
    },
  }),

  [EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED]: new Event({
    name: EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.HISTORIAN, CardName.RUINS],
    eventDescription: toGameText([
      "When achieved, reveal 5 CARD.",
      { type: "BR" },
      "You may draw any or place any beneath this Event.",
      { type: "HR" },
      { type: "points", value: 1 },
      " for each CARD beneath this Event.",
    ]),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // reveal 5 cards
        const cardOptions = [
          gameState.drawCard(),
          gameState.drawCard(),
          gameState.drawCard(),
          gameState.drawCard(),
          gameState.drawCard(),
        ];

        gameState.addGameLogFromEvent(
          EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
          [player, " revealed ", ...cardListToGameText(cardOptions), "."]
        );

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          label: [
            "Select up to 5 CARD to keep. The rest will be placed beneath this Event (",
            { type: "points", value: 1 },
            " each).",
          ],
          eventContext: EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
          maxToSelect: 5,
          minToSelect: 0,
          cardOptions: cardOptions,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (
        gameInput.inputType === GameInputType.SELECT_CARDS &&
        gameInput.prevInputType === GameInputType.CLAIM_EVENT &&
        gameInput.eventContext === EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      ) {
        if (!gameInput.clientOptions.selectedCards) {
          throw new Error("Invalid input");
        }
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length > 5) {
          throw new Error("Too many cards");
        }

        const eventInfo = player.getClaimedEvent(
          EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
        );
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        const remainingCards = gameInput.cardOptions;

        // Add selected cards to player's hand
        selectedCards.forEach((cardName) => {
          player.addCardToHand(gameState, cardName);

          // if card is added to player's hand, remove it from cards
          // that will go under event
          const idx = remainingCards.indexOf(cardName);
          remainingCards.splice(idx, 1);
        });

        remainingCards.forEach((cardName) => {
          (eventInfo.storedCards = eventInfo.storedCards || []).push(cardName);
        });

        gameState.addGameLogFromEvent(
          EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
          [
            player,
            " kept ",
            ...cardListToGameText(selectedCards),
            " and placed ",
            ...cardListToGameText(remainingCards),
            " beneath the event (",
            { type: "points", value: 1 },
            " each).",
          ]
        );
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    playedEventInfoInner: () => ({
      storedCards: [],
    }),
    // Reveal 5 cards. You may draw any or place any beneath this event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const storedCards = eventInfo.storedCards;

      if (!storedCards) {
        throw new Error("Invalid list of paired cards");
      }

      return storedCards.length;
    },
  }),
  [EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES]: new Event({
    name: EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.COURTHOUSE, CardName.RANGER],
    eventDescription: toGameText([
      "When achieved, place up to 2 ",
      { type: "em", text: "Critters" },
      " from your city beneath this Event.",
      { type: "HR" },
      { type: "points", value: 3 },
      " for each ",
      { type: "em", text: "Critter" },
      " beneath this Event.",
    ]),
    playedEventInfoInner: () => ({
      storedCards: [],
    }),
    // play up to 2 critters from your city beneath this event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        const crittersInCity = player.getPlayedCritters();

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          label: [
            "Place up to 2 ",
            { type: "em", text: "Critters" },
            " from your city beneath this Event. (",
            { type: "points", value: 3 },
            " each)",
          ],
          eventContext: EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
          cardOptions: crittersInCity,
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (!selectedCards) {
          throw new Error("invalid input");
        }
        if (selectedCards.length > 2) {
          throw new Error("Too many cards");
        }

        selectedCards.forEach((playedCardInfo) => {
          const card = Card.fromName(playedCardInfo.cardName);
          if (!card.isCritter) {
            throw new Error("Can only put Critters beneath this event");
          }
        });

        const eventInfo = player.getClaimedEvent(
          EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES
        );
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // Remove cards from city and put under event
        selectedCards.forEach((playedCardInfo) => {
          const removedCards = player.removeCardFromCity(
            gameState,
            playedCardInfo,
            false /* addToDiscardPile */
          );
          const cardName = playedCardInfo.cardName;
          removedCards.splice(removedCards.indexOf(cardName), 1);
          removedCards.forEach((card) => {
            gameState.discardPile.addToStack(card);
          });
          (eventInfo.storedCards = eventInfo.storedCards || []).push(cardName);
        });

        gameState.addGameLogFromEvent(
          EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
          [
            player,
            " placed ",
            ...cardListToGameText(
              selectedCards.map(({ cardName }) => cardName)
            ),
            " from their city beneath this event (",
            { type: "points", value: 3 },
            " each).",
          ]
        );
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 3 points per critter beneath event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES
      );
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }
      const storedCards = eventInfo.storedCards || [];
      if (storedCards.length > 2) {
        throw new Error("Too many cards stored under event");
      }

      storedCards.forEach((cardName) => {
        const card = Card.fromName(cardName as CardName);
        if (!card.isCritter) {
          throw new Error("Cannot store critters under this event");
        }
      });

      return (eventInfo.storedCards = eventInfo.storedCards || []).length * 3;
    },
  }),
  [EventName.SPECIAL_CROAK_WART_CURE]: new Event({
    name: EventName.SPECIAL_CROAK_WART_CURE,
    type: EventType.SPECIAL,
    baseVP: 6,
    requiredCards: [CardName.UNDERTAKER, CardName.BARGE_TOAD],
    eventDescription: toGameText(
      "When achieved, pay 2 BERRY and discard 2 CARD from your city."
    ),
    canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        if (!player.hasCardInCity(CardName.UNDERTAKER)) {
          return `Need to have played ${CardName.UNDERTAKER} to claim event`;
        }
        if (!player.hasCardInCity(CardName.BARGE_TOAD)) {
          return `Need to have played ${CardName.BARGE_TOAD} to claim event`;
        }
        if (player.getNumResourcesByType(ResourceType.BERRY) < 2) {
          return `Need to have at least 2 ${
            ResourceType.BERRY
          } to claim event. \n Got: ${player.getNumResourcesByType(
            ResourceType.BERRY
          )}`;
        }
      }
      return null;
    },
    // Pay 2 berries and discard 2 cards from city
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // Remove berries from player's supply
        player.spendResources({ [ResourceType.BERRY]: 2 });

        // ask player to choose which cards to discard
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          label: "Discard 2 CARD from your city",
          eventContext: EventName.SPECIAL_CROAK_WART_CURE,
          cardOptions: player.getAllPlayedCards(),
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            selectedCards: [],
          },
        });
        gameState.addGameLogFromEvent(EventName.SPECIAL_CROAK_WART_CURE, [
          player,
          " spent 2 BERRY.",
        ]);
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (!selectedCards) {
          throw new Error("invalid input");
        }
        if (selectedCards.length != 2) {
          throw new Error("Must select 2 cards to discard");
        }
        const eventInfo = player.getClaimedEvent(
          EventName.SPECIAL_CROAK_WART_CURE
        );
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }
        selectedCards.forEach((playedCardInfo) => {
          player.removeCardFromCity(gameState, playedCardInfo);
        });

        gameState.addGameLogFromEvent(EventName.SPECIAL_CROAK_WART_CURE, [
          player,
          " discarded ",
          ...cardListToGameText(selectedCards.map(({ cardName }) => cardName)),
          " from their city.",
        ]);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [EventName.SPECIAL_FLYING_DOCTOR_SERVICE]: new Event({
    name: EventName.SPECIAL_FLYING_DOCTOR_SERVICE,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.DOCTOR, CardName.POSTAL_PIGEON],
    eventDescription: toGameText([
      { type: "points", value: 3 },
      " for each ",
      { type: "entity", entityType: "card", card: CardName.HUSBAND },
      "/",
      { type: "entity", entityType: "card", card: CardName.WIFE },
      " pair in every city.",
    ]),
    pointsInner: (gameState: GameState, playerId: string) => {
      let getNumHusbandWifePairs = 0;
      gameState.players.forEach((player) => {
        getNumHusbandWifePairs += player.getNumHusbandWifePairs();
      });
      return getNumHusbandWifePairs * 3;
    },
  }),
  [EventName.SPECIAL_GRADUATION_OF_SCHOLARS]: new Event({
    name: EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.TEACHER, CardName.UNIVERSITY],
    eventDescription: toGameText([
      "When achieved, you may place up to 3 ",
      { type: "em", text: "Critters" },
      " from your hand beneath this Event.",
      { type: "HR" },
      { type: "points", value: 2 },
      " for each ",
      { type: "em", text: "Critter" },
      " beneath this Event.",
    ]),
    playedEventInfoInner: () => ({
      storedCards: [],
    }),
    // play up to 3 critters from your hand beneath this event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        const critterCardsInHand: CardName[] = [];
        player.cardsInHand.forEach((cardName) => {
          const card = Card.fromName(cardName as CardName);
          if (card.isCritter) {
            critterCardsInHand.push(card.name);
          }
          return card.isCritter;
        });

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          label: [
            "Place up to 3 ",
            { type: "em", text: "Critters" },
            " from your hand beneath this Event (",
            { type: "points", value: 2 },
            " each)",
          ],
          eventContext: EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
          cardOptions: critterCardsInHand,
          maxToSelect: 3,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        if (!gameInput.clientOptions.selectedCards) {
          throw new Error("invalid input");
        }

        const cardsToUse = gameInput.clientOptions.selectedCards;

        if (cardsToUse.length > 3) {
          throw new Error("Too many cards");
        }

        cardsToUse.forEach((cardName) => {
          const card = Card.fromName(cardName as CardName);
          if (!card.isCritter) {
            throw new Error("Can only put Critters beneath this event");
          }
        });

        const eventInfo = player.getClaimedEvent(
          EventName.SPECIAL_GRADUATION_OF_SCHOLARS
        );
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // remove cards from hand
        cardsToUse.forEach((cardName) => {
          player.removeCardFromHand(cardName as CardName);
          (eventInfo.storedCards = eventInfo.storedCards || []).push(cardName);
        });

        gameState.addGameLogFromEvent(
          EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
          [
            player,
            ` placed ${cardsToUse.length} `,
            { type: "em", text: "Critters" },
            ` from their hand beneath this event (`,
            { type: "points", value: 2 },
            ` each).`,
          ]
        );
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 2 points per critter beneath event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_GRADUATION_OF_SCHOLARS
      );
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }
      return (eventInfo.storedCards = eventInfo.storedCards || []).length * 2;
    },
  }),
  [EventName.SPECIAL_MINISTERING_TO_MISCREANTS]: new Event({
    name: EventName.SPECIAL_MINISTERING_TO_MISCREANTS,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.MONK, CardName.DUNGEON],
    eventDescription: toGameText([
      { type: "points", value: 3 },
      " for each prisoner in your Dungeon.",
    ]),
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_MINISTERING_TO_MISCREANTS
      );
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }
      if (player.getNumCardsInCity() === 0) {
        throw new Error("No cards in city");
      }
      const playedDungeons = player.getPlayedCardInfos(CardName.DUNGEON);
      if (playedDungeons.length === 0) {
        throw new Error("No dungeon in city");
      }
      // you can only have one dungeon in your city
      const cardsInDungeon = playedDungeons[0].pairedCards;
      if (!cardsInDungeon) {
        throw new Error("Invalid dungeon card list");
      }

      return cardsInDungeon.length * 3;
    },
  }),
  [EventName.SPECIAL_PATH_OF_THE_PILGRIMS]: new Event({
    name: EventName.SPECIAL_PATH_OF_THE_PILGRIMS,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.MONASTERY, CardName.WANDERER],
    eventDescription: toGameText([
      { type: "points", value: 3 },
      " for each worker in your Monastery.",
    ]),
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_PATH_OF_THE_PILGRIMS
      );
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const playedCards = player.playedCards;
      if (!playedCards) {
        throw new Error("no cards in city");
      }

      const monestary = playedCards[CardName.MONASTERY];
      if (!monestary) {
        throw new Error("No monestary in city");
      }

      if (monestary.length > 1) {
        throw new Error("Cannot have more than one monestary");
      }

      // you can only have one monestary in your city
      const workersInMonestary = monestary[0].workers;

      if (!workersInMonestary) {
        throw new Error("Invalid monestary worker list");
      }

      return workersInMonestary.length * 3;
    },
  }),
  [EventName.SPECIAL_PERFORMER_IN_RESIDENCE]: new Event({
    name: EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.INN, CardName.BARD],
    eventDescription: toGameText([
      "When achieved, you may place up to 3 BERRY here.",
      { type: "HR" },
      { type: "points", value: 2 },
      " for each BERRY on this Event.",
    ]),
    // may place up to 3 berries on this card
    playedEventInfoInner: () => ({
      storedResources: {
        [ResourceType.BERRY]: 0,
      },
    }),
    // place up to 3 berries on event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // ask player how many berries to add to card
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: true,
          label: [
            "Place up to 3 BERRY here (",
            { type: "points", value: 2 },
            " each)",
          ],
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
          specificResource: ResourceType.BERRY,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: {},
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        const resources = gameInput.clientOptions.resources;
        if (!resources) {
          throw new Error("Invalid input");
        }
        const numBerries = resources[ResourceType.BERRY];
        if (!numBerries) {
          throw new Error("Must provide number of berries");
        }
        if (numBerries > 3) {
          throw new Error("Select up to 3 berries");
        }
        const eventInfo = player.getClaimedEvent(
          EventName.SPECIAL_PERFORMER_IN_RESIDENCE
        );

        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // add berries to this event
        eventInfo.storedResources = resources;
        eventInfo.storedResources[ResourceType.BERRY] = numBerries;

        // remove berries from player's supply
        player.spendResources({ [ResourceType.BERRY]: numBerries });

        gameState.addGameLogFromEvent(
          EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
          [
            player,
            ` placed ${numBerries} BERRY here (`,
            { type: "points", value: 2 },
            ` each).`,
          ]
        );
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 2 points per berry on event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_PERFORMER_IN_RESIDENCE
      );

      if (!eventInfo) {
        throw new Error("Invalid event info");
      }

      const resources = eventInfo.storedResources;
      if (!resources) {
        throw new Error("Invalid resources list");
      }

      const numBerries = resources[ResourceType.BERRY];

      if (numBerries === 0) {
        return 0;
      }

      if (!numBerries || numBerries > 3) {
        throw new Error("Invalid number of berries");
      }

      return numBerries * 2;
    },
  }),
  [EventName.SPECIAL_PRISTINE_CHAPEL_CEILING]: new Event({
    name: EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.WOODCARVER, CardName.CHAPEL],
    eventDescription: toGameText([
      "When achieved, draw 1 CARD and receive 1 ANY ",
      "for each VP on your Chapel.",
    ]),
    // draw 1 card and receive 1 resource for each VP on your chapel
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const playedChapel = player.getFirstPlayedCard(CardName.CHAPEL);
      const gainAnyHelper = new GainMoreThan1AnyResource({
        eventContext: EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
      });

      const chapelResources = playedChapel.resources;
      if (!chapelResources) {
        throw new Error("Invalid resources on chapel");
      }
      const numVP = chapelResources[ResourceType.VP] || 0;
      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        player.drawCards(gameState, numVP);
        gameState.addGameLogFromEvent(
          EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
          [player, ` drew ${numVP} CARD.`]
        );

        if (numVP !== 0) {
          gameState.pendingGameInputs.push(
            gainAnyHelper.getGameInput(numVP, {
              prevInputType: gameInput.inputType,
            })
          );
        }
      } else if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 2 points for VP on the chapel
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_PRISTINE_CHAPEL_CEILING
      );
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const playedCards = player.playedCards;
      if (!playedCards) {
        throw new Error("no cards in city");
      }

      const chapel = playedCards[CardName.CHAPEL];
      if (!chapel) {
        throw new Error("No chapel in city");
      }

      if (chapel.length > 1) {
        throw new Error("Cannot have more than one chapel");
      }
      const chapelResources = chapel[0].resources;

      if (!chapelResources) {
        throw new Error("Invalid resources");
      }

      const numVP = chapelResources[ResourceType.VP] || 0;

      return numVP * 2;
    },
  }),
  [EventName.SPECIAL_REMEMBERING_THE_FALLEN]: new Event({
    name: EventName.SPECIAL_REMEMBERING_THE_FALLEN,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.CEMETARY, CardName.SHEPHERD],
    eventDescription: toGameText([
      { type: "points", value: 3 },
      " for each buried worker in your Cemetery.",
    ]),
    // 3 points for each worker in the cemetary
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_REMEMBERING_THE_FALLEN
      );
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const playedCards = player.playedCards;
      if (!playedCards) {
        throw new Error("no cards in city");
      }

      const cemetary = playedCards[CardName.CEMETARY];
      if (!cemetary) {
        throw new Error("No cemetary in city");
      }

      if (cemetary.length > 1) {
        throw new Error("Cannot have more than one cemetary");
      }

      // you can only have one cemetary in your city
      const workersInCemetary = cemetary[0].workers;

      if (!workersInCemetary) {
        throw new Error("Invalid cemetary worker list");
      }

      return workersInCemetary.length * 3;
    },
  }),
  // activate all production cards
  [EventName.SPECIAL_TAX_RELIEF]: new Event({
    name: EventName.SPECIAL_TAX_RELIEF,
    type: EventType.SPECIAL,
    baseVP: 3,
    requiredCards: [CardName.JUDGE, CardName.QUEEN],
    eventDescription: [
      { type: "cardType", cardType: CardType.PRODUCTION },
      { type: "BR" },
      { type: "text", text: "Activate Production" },
    ],
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        gameState.addGameLogFromEvent(EventName.SPECIAL_TAX_RELIEF, [
          player,
          " activated PRODUCTION.",
        ]);
        player.activateProduction(gameState, gameInput);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [EventName.SPECIAL_THE_EVERDELL_GAMES]: new Event({
    name: EventName.SPECIAL_THE_EVERDELL_GAMES,
    type: EventType.SPECIAL,
    baseVP: 9,
    shortName: toGameText("The Everdell Games"),
    eventRequirementsDescription: [
      { type: "text", text: "2 Each of " },
      { type: "BR" },
      { type: "cardType", cardType: CardType.PRODUCTION },
      { type: "cardType", cardType: CardType.TRAVELER },
      { type: "cardType", cardType: CardType.GOVERNANCE },
      { type: "cardType", cardType: CardType.PROSPERITY },
      { type: "cardType", cardType: CardType.DESTINATION },
    ],
    canPlayCheckInner: (gameState: GameState) => {
      const player = gameState.getActivePlayer();
      const cardTypeList = [
        CardType.PROSPERITY,
        CardType.GOVERNANCE,
        CardType.PRODUCTION,
        CardType.TRAVELER,
        CardType.DESTINATION,
      ];
      for (let i = 0; i < cardTypeList.length; i++) {
        if (player.getNumCardType(cardTypeList[i]) < 2) {
          return `Need to have at least 2 ${
            cardTypeList[i]
          } cards to claim event. Got: ${player.getNumCardType(
            cardTypeList[i]
          )}`;
        }
      }
      return null;
    },
  }),
  [EventName.SPECIAL_UNDER_NEW_MANAGEMENT]: new Event({
    name: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
    type: EventType.SPECIAL,
    baseVP: 0,
    requiredCards: [CardName.PEDDLER, CardName.GENERAL_STORE],
    eventDescription: toGameText([
      "When achieved, you may place up to 3 ANY here.",
      { type: "HR" },
      "Each BERRY TWIG = ",
      { type: "points", value: 1 },
      { type: "BR" },
      "Each RESIN PEBBLE = ",
      { type: "points", value: 2 },
    ]),
    playedEventInfoInner: () => ({
      storedResources: {
        [ResourceType.TWIG]: 0,
        [ResourceType.RESIN]: 0,
        [ResourceType.PEBBLE]: 0,
        [ResourceType.BERRY]: 0,
      },
    }),
    // place up to 3 resources on event
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // ask player how many resources to add to card
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_RESOURCES,
          label: [
            "Place up to 3 ANY here (",
            { type: "points", value: 1 },
            " per BERRY / TWIG & ",
            { type: "points", value: 2 },
            " per RESIN / PEBBLE)",
          ],
          toSpend: true,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: {},
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
        const resources = gameInput.clientOptions.resources;
        if (!resources) {
          throw new Error("invalid input");
        }

        // count total number of resources

        const numResources =
          (resources[ResourceType.BERRY] || 0) +
          (resources[ResourceType.TWIG] || 0) +
          (resources[ResourceType.RESIN] || 0) +
          (resources[ResourceType.PEBBLE] || 0);

        if (numResources > 3) {
          throw new Error("too many resources");
        }

        const eventInfo = player.getClaimedEvent(
          EventName.SPECIAL_UNDER_NEW_MANAGEMENT
        );

        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // add berries to this event
        eventInfo.storedResources = resources;

        // remove berries from player's supply
        player.spendResources({
          [ResourceType.TWIG]: resources[ResourceType.TWIG] || 0,
          [ResourceType.RESIN]: resources[ResourceType.RESIN] || 0,
          [ResourceType.PEBBLE]: resources[ResourceType.PEBBLE] || 0,
          [ResourceType.BERRY]: resources[ResourceType.BERRY] || 0,
        });

        gameState.addGameLogFromEvent(EventName.SPECIAL_UNDER_NEW_MANAGEMENT, [
          player,
          " placed ",
          ...resourceMapToGameText(resources),
          " here.",
        ]);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 1 pt per twig and berry, 2 pt per resin and pebble
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);

      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_UNDER_NEW_MANAGEMENT
      );

      if (!eventInfo) {
        throw new Error("Invalid event info");
      }

      const resources = eventInfo.storedResources;
      if (!resources) {
        throw new Error("Invalid resources list");
      }

      return (
        (resources[ResourceType.BERRY] || 0) +
        (resources[ResourceType.TWIG] || 0) +
        (resources[ResourceType.RESIN] || 0) * 2 +
        (resources[ResourceType.PEBBLE] || 0) * 2
      );
    },
  }),

  // Pearlbrook events
  [EventName.SPECIAL_ROMANTIC_CRUISE]: new Event({
    name: EventName.SPECIAL_ROMANTIC_CRUISE,
    baseVP: 0,
    requiredCards: [CardName.FERRY, CardName.HUSBAND],
    type: EventType.SPECIAL,
    eventDescription: toGameText([
      "When achieved, you may search through the deck for a ",
      { type: "entity", entityType: "card", card: CardName.WIFE },
      " CARD and play it for free.",
      { type: "BR" },
      "Or you may gain 5 VP.",
    ]),
    expansion: ExpansionType.PEARLBROOK,
    playedEventInfoInner: () => ({
      storedResources: {
        [ResourceType.VP]: 0,
      },
    }),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: gameInput.inputType,
          eventContext: EventName.SPECIAL_ROMANTIC_CRUISE,
          options: ["Search deck for a Wife", "Gain 5 VP"],
          clientOptions: {
            selectedOption: null,
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC) {
        const selectedOption = gameInput.clientOptions.selectedOption;

        if (selectedOption === "Search deck for a Wife") {
          gameState.addGameLogFromEvent(EventName.SPECIAL_ROMANTIC_CRUISE, [
            player,
            " chose to search the deck for a ",
            Card.fromName(CardName.WIFE),
            ".",
          ]);

          const drawnCards: CardName[] = [];
          const deck = gameState.deck;
          const numCardsInDeck = deck.length;

          while (!deck.isEmpty) {
            const cardName = deck.drawInner();
            const card = Card.fromName(cardName);

            if (card.name === CardName.WIFE) {
              gameState.addGameLogFromEvent(EventName.SPECIAL_ROMANTIC_CRUISE, [
                player,
                " found a ",
                Card.fromName(CardName.WIFE),
                " in the deck and played it for free.",
              ]);
              card.addToCityAndPlay(gameState, gameInput);
              break;
            } else {
              drawnCards.push(cardName);
            }
          }

          if (numCardsInDeck === drawnCards.length) {
            gameState.addGameLogFromEvent(EventName.SPECIAL_ROMANTIC_CRUISE, [
              player,
              " tried to draw a ",
              Card.fromName(CardName.WIFE),
              " from the deck, but there were none remaining in the deck.",
            ]);
          }

          drawnCards.forEach((cardName) => {
            deck.addToStack(cardName);
          });

          deck.shuffle();
        } else if (selectedOption === "Gain 5 VP") {
          const eventInfo = player.getClaimedEvent(
            EventName.SPECIAL_ROMANTIC_CRUISE
          );

          if (!eventInfo) {
            throw new Error("Cannot find event info");
          }

          eventInfo.storedResources = {
            [ResourceType.VP]: 5,
          };
          gameState.addGameLogFromEvent(EventName.SPECIAL_ROMANTIC_CRUISE, [
            player,
            " gained 5 VP.",
          ]);
        } else {
          throw new Error(
            "Must choose either to either search for a Wife or gain 5 VP"
          );
        }
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [EventName.SPECIAL_X_MARKS_THE_SPOT]: new Event({
    name: EventName.SPECIAL_X_MARKS_THE_SPOT,
    baseVP: 0,
    requiredCards: [CardName.PIRATE_SHIP, CardName.STOREHOUSE],
    type: EventType.SPECIAL,
    eventDescription: toGameText([
      "When achieved, place 1 VP on your ",
      { type: "entity", entityType: "card", card: CardName.STOREHOUSE },
      " for each resource there, up to 6.",
    ]),
    expansion: ExpansionType.PEARLBROOK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // get all the player's storehouses
        const storehouses = player.getPlayedCardInfos(CardName.STOREHOUSE);

        if (storehouses.length >= 1) {
          let storehouse = storehouses[0];

          storehouses.forEach((playedCardInfo) => {
            const mostResources = sumResources(storehouse.resources || {});
            const numResources = sumResources(playedCardInfo.resources || {});

            if (numResources > mostResources) {
              storehouse = playedCardInfo;
            }
          });

          const updatedResources = {
            ...storehouse.resources,
          };

          const numResources = sumResources(updatedResources);

          updatedResources[ResourceType.VP] =
            numResources > 6 ? 6 : numResources;

          player.updatePlayedCard(gameState, storehouse, {
            resources: updatedResources,
          });

          gameState.addGameLogFromEvent(EventName.SPECIAL_X_MARKS_THE_SPOT, [
            player,
            " placed 1 VP on ",
            Card.fromName(CardName.STOREHOUSE),
            " for each resource, up to 6, for a total of ",
            `${numResources > 6 ? 6 : numResources} VP`,
          ]);
        }

        // if there's more than one, find the one with the most resources
        // store VP on the card
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [EventName.SPECIAL_RIVERSIDE_RESORT]: new Event({
    name: EventName.SPECIAL_RIVERSIDE_RESORT,
    baseVP: 0,
    requiredCards: [CardName.HARBOR, CardName.INNKEEPER],
    type: EventType.SPECIAL,
    eventDescription: toGameText([
      "When achieved, you may place up to 3 ",
      { type: "em", text: "Critters" },
      " from the Meadow facedown beneath this Event.",
      { type: "HR" },
      { type: "points", value: 2 },
      " for each ",
      { type: "em", text: "Critter" },
      " beneath this Event.",
    ]),
    expansion: ExpansionType.PEARLBROOK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        const meadowCards = gameState.meadowCards;

        const crittersInMeadow: CardName[] = [];

        // get all the critters
        meadowCards.forEach((meadowCard) => {
          const card = Card.fromName(meadowCard);
          if (card.isCritter) {
            crittersInMeadow.push(card.name);
          }
        });

        if (crittersInMeadow.length > 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.CLAIM_EVENT,
            label: [
              "Place up to 3 ",
              { type: "em", text: "Critters" },
              " from the Meadow beneath this Event. (",
              { type: "points", value: 2 },
              " each)",
            ],
            eventContext: EventName.SPECIAL_RIVERSIDE_RESORT,
            cardOptions: crittersInMeadow,
            maxToSelect: 3,
            minToSelect: 0,
            clientOptions: {
              selectedCards: [],
            },
          });
        }
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (!selectedCards) {
          throw new Error("invalid input");
        }
        if (selectedCards.length > 3) {
          throw new Error("Too many cards");
        }

        selectedCards.forEach((cardName) => {
          const card = Card.fromName(cardName);
          if (!card.isCritter) {
            throw new Error("Can only put Critters beneath this event");
          }
        });

        const eventInfo = player.getClaimedEvent(
          EventName.SPECIAL_RIVERSIDE_RESORT
        );
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // Remove cards from meadow and put under event
        selectedCards.forEach((cardName) => {
          gameState.removeCardFromMeadow(cardName);
          (eventInfo.storedCards = eventInfo.storedCards || []).push(cardName);
        });

        gameState.replenishMeadow();

        if (selectedCards.length === 0) {
          gameState.addGameLogFromEvent(EventName.SPECIAL_RIVERSIDE_RESORT, [
            player,
            " did not place any cards from the Meadow beneath this event.",
          ]);
        } else {
          gameState.addGameLogFromEvent(EventName.SPECIAL_RIVERSIDE_RESORT, [
            player,
            " placed ",
            ...cardListToGameText(selectedCards),
            " from the Meadow beneath this event (",
            { type: "points", value: 2 },
            " each).",
          ]);
        }
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    // 2 points per critter beneath event
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_RIVERSIDE_RESORT
      );
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }
      const storedCards = eventInfo.storedCards || [];
      if (storedCards.length > 3) {
        throw new Error("Too many cards stored under event");
      }

      storedCards.forEach((cardName) => {
        const card = Card.fromName(cardName as CardName);
        if (!card.isCritter) {
          throw new Error("Cannot store critters under this event");
        }
      });

      return (eventInfo.storedCards = eventInfo.storedCards || []).length * 2;
    },
  }),
  [EventName.SPECIAL_MASQUERADE_INVITATIONS]: new Event({
    name: EventName.SPECIAL_MASQUERADE_INVITATIONS,
    baseVP: 0,
    requiredCards: [CardName.MESSENGER, CardName.FAIRGROUNDS],
    type: EventType.SPECIAL,
    eventDescription: toGameText([
      "When achieved, you may give up to 6 CARD to opponents. ",
      { type: "BR" },
      "Gain 1 VP for each CARD given this way.",
    ]),
    expansion: ExpansionType.PEARLBROOK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      if (
        gameInput.inputType === GameInputType.CLAIM_EVENT ||
        (gameInput.inputType === GameInputType.SELECT_CARDS &&
          gameInput.prevInput &&
          gameInput.prevInput.inputType === GameInputType.SELECT_PLAYER)
      ) {
        let maxToSelect = 6;
        if (
          gameInput.inputType === GameInputType.SELECT_CARDS &&
          gameInput.prevInput &&
          gameInput.prevInput.inputType === GameInputType.SELECT_PLAYER
        ) {
          const cardsToGive = gameInput.clientOptions.selectedCards;
          if (cardsToGive.length > gameInput.maxToSelect) {
            throw new Error(
              "Cannot give more than {gameInput.maxToSelect} cards."
            );
          }

          const prevInput = gameInput.prevInput;
          const selectedPlayerId = prevInput.clientOptions.selectedPlayer;

          // choosing players is optional, but we should be catching this
          // before you select resources
          if (!selectedPlayerId) {
            throw new Error("Selected player cannot be null");
          }

          const selectedPlayer = gameState.getPlayer(selectedPlayerId);

          gameState.addGameLogFromEvent(
            EventName.SPECIAL_MASQUERADE_INVITATIONS,
            [
              player,
              ` gave ${cardsToGive.length} CARD to `,
              selectedPlayer,
              ` to gain ${cardsToGive.length} VP.`,
            ]
          );

          cardsToGive.forEach((cardName) => {
            selectedPlayer.addCardToHand(gameState, cardName);
            player.removeCardFromHand(cardName);
          });

          const eventInfo = player.getClaimedEvent(
            EventName.SPECIAL_MASQUERADE_INVITATIONS
          );
          if (!eventInfo) {
            throw new Error("Cannot find event info");
          }

          // Add VP to this event
          if (eventInfo.storedResources) {
            const storedVP = eventInfo.storedResources[ResourceType.VP];
            const vpToStore = storedVP ? storedVP : 0;
            eventInfo.storedResources = {
              [ResourceType.VP]: cardsToGive.length + vpToStore,
            };
          } else {
            eventInfo.storedResources = {
              [ResourceType.VP]: cardsToGive.length,
            };
          }

          maxToSelect = gameInput.maxToSelect - cardsToGive.length;
        }
        if (maxToSelect > 0 && player.cardsInHand.length > 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_PLAYER,
            prevInput: gameInput,
            label: [
              "You may select a player to give cards to (",
              { type: "points", value: 1 },
              " each)",
            ],
            prevInputType: gameInput.inputType,
            playerOptions: gameState.players
              .filter((p) => {
                return p.playerId !== player.playerId;
              })
              .map((p) => p.playerId),
            mustSelectOne: false, // you don't have to choose anyone
            eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
            clientOptions: { selectedPlayer: null },
          });
        }
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYER) {
        // only ask active player to choose cards to give if they selected a player.
        // if selectedPlayer is null, we assume the active player is done choosing players
        // to give cards to (ie, no more points)
        if (!gameInput.clientOptions.selectedPlayer) {
          return;
        }
        const selectedPlayer = gameState.getPlayer(
          gameInput.clientOptions.selectedPlayer
        );
        let maxToGive = 6;
        if (
          gameInput.prevInput &&
          gameInput.prevInput.inputType === GameInputType.SELECT_CARDS
        ) {
          const prevInput = gameInput.prevInput;
          const prevMax = prevInput.maxToSelect;
          const prevCardsGiven = prevInput.clientOptions.selectedCards.length;
          maxToGive = prevMax - prevCardsGiven;
        }

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          label: [
            `Give up to ${maxToGive} CARD to `,
            selectedPlayer.getGameTextPart(),
          ],
          prevInputType: gameInput.inputType,
          prevInput: gameInput,
          cardOptions: player.cardsInHand,
          maxToSelect: maxToGive,
          minToSelect: 0,
          eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else {
        throw new Error(`Invalid input type: ${gameInput}`);
      }
    },
  }),
  [EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED]: new Event({
    name: EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED,
    baseVP: 0,
    requiredCards: [CardName.PIRATE, CardName.CRANE],
    type: EventType.SPECIAL,
    eventDescription: toGameText([
      "When achieved, you may play 1 CARD from the Meadow worth up to ",
      { type: "points", value: 3 },
      " for free.",
    ]),
    expansion: ExpansionType.PEARLBROOK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        // get all playable cards that are <= 3 VP
        const meadowOptions = gameState.meadowCards.filter((cardName) => {
          const card = Card.fromName(cardName);
          return card.baseVP <= 3 && player.canAddToCity(card.name, true);
        });

        if (meadowOptions.length > 0) {
          gameState.pendingGameInputs.push({
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: gameInput.inputType,
            label: [
              "Select 1 CARD from the Meadow worth up to ",
              { type: "points", value: 3 },
              " to play for free.",
            ],
            cardOptions: meadowOptions,
            maxToSelect: 1,
            minToSelect: 0, // you don't have to select a card
            eventContext: EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED,
            clientOptions: {
              selectedCards: [],
            },
          });
        }
      } else if (
        gameInput.inputType == GameInputType.SELECT_CARDS &&
        gameInput.eventContext === EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED
      ) {
        const selectedCards = gameInput.clientOptions.selectedCards;

        if (selectedCards.length > 1) {
          throw new Error("incorrect number of cards selected");
        }

        if (selectedCards.length === 1) {
          const card = Card.fromName(selectedCards[0]);
          if (card.baseVP > 3) {
            throw new Error("cannot play a card worth more than 3 VP");
          }

          gameState.removeCardFromMeadow(card.name);
          gameState.addGameLogFromEvent(
            EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED,
            [player, " played ", card, " from the Meadow."]
          );

          card.addToCityAndPlay(gameState, gameInput);
          gameState.replenishMeadow();
        }
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [EventName.SPECIAL_RIVER_RACE]: new Event({
    name: EventName.SPECIAL_RIVER_RACE,
    baseVP: 4,
    requiredCards: [CardName.FERRY_FERRET, CardName.TWIG_BARGE],
    type: EventType.SPECIAL,
    eventDescription: toGameText([
      "When achived, place either your ",
      { type: "entity", entityType: "card", card: CardName.FERRY_FERRET },
      " or ",
      { type: "entity", entityType: "card", card: CardName.TWIG_BARGE },
      " facedown beneath this event.",
      { type: "HR" },
      "If ",
      { type: "entity", entityType: "card", card: CardName.FERRY_FERRET },
      ", gain 2 VP",
      { type: "BR" },
      "If ",
      { type: "entity", entityType: "card", card: CardName.TWIG_BARGE },
      ", gain 2 ANY",
    ]),
    expansion: ExpansionType.PEARLBROOK,
    playedEventInfoInner: () => ({
      storedCards: [],
    }),
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();
      const gainAnyHelper = new GainMoreThan1AnyResource({
        eventContext: EventName.SPECIAL_RIVER_RACE,
        skipGameLog: true,
      });

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        const cardOptions: PlayedCardInfo[] = [];
        player.forEachPlayedCard((playedCardInfo) => {
          const card = Card.fromName(playedCardInfo.cardName);
          if (
            card.name === CardName.FERRY_FERRET ||
            card.name === CardName.TWIG_BARGE
          ) {
            cardOptions.push(playedCardInfo);
          }
        });

        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: gameInput.inputType,
          label:
            "Place a Ferry Ferret under this card for 2 VP OR a Twig Barge to gain 2 ANY",
          cardOptions: cardOptions,
          maxToSelect: 1,
          minToSelect: 1,
          eventContext: EventName.SPECIAL_RIVER_RACE,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS) {
        const selectedCards = gameInput.clientOptions.selectedCards;
        if (selectedCards.length !== 1) {
          throw new Error("Must select at least 1 card");
        }
        const card = Card.fromName(selectedCards[0].cardName);

        if (
          card.name !== CardName.FERRY_FERRET &&
          card.name !== CardName.TWIG_BARGE
        ) {
          throw new Error("Must select either Ferry Ferret or Twig Barge");
        }

        const eventInfo = player.getClaimedEvent(EventName.SPECIAL_RIVER_RACE);
        if (!eventInfo) {
          throw new Error("Cannot find event info");
        }

        // remove selected card from city and put beneath event
        player.removeCardFromCity(
          gameState,
          selectedCards[0],
          false /* don't send to discard, put under event instead*/
        );
        (eventInfo.storedCards = eventInfo.storedCards || []).push(
          selectedCards[0].cardName
        );

        // if Twig Barge, let them choose 2 ANY
        if (card.name === CardName.TWIG_BARGE) {
          gameState.pendingGameInputs.push(
            gainAnyHelper.getGameInput(2, {
              prevInputType: gameInput.inputType,
            })
          );
        } else {
          gameState.addGameLogFromEvent(EventName.SPECIAL_RIVER_RACE, [
            player,
            " removed ",
            card,
            " from their city and placed it beneath this event to gain 2 VP.",
          ]);
        }
      } else if (gainAnyHelper.matchesGameInput(gameInput)) {
        gainAnyHelper.play(gameState, gameInput);
        gameState.addGameLogFromEvent(EventName.SPECIAL_RIVER_RACE, [
          player,
          " removed ",
          Card.fromName(CardName.TWIG_BARGE),
          " from their city and placed it beneath this event to gain ",
          ...resourceMapToGameText({
            ...gameInput.clientOptions.resources,
          }),
        ]);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
    pointsInner: (gameState: GameState, playerId: string) => {
      const player = gameState.getPlayer(playerId);
      const eventInfo = player.getClaimedEvent(EventName.SPECIAL_RIVER_RACE);
      if (!eventInfo) {
        throw new Error("Cannot find event info");
      }

      const storedCards = eventInfo.storedCards;

      if (!storedCards) {
        throw new Error("Invalid list of paired cards");
      }

      if (storedCards.length !== 1) {
        throw new Error("Incorrect number of cards stored here");
      }

      const card = Card.fromName(storedCards[0] as CardName);

      if (
        card.name !== CardName.FERRY_FERRET &&
        card.name !== CardName.TWIG_BARGE
      ) {
        throw new Error("May only store Ferry Ferret or Twig Barge here");
      }

      return card.name === CardName.FERRY_FERRET ? 2 : 0;
    },
  }),

  // Pearlbrook Wonders
  [EventName.WONDER_HOPEWATCH_GATE]: new Event({
    name: EventName.WONDER_HOPEWATCH_GATE,
    eventDescription: toGameText([
      "Pay 1 TWIG, 1 RESIN, 1 PEBBLE, 2 PEARL, and discard 2 CARD.",
    ]),
    type: EventType.WONDER,
    baseVP: 10,
    wonderCost: {
      resources: {
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 1,
        [ResourceType.PEARL]: 2,
      },
      numCardsToDiscard: 2,
    },
    expansion: ExpansionType.PEARLBROOK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          label: `Select 3 CARD to discard`,
          eventContext: EventName.WONDER_HOPEWATCH_GATE,
          maxToSelect: 2,
          minToSelect: 2,
          cardOptions: player.cardsInHand,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        // make sure you chose the right number
        const selectedCards = gameInput.clientOptions.selectedCards;

        if (selectedCards.length < 2) {
          throw new Error("Too few cards discarded");
        }

        // player spends resources
        player.spendResources({
          [ResourceType.TWIG]: 1,
          [ResourceType.RESIN]: 1,
          [ResourceType.PEBBLE]: 1,
          [ResourceType.PEARL]: 2,
        });

        // remove the cards from player's hand
        selectedCards.forEach((cardName) => {
          player.removeCardFromHand(cardName as CardName);
          gameState.discardPile.addToStack(cardName);
        });

        gameState.addGameLogFromEvent(EventName.WONDER_HOPEWATCH_GATE, [
          player,
          " spent ",
          ...resourceMapToGameText({
            [ResourceType.TWIG]: 1,
            [ResourceType.RESIN]: 1,
            [ResourceType.PEBBLE]: 1,
            [ResourceType.PEARL]: 2,
          }),
          " and discarded 2 CARD.",
        ]);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [EventName.WONDER_MISTRISE_FOUNTAIN]: new Event({
    name: EventName.WONDER_MISTRISE_FOUNTAIN,
    eventDescription: toGameText([
      "Pay 2 TWIG, 2 RESIN, 2 PEBBLE, 2 PEARL, and discard 2 CARD.",
    ]),
    type: EventType.WONDER,
    baseVP: 15,
    wonderCost: {
      resources: {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 2,
      },
      numCardsToDiscard: 2,
    },
    expansion: ExpansionType.PEARLBROOK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          label: `Select 3 CARD to discard`,
          eventContext: EventName.WONDER_MISTRISE_FOUNTAIN,
          maxToSelect: 2,
          minToSelect: 2,
          cardOptions: player.cardsInHand,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        // make sure you chose the right number
        const selectedCards = gameInput.clientOptions.selectedCards;

        if (selectedCards.length < 2) {
          throw new Error("Too few cards discarded");
        }

        // player spends resources
        player.spendResources({
          [ResourceType.TWIG]: 2,
          [ResourceType.RESIN]: 2,
          [ResourceType.PEBBLE]: 2,
          [ResourceType.PEARL]: 2,
        });

        // remove the cards from player's hand
        selectedCards.forEach((cardName) => {
          player.removeCardFromHand(cardName as CardName);
          gameState.discardPile.addToStack(cardName);
        });

        gameState.addGameLogFromEvent(EventName.WONDER_MISTRISE_FOUNTAIN, [
          player,
          " spent ",
          ...resourceMapToGameText({
            [ResourceType.TWIG]: 2,
            [ResourceType.RESIN]: 2,
            [ResourceType.PEBBLE]: 2,
            [ResourceType.PEARL]: 2,
          }),
          " and discarded 2 CARD.",
        ]);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [EventName.WONDER_SUNBLAZE_BRIDGE]: new Event({
    name: EventName.WONDER_SUNBLAZE_BRIDGE,
    eventDescription: toGameText([
      "Pay 2 TWIG, 2 RESIN, 2 PEBBLE, 3 PEARL, and discard 3 CARD.",
    ]),
    type: EventType.WONDER,
    baseVP: 20,
    wonderCost: {
      resources: {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 3,
      },
      numCardsToDiscard: 3,
    },
    expansion: ExpansionType.PEARLBROOK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          label: `Select 3 CARD to discard`,
          eventContext: EventName.WONDER_SUNBLAZE_BRIDGE,
          maxToSelect: 3,
          minToSelect: 3,
          cardOptions: player.cardsInHand,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        // make sure you chose the right number
        const selectedCards = gameInput.clientOptions.selectedCards;

        if (selectedCards.length < 3) {
          throw new Error("Too few cards discarded");
        }

        // player spends resources
        player.spendResources({
          [ResourceType.TWIG]: 2,
          [ResourceType.RESIN]: 2,
          [ResourceType.PEBBLE]: 2,
          [ResourceType.PEARL]: 3,
        });

        // remove the cards from player's hand
        selectedCards.forEach((cardName) => {
          player.removeCardFromHand(cardName as CardName);
          gameState.discardPile.addToStack(cardName);
        });

        gameState.addGameLogFromEvent(EventName.WONDER_SUNBLAZE_BRIDGE, [
          player,
          " spent ",
          ...resourceMapToGameText({
            [ResourceType.TWIG]: 2,
            [ResourceType.RESIN]: 2,
            [ResourceType.PEBBLE]: 2,
            [ResourceType.PEARL]: 3,
          }),
          " and discarded 3 CARD.",
        ]);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
  [EventName.WONDER_STARFALLS_FLAME]: new Event({
    name: EventName.WONDER_STARFALLS_FLAME,
    eventDescription: toGameText([
      "Pay 3 TWIG, 3 RESIN, 3 PEBBLE, 3 PEARL, and discard 3 CARD.",
    ]),
    type: EventType.WONDER,
    baseVP: 25,
    wonderCost: {
      resources: {
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 3,
        [ResourceType.PEBBLE]: 3,
        [ResourceType.PEARL]: 3,
      },
      numCardsToDiscard: 3,
    },
    expansion: ExpansionType.PEARLBROOK,
    playInner: (gameState: GameState, gameInput: GameInput) => {
      const player = gameState.getActivePlayer();

      if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          label: `Select 3 CARD to discard`,
          eventContext: EventName.WONDER_STARFALLS_FLAME,
          maxToSelect: 3,
          minToSelect: 3,
          cardOptions: player.cardsInHand,
          clientOptions: {
            selectedCards: [],
          },
        });
      } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
        // make sure you chose the right number
        const selectedCards = gameInput.clientOptions.selectedCards;

        if (selectedCards.length < 3) {
          throw new Error("Too few cards discarded");
        }

        // player spends resources
        player.spendResources({
          [ResourceType.TWIG]: 3,
          [ResourceType.RESIN]: 3,
          [ResourceType.PEBBLE]: 3,
          [ResourceType.PEARL]: 3,
        });

        // remove the cards from player's hand
        selectedCards.forEach((cardName) => {
          player.removeCardFromHand(cardName as CardName);
          gameState.discardPile.addToStack(cardName);
        });

        gameState.addGameLogFromEvent(EventName.WONDER_STARFALLS_FLAME, [
          player,
          " spent ",
          ...resourceMapToGameText({
            [ResourceType.TWIG]: 3,
            [ResourceType.RESIN]: 3,
            [ResourceType.PEBBLE]: 3,
            [ResourceType.PEARL]: 3,
          }),
          " and discarded 3 CARD.",
        ]);
      } else {
        throw new Error(`Invalid input type ${gameInput.inputType}`);
      }
    },
  }),
};

const baseGameSpecialEvents: EventName[] = [
  EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
  EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
  EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
  EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
  EventName.SPECIAL_MINISTERING_TO_MISCREANTS,
  EventName.SPECIAL_CROAK_WART_CURE,
  EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
  EventName.SPECIAL_A_WEE_RUN_CITY,
  EventName.SPECIAL_TAX_RELIEF,
  EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
  EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
  EventName.SPECIAL_FLYING_DOCTOR_SERVICE,
  EventName.SPECIAL_PATH_OF_THE_PILGRIMS,
  EventName.SPECIAL_REMEMBERING_THE_FALLEN,
  EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
  EventName.SPECIAL_THE_EVERDELL_GAMES,
];

const pearlbrookSpecialEvents: EventName[] = [
  EventName.SPECIAL_ROMANTIC_CRUISE,
  EventName.SPECIAL_X_MARKS_THE_SPOT,
  EventName.SPECIAL_RIVERSIDE_RESORT,
  EventName.SPECIAL_MASQUERADE_INVITATIONS,
  EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED,
  EventName.SPECIAL_RIVER_RACE,
];

export const initialEventMap = ({
  pearlbrook,
}: Pick<GameOptions, "pearlbrook">): EventNameToPlayerId => {
  const ret: EventNameToPlayerId = {};

  // if pearlbrook, use the wonders instead of basic events
  if (pearlbrook) {
    [...Event.byType(EventType.WONDER)].forEach((ty) => {
      ret[ty] = null;
    });
  } else {
    [...Event.byType(EventType.BASIC)].forEach((ty) => {
      ret[ty] = null;
    });
  }

  let toSelect = 4;
  const specialEvents = [...baseGameSpecialEvents];
  if (pearlbrook) {
    // Use at least 1 pearlbrook special event.
    const [chosen, ...rest] = shuffle(pearlbrookSpecialEvents);
    ret[chosen] = null;
    toSelect -= 1;
    specialEvents.push(...rest);
  }

  shuffle(specialEvents)
    .slice(0, toSelect)
    .forEach((ty) => {
      ret[ty] = null;
    });

  return ret;
};
