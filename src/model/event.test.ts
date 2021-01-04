import expect from "expect.js";
import { Event } from "./event";
import { GameState } from "./gameState";
import { testInitialGameState, multiStepGameInputTest } from "./testHelpers";
import {
  EventName,
  GameInputType,
  GameInputClaimEvent,
  CardName,
  ResourceType,
  LocationName,
} from "./types";

const claimEventInput = (event: EventName): GameInputClaimEvent => {
  return {
    inputType: GameInputType.CLAIM_EVENT,
    clientOptions: {
      event,
    },
  };
};

describe("Event", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = testInitialGameState();
  });

  describe("fromName", () => {
    it("should return the expect Event instances", () => {
      Object.values(EventName).forEach((evt) => {
        expect(Event.fromName(evt as EventName).name).to.be(evt);
      });
    });
  });

  describe(EventName.BASIC_FOUR_PRODUCTION, () => {
    it("should only be playable with four production tags", () => {
      const event = Event.fromName(EventName.BASIC_FOUR_PRODUCTION);
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();

      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(CardName.MINE);
      player.addToCity(CardName.MINE);
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.FARM);
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      expect(Object.keys(player.claimedEvents).length == 0);

      event.play(gameState, gameInput);
      expect(player.claimedEvents[EventName.BASIC_FOUR_PRODUCTION]);
      expect(Object.keys(player.claimedEvents).length == 1);
    });
  });

  describe(EventName.BASIC_THREE_DESTINATION, () => {
    it("should only be playable with three destination tags", () => {
      const event = Event.fromName(EventName.BASIC_THREE_DESTINATION);
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(CardName.UNIVERSITY);
      player.addToCity(CardName.QUEEN);
      player.addToCity(CardName.LOOKOUT);
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      expect(Object.keys(player.claimedEvents).length == 0);

      event.play(gameState, gameInput);
      expect(player.claimedEvents[EventName.BASIC_THREE_DESTINATION]);
      expect(Object.keys(player.claimedEvents).length == 1);
    });
  });

  describe(EventName.BASIC_THREE_TRAVELER, () => {
    it("should only be playable with three traverler tags", () => {
      const event = Event.fromName(EventName.BASIC_THREE_TRAVELER);
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(CardName.WANDERER);
      player.addToCity(CardName.WANDERER);
      player.addToCity(CardName.RANGER);
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      expect(Object.keys(player.claimedEvents).length == 0);

      event.play(gameState, gameInput);
      expect(player.claimedEvents[EventName.BASIC_THREE_TRAVELER]);
      expect(Object.keys(player.claimedEvents).length == 1);
    });
  });

  describe(EventName.BASIC_THREE_GOVERNANCE, () => {
    it("should only be playable with three governance tags", () => {
      const event = Event.fromName(EventName.BASIC_THREE_GOVERNANCE);
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(CardName.JUDGE);
      player.addToCity(CardName.HISTORIAN);
      player.addToCity(CardName.INNKEEPER);
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      expect(Object.keys(player.claimedEvents).length == 0);

      event.play(gameState, gameInput);
      expect(player.claimedEvents[EventName.BASIC_THREE_GOVERNANCE]);
      expect(Object.keys(player.claimedEvents).length == 1);
    });
  });

  describe(EventName.SPECIAL_THE_EVERDELL_GAMES, () => {
    it("should only be playable with 2 of each tags", () => {
      const event = Event.fromName(EventName.SPECIAL_THE_EVERDELL_GAMES);
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_THE_EVERDELL_GAMES] = null;

      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(CardName.JUDGE);
      player.addToCity(CardName.HISTORIAN);
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(CardName.FARM);
      player.addToCity(CardName.FARM);
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(CardName.WANDERER);
      player.addToCity(CardName.WANDERER);
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(CardName.QUEEN);
      player.addToCity(CardName.LOOKOUT);
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(CardName.KING);
      player.addToCity(CardName.WIFE);
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      expect(Object.keys(player.claimedEvents).length == 0);

      event.play(gameState, gameInput);
      expect(player.claimedEvents[EventName.SPECIAL_THE_EVERDELL_GAMES]);
      expect(Object.keys(player.claimedEvents).length == 1);
    });
  });

  describe(EventName.SPECIAL_GRADUATION_OF_SCHOLARS, () => {
    it("game state", () => {
      const event = Event.fromName(EventName.SPECIAL_GRADUATION_OF_SCHOLARS);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_GRADUATION_OF_SCHOLARS] = null;
      player.addToCity(CardName.TEACHER);
      player.addToCity(CardName.UNIVERSITY);

      player.cardsInHand = [
        CardName.POSTAL_PIGEON,
        CardName.HUSBAND,
        CardName.WIFE,
        CardName.FOOL,
        CardName.FARM,
      ];

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_GRADUATION_OF_SCHOLARS]
      ).to.be(undefined);

      expect(event.canPlay(gameState, gameInput)).to.be(true);

      const gameState2 = gameState.next(gameInput);
      expect(player.playerId).to.be(gameState2.getActivePlayer().playerId);
      player = gameState2.getActivePlayer();
      expect(
        player.claimedEvents[EventName.SPECIAL_GRADUATION_OF_SCHOLARS]
      ).to.eql({ storedCards: [] });

      expect(gameState2.pendingGameInputs).to.eql([
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
          // Farm isn't an option for this event because it's not a critter
          cardOptions: [
            CardName.POSTAL_PIGEON,
            CardName.HUSBAND,
            CardName.WIFE,
            CardName.FOOL,
          ],
          maxToSelect: 3,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        },
      ]);

      const gameState3 = gameState2.next({
        inputType: GameInputType.SELECT_CARDS,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
        cardOptions: [
          CardName.POSTAL_PIGEON,
          CardName.HUSBAND,
          CardName.WIFE,
          CardName.FOOL,
        ],
        maxToSelect: 3,
        minToSelect: 0,
        clientOptions: {
          selectedCards: [
            CardName.POSTAL_PIGEON,
            CardName.HUSBAND,
            CardName.WIFE,
          ],
        },
      });

      expect(player.playerId).to.not.be(gameState3.getActivePlayer().playerId);

      player = gameState3.getPlayer(player.playerId);

      expect(
        player.claimedEvents[EventName.SPECIAL_GRADUATION_OF_SCHOLARS]
      ).to.eql({
        storedCards: [CardName.POSTAL_PIGEON, CardName.HUSBAND, CardName.WIFE],
      });
    });
  });

  describe(EventName.SPECIAL_CROAK_WART_CURE, () => {
    it("game state", () => {
      const event = Event.fromName(EventName.SPECIAL_CROAK_WART_CURE);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_CROAK_WART_CURE] = null;
      player.gainResources({ [ResourceType.BERRY]: 2 });

      player.addToCity(CardName.UNDERTAKER);
      player.addToCity(CardName.BARGE_TOAD);
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.CASTLE);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // Make sure this event works even if the player only has 1 worker left
      while (player.numAvailableWorkers !== 1) {
        player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
      }

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(player.claimedEvents[EventName.SPECIAL_CROAK_WART_CURE]).to.be(
        undefined
      );

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_CROAK_WART_CURE,
          cardOptions: player.getAllPlayedCards(),
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            // these are the cards the player wants to remove
            // from their city
            selectedCards: [
              ...player.getPlayedCardInfos(CardName.UNDERTAKER),
              ...player.getPlayedCardInfos(CardName.FARM),
            ],
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.UNDERTAKER)).to.eql(false);
      expect(player.hasCardInCity(CardName.FARM)).to.eql(false);
      expect(player.hasCardInCity(CardName.BARGE_TOAD)).to.eql(true);
      expect(player.hasCardInCity(CardName.CASTLE)).to.eql(true);

      // check that player paid their berries
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
    });
  });

  describe(EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES, () => {
    it("should be able to claim event", () => {
      const event = Event.fromName(
        EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES
      );
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[
        EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES
      ] = null;

      player.addToCity(CardName.COURTHOUSE);
      player.addToCity(CardName.RANGER);
      player.addToCity(CardName.FARM);
      player.addToCity(CardName.POSTAL_PIGEON);
      player.addToCity(CardName.WIFE);
      player.addToCity(CardName.QUEEN);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES]
      ).to.be(undefined);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
          cardOptions: player.getPlayedCritters(),
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            // These are the cards the player wants to remove from their city
            selectedCards: [
              ...player.getPlayedCardInfos(CardName.POSTAL_PIGEON),
              ...player.getPlayedCardInfos(CardName.RANGER),
            ],
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.RANGER)).to.eql(false);
      expect(player.hasCardInCity(CardName.POSTAL_PIGEON)).to.eql(false);
      expect(player.hasCardInCity(CardName.WIFE)).to.eql(true);
      expect(player.hasCardInCity(CardName.QUEEN)).to.eql(true);
      expect(player.hasCardInCity(CardName.COURTHOUSE)).to.eql(true);

      expect(event.getPoints(gameState, player.playerId)).to.be(6);
    });
  });

  describe(EventName.SPECIAL_AN_EVENING_OF_FIREWORKS, () => {
    it("should be able to claim event and store twigs", () => {
      const event = Event.fromName(EventName.SPECIAL_AN_EVENING_OF_FIREWORKS);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS] = null;

      player.addToCity(CardName.LOOKOUT);
      player.addToCity(CardName.MINER_MOLE);
      player.gainResources({ [ResourceType.TWIG]: 3 });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS]
      ).to.be(undefined);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: { [ResourceType.TWIG]: 3 },
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.LOOKOUT)).to.eql(true);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);

      // check that correct resources are on card
      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS];

      if (!eventInfo) {
        throw new Error("invalid event info");
      }
      const storedResources = eventInfo.storedResources;

      if (!storedResources) {
        throw new Error("invalid list of stored resources");
      }
      expect(storedResources).to.eql({
        [ResourceType.TWIG]: 3,
      });

      expect(event.getPoints(gameState, player.playerId)).to.be(6);
    });
    it("should calculate points correctly", () => {
      const event = Event.fromName(EventName.SPECIAL_AN_EVENING_OF_FIREWORKS);
      const player = gameState.getActivePlayer();

      player.claimedEvents[event.name] = {
        storedResources: {},
      };

      expect(() => {
        event.getPoints(gameState, player.playerId);
      }).to.throwException(/invalid number of/i);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 0 },
      };

      expect(event.getPoints(gameState, player.playerId)).to.be(0);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 1 },
      };

      expect(event.getPoints(gameState, player.playerId)).to.be(2);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 2 },
      };

      expect(event.getPoints(gameState, player.playerId)).to.be(4);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 3 },
      };

      expect(event.getPoints(gameState, player.playerId)).to.be(6);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 4 },
      };

      expect(() => {
        event.getPoints(gameState, player.playerId);
      }).to.throwException(/invalid number of/i);
    });
    it("can't put incorrect resources or number of twigs", () => {
      const event = Event.fromName(EventName.SPECIAL_AN_EVENING_OF_FIREWORKS);
      const player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS] = null;

      player.addToCity(CardName.LOOKOUT);
      player.addToCity(CardName.MINER_MOLE);
      player.gainResources({ [ResourceType.TWIG]: 3 });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS]
      ).to.be(undefined);

      gameState = gameState.next(gameInput);

      expect(() => {
        gameState.next({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: { [ResourceType.BERRY]: 3 },
          },
        });
      }).to.throwException();

      expect(() => {
        gameState.next({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: { [ResourceType.TWIG]: 4 },
          },
        });
      }).to.throwException();
    });
  });

  describe(EventName.SPECIAL_PERFORMER_IN_RESIDENCE, () => {
    it("should be able to claim event and store berries", () => {
      const event = Event.fromName(EventName.SPECIAL_PERFORMER_IN_RESIDENCE);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PERFORMER_IN_RESIDENCE] = null;

      player.addToCity(CardName.BARD);
      player.addToCity(CardName.INN);
      player.gainResources({ [ResourceType.BERRY]: 5 });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_PERFORMER_IN_RESIDENCE]
      ).to.be(undefined);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: { [ResourceType.BERRY]: 3 },
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.BARD)).to.eql(true);

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);

      // check that correct resources are on card
      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_PERFORMER_IN_RESIDENCE];

      if (!eventInfo) {
        throw new Error("invalid event info");
      }
      const storedResources = eventInfo.storedResources;

      if (!storedResources) {
        throw new Error("invalid list of stored resources");
      }
      expect(storedResources).to.eql({
        [ResourceType.BERRY]: 3,
      });
      expect(event.getPoints(gameState, player.playerId)).to.be(6);
    });
    it("should calculate points correctly", () => {
      const event = Event.fromName(EventName.SPECIAL_PERFORMER_IN_RESIDENCE);
      const player = gameState.getActivePlayer();

      player.claimedEvents[event.name] = {
        storedResources: {},
      };

      expect(() => {
        event.getPoints(gameState, player.playerId);
      }).to.throwException(/invalid number of/i);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.BERRY]: 0 },
      };

      expect(event.getPoints(gameState, player.playerId)).to.be(0);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.BERRY]: 1 },
      };

      expect(event.getPoints(gameState, player.playerId)).to.be(2);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.BERRY]: 2 },
      };

      expect(event.getPoints(gameState, player.playerId)).to.be(4);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.BERRY]: 3 },
      };

      expect(event.getPoints(gameState, player.playerId)).to.be(6);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.BERRY]: 4 },
      };

      expect(() => {
        event.getPoints(gameState, player.playerId);
      }).to.throwException(/invalid number of/i);
    });
    it("can't put incorrect resources or number of berries", () => {
      const event = Event.fromName(EventName.SPECIAL_PERFORMER_IN_RESIDENCE);
      const player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PERFORMER_IN_RESIDENCE] = null;

      player.addToCity(CardName.BARD);
      player.addToCity(CardName.INN);
      player.gainResources({ [ResourceType.BERRY]: 5 });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_PERFORMER_IN_RESIDENCE]
      ).to.be(undefined);

      gameState = gameState.next(gameInput);

      expect(() => {
        gameState.next({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: { [ResourceType.TWIG]: 3 },
          },
        });
      }).to.throwException();

      expect(() => {
        gameState.next({
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: { [ResourceType.BERRY]: 4 },
          },
        });
      }).to.throwException();
    });
  });

  describe(EventName.SPECIAL_UNDER_NEW_MANAGEMENT, () => {
    it("should be able to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_UNDER_NEW_MANAGEMENT);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_UNDER_NEW_MANAGEMENT] = null;

      player.addToCity(CardName.PEDDLER);
      player.addToCity(CardName.GENERAL_STORE);
      player.gainResources({
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 2,
      });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_UNDER_NEW_MANAGEMENT]
      ).to.be(undefined);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
              [ResourceType.RESIN]: 1,
              [ResourceType.PEBBLE]: 1,
            },
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.PEDDLER)).to.eql(true);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);

      // check that correct resources are on card
      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_UNDER_NEW_MANAGEMENT];

      if (!eventInfo) {
        throw new Error("invalid event info");
      }
      const storedResources = eventInfo.storedResources;

      if (!storedResources) {
        throw new Error("invalid list of stored resources");
      }
      expect(storedResources).to.eql({
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 1,
      });

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(gameState, player.playerId)).to.be(5);
    });
    it("can claim event without having resources", () => {
      const event = Event.fromName(EventName.SPECIAL_UNDER_NEW_MANAGEMENT);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_UNDER_NEW_MANAGEMENT] = null;

      player.addToCity(CardName.PEDDLER);
      player.addToCity(CardName.GENERAL_STORE);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_UNDER_NEW_MANAGEMENT]
      ).to.be(undefined);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: {},
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.PEDDLER)).to.eql(true);

      // check that correct resources are on card
      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_UNDER_NEW_MANAGEMENT];

      if (!eventInfo) {
        throw new Error("invalid event info");
      }
      const storedResources = eventInfo.storedResources;

      if (!storedResources) {
        throw new Error("invalid list of stored resources");
      }
      expect(storedResources).to.eql({});

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(gameState, player.playerId)).to.be(0);
    });
    it("can claim event without placing resources", () => {
      const event = Event.fromName(EventName.SPECIAL_UNDER_NEW_MANAGEMENT);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_UNDER_NEW_MANAGEMENT] = null;

      player.addToCity(CardName.PEDDLER);
      player.addToCity(CardName.GENERAL_STORE);
      player.gainResources({
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 2,
      });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_UNDER_NEW_MANAGEMENT]
      ).to.be(undefined);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: {},
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.PEDDLER)).to.eql(true);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(3);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);

      // check that correct resources are on card
      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_UNDER_NEW_MANAGEMENT];

      if (!eventInfo) {
        throw new Error("invalid event info");
      }
      const storedResources = eventInfo.storedResources;

      if (!storedResources) {
        throw new Error("invalid list of stored resources");
      }
      expect(storedResources).to.eql({});

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(gameState, player.playerId)).to.be(0);
    });
    it("should calculate points correctly", () => {
      const event = Event.fromName(EventName.SPECIAL_UNDER_NEW_MANAGEMENT);
      const player = gameState.getActivePlayer();

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 0, [ResourceType.BERRY]: 0 },
      };

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(gameState, player.playerId)).to.be(0);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 1, [ResourceType.BERRY]: 1 },
      };

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(gameState, player.playerId)).to.be(2);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.RESIN]: 1, [ResourceType.BERRY]: 1 },
      };

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(gameState, player.playerId)).to.be(3);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 1, [ResourceType.BERRY]: 2 },
      };

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(gameState, player.playerId)).to.be(3);

      player.claimedEvents[event.name] = {
        storedResources: {},
      };

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(gameState, player.playerId)).to.be(0);
    });
  });
  describe(EventName.SPECIAL_PRISTINE_CHAPEL_CEILING, () => {
    it("should be able to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_PRISTINE_CHAPEL_CEILING);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PRISTINE_CHAPEL_CEILING] = null;

      player.addToCity(CardName.WOODCARVER);
      player.addToCity(CardName.CHAPEL);
      player.getPlayedCardInfos(CardName.CHAPEL).forEach((info) => {
        info.resources = { [ResourceType.VP]: 2 };
      });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_PRISTINE_CHAPEL_CEILING]
      ).to.be(undefined);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
          maxResources: 2,
          minResources: 0,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
              [ResourceType.RESIN]: 1,
            },
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.CHAPEL)).to.eql(true);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(event.getPoints(gameState, player.playerId)).to.be(4);
    });
    it("if no resources on chapel, claim event but don't get points or resources", () => {
      const event = Event.fromName(EventName.SPECIAL_PRISTINE_CHAPEL_CEILING);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PRISTINE_CHAPEL_CEILING] = null;

      player.addToCity(CardName.WOODCARVER);
      player.addToCity(CardName.CHAPEL);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_PRISTINE_CHAPEL_CEILING]
      ).to.be(undefined);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
          maxResources: 0,
          minResources: 0,
          clientOptions: {
            resources: {},
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.CHAPEL)).to.eql(true);

      // 2pts per VP on Chapel -> if no VP on chapel, then no points
      expect(event.getPoints(gameState, player.playerId)).to.be(0);
    });
  });

  describe(EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED, () => {
    it("should be able to claim event and store 5/5 revealed cards", () => {
      const event = Event.fromName(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED] = null;

      player.addToCity(CardName.HISTORIAN);
      player.addToCity(CardName.RUINS);

      // add cards to deck so we know what cards were drawn
      gameState.deck.addToStack(CardName.KING);
      gameState.deck.addToStack(CardName.QUEEN);
      gameState.deck.addToStack(CardName.POSTAL_PIGEON);
      gameState.deck.addToStack(CardName.FOOL);
      gameState.deck.addToStack(CardName.QUEEN);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED]
      ).to.be(undefined);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
          maxToSelect: 5,
          minToSelect: 0,
          cardOptions: [
            CardName.QUEEN,
            CardName.FOOL,
            CardName.POSTAL_PIGEON,
            CardName.QUEEN,
            CardName.KING,
          ],
          clientOptions: {
            selectedCards: [],
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // player should have 0 cards in hand
      expect(player.cardsInHand.length).to.be(0);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED];

      if (!eventInfo) {
        throw new Error("invalid event info");
      }
      const storedCards = eventInfo.storedCards;

      if (!storedCards) {
        throw new Error("invalid list of stored cards");
      }
      expect(storedCards).to.eql([
        CardName.QUEEN,
        CardName.FOOL,
        CardName.POSTAL_PIGEON,
        CardName.QUEEN,
        CardName.KING,
      ]);
      expect(event.getPoints(gameState, player.playerId)).to.be(5);
    });
    it("should be able to claim event and store subset of revealed cards", () => {
      const event = Event.fromName(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED] = null;

      player.addToCity(CardName.HISTORIAN);
      player.addToCity(CardName.RUINS);

      // add cards to deck so we know what cards were drawn
      gameState.deck.addToStack(CardName.KING);
      gameState.deck.addToStack(CardName.QUEEN);
      gameState.deck.addToStack(CardName.POSTAL_PIGEON);
      gameState.deck.addToStack(CardName.FOOL);
      gameState.deck.addToStack(CardName.QUEEN);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED]
      ).to.be(undefined);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
          maxToSelect: 5,
          minToSelect: 0,
          cardOptions: [
            CardName.QUEEN,
            CardName.FOOL,
            CardName.POSTAL_PIGEON,
            CardName.QUEEN,
            CardName.KING,
          ],
          clientOptions: {
            selectedCards: [CardName.QUEEN, CardName.KING],
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // player should have Queen and King
      expect(player.cardsInHand).to.eql([CardName.QUEEN, CardName.KING]);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED];

      if (!eventInfo) {
        throw new Error("invalid event info");
      }
      const storedCards = eventInfo.storedCards;

      if (!storedCards) {
        throw new Error("invalid list of stored cards");
      }
      expect(storedCards).to.eql([
        CardName.FOOL,
        CardName.POSTAL_PIGEON,
        CardName.QUEEN,
      ]);

      expect(event.getPoints(gameState, player.playerId)).to.be(3);
    });
    it("should be able to claim event and take all revealed cards into hand", () => {
      const event = Event.fromName(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED] = null;

      player.addToCity(CardName.HISTORIAN);
      player.addToCity(CardName.RUINS);

      // add cards to deck so we know what cards were drawn
      gameState.deck.addToStack(CardName.KING);
      gameState.deck.addToStack(CardName.QUEEN);
      gameState.deck.addToStack(CardName.POSTAL_PIGEON);
      gameState.deck.addToStack(CardName.FOOL);
      gameState.deck.addToStack(CardName.QUEEN);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED]
      ).to.be(undefined);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED,
          maxToSelect: 5,
          minToSelect: 0,
          cardOptions: [
            CardName.QUEEN,
            CardName.FOOL,
            CardName.POSTAL_PIGEON,
            CardName.QUEEN,
            CardName.KING,
          ],
          // player takes all revealed cards
          clientOptions: {
            selectedCards: [
              CardName.QUEEN,
              CardName.FOOL,
              CardName.POSTAL_PIGEON,
              CardName.QUEEN,
              CardName.KING,
            ],
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      expect(player.cardsInHand).to.eql([
        CardName.QUEEN,
        CardName.FOOL,
        CardName.POSTAL_PIGEON,
        CardName.QUEEN,
        CardName.KING,
      ]);

      const eventInfo =
        player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED];

      if (!eventInfo) {
        throw new Error("invalid event info");
      }
      const storedCards = eventInfo.storedCards;

      if (!storedCards) {
        throw new Error("invalid list of stored cards");
      }
      expect(storedCards).to.eql([]);

      expect(event.getPoints(gameState, player.playerId)).to.be(0);
    });
    it("should not be able to claim event if missing cards", () => {
      const event = Event.fromName(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );
      const player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED] = null;

      player.addToCity(CardName.HISTORIAN);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(
        player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED]
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need to have played/i);
      expect(
        player.claimedEvents[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED]
      ).to.be(undefined);
    });
  });

  describe(EventName.SPECIAL_TAX_RELIEF, () => {
    it("should be able to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_TAX_RELIEF);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_TAX_RELIEF] = null;

      player.addToCity(CardName.JUDGE);
      player.addToCity(CardName.QUEEN);

      expect(player.claimedEvents[EventName.SPECIAL_TAX_RELIEF]).to.be(
        undefined
      );

      gameState = gameState.next(gameInput);

      player = gameState.getPlayer(player.playerId);

      expect(player.claimedEvents[EventName.SPECIAL_TAX_RELIEF]);
      expect(event.getPoints(gameState, player.playerId)).to.be(3);
    });

    it("should activate production when claimed", () => {
      const event = Event.fromName(EventName.SPECIAL_TAX_RELIEF);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_TAX_RELIEF] = null;

      player.addToCity(CardName.JUDGE);
      player.addToCity(CardName.QUEEN);
      player.addToCity(CardName.FARM);

      expect(player.claimedEvents[EventName.SPECIAL_TAX_RELIEF]).to.be(
        undefined
      );
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

      gameState = gameState.next(gameInput);

      player = gameState.getPlayer(player.playerId);

      expect(player.claimedEvents[EventName.SPECIAL_TAX_RELIEF]);
      expect(event.getPoints(gameState, player.playerId)).to.be(3);

      // indicates that production was activated
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
    });
  });

  describe(EventName.SPECIAL_A_WEE_RUN_CITY, () => {
    it("should be able to claim event + recall 1 worker", () => {
      const event = Event.fromName(EventName.SPECIAL_A_WEE_RUN_CITY);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_A_WEE_RUN_CITY] = null;

      player.addToCity(CardName.CHIP_SWEEP);
      player.addToCity(CardName.CLOCK_TOWER);

      gameState.locationsMap[LocationName.BASIC_ONE_BERRY]!.push(
        player.playerId
      );

      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
      expect(player.numAvailableWorkers).to.be(1);

      const recallableWorkers = player.getRecallableWorkers();

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_WORKER_PLACEMENT,
          prevInputType: gameInput.inputType,
          options: [
            { location: LocationName.BASIC_ONE_BERRY },
            { event: EventName.SPECIAL_A_WEE_RUN_CITY },
          ],
          eventContext: event.name,
          mustSelectOne: true,
          clientOptions: {
            selectedOption: { location: LocationName.BASIC_ONE_BERRY },
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);
      expect(player.numAvailableWorkers).to.be(1);
      expect(event.getPoints(gameState, player.playerId)).to.be(4);
    });
    it("should allow player to reclaim worker on event", () => {
      const event = Event.fromName(EventName.SPECIAL_A_WEE_RUN_CITY);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_A_WEE_RUN_CITY] = null;

      player.addToCity(CardName.CHIP_SWEEP);
      player.addToCity(CardName.CLOCK_TOWER);

      gameState.locationsMap[LocationName.BASIC_ONE_BERRY]!.push(
        player.playerId
      );

      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_WORKER_PLACEMENT,
          prevInputType: gameInput.inputType,
          options: [
            { location: LocationName.BASIC_ONE_BERRY },
            { event: EventName.SPECIAL_A_WEE_RUN_CITY },
          ],
          eventContext: event.name,
          mustSelectOne: true,
          clientOptions: {
            selectedOption: { event: EventName.SPECIAL_A_WEE_RUN_CITY },
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // should still be 1 because one worker is still on the basic location
      expect(player.numAvailableWorkers).to.be(1);
      expect(event.getPoints(gameState, player.playerId)).to.be(4);
    });
    it("should be claimable even if player hadn't yet placed workers", () => {
      const event = Event.fromName(EventName.SPECIAL_A_WEE_RUN_CITY);
      let player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_A_WEE_RUN_CITY] = null;

      player.addToCity(CardName.CHIP_SWEEP);
      player.addToCity(CardName.CLOCK_TOWER);

      expect(player.numAvailableWorkers).to.be(2);

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_WORKER_PLACEMENT,
          prevInputType: gameInput.inputType,
          options: [{ event: EventName.SPECIAL_A_WEE_RUN_CITY }],
          eventContext: event.name,
          mustSelectOne: true,
          clientOptions: {
            selectedOption: { event: EventName.SPECIAL_A_WEE_RUN_CITY },
          },
        },
      ]);
      player = gameState.getPlayer(player.playerId);

      // should still be 1 because one worker is still on the basic location
      expect(player.numAvailableWorkers).to.be(2);
      expect(event.getPoints(gameState, player.playerId)).to.be(4);
    });
  });
});
