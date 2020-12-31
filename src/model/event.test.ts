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
} from "./types";

const claimEventInput = (event: EventName): GameInputClaimEvent => {
  return {
    inputType: GameInputType.CLAIM_EVENT,
    event,
  };
};

describe("Event", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = testInitialGameState();
  });

  describe("fromName", () => {
    it("should return the expect Event instances", () => {
      for (const evt in EventName) {
        expect(Event.fromName(evt as EventName).name).to.be(evt);
      }
    });
  });

  describe(EventName.BASIC_FOUR_PRODUCTION_TAGS, () => {
    it("should only be playable with four production tags", () => {
      const event = Event.fromName(EventName.BASIC_FOUR_PRODUCTION_TAGS);
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
      expect(player.claimedEvents[EventName.BASIC_FOUR_PRODUCTION_TAGS]);
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

  describe(EventName.SPECIAL_CROAK_WART_CURE, () => {
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
      ).to.eql({ storedCards: [], hasWorker: true });
      expect(gameState2.pendingGameInputs).to.eql([
        {
          inputType: GameInputType.SELECT_MULTIPLE_CARDS,
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
        inputType: GameInputType.SELECT_MULTIPLE_CARDS,
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
        storedCards: ["POSTAL_PIGEON", "HUSBAND", "WIFE"],
        hasWorker: true,
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

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(player.claimedEvents[EventName.SPECIAL_CROAK_WART_CURE]).to.be(
        undefined
      );

      gameState = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_MULTIPLE_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_CROAK_WART_CURE,
          cardOptions: [
            CardName.UNDERTAKER,
            CardName.BARGE_TOAD,
            CardName.FARM,
            CardName.CASTLE,
          ],
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            // these are the cards the player wants to remove
            // from their city
            selectedCards: [CardName.UNDERTAKER, CardName.FARM],
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
    it("game state", () => {
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
          inputType: GameInputType.SELECT_MULTIPLE_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
          cardOptions: [
            CardName.RANGER,
            CardName.POSTAL_PIGEON,
            CardName.WIFE,
            CardName.QUEEN,
          ],
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            // these are the cards the player wants to remove
            // from their city
            selectedCards: [CardName.POSTAL_PIGEON, CardName.RANGER],
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
    });
  });

  describe(EventName.SPECIAL_AN_EVENING_OF_FIREWORKS, () => {
    it("game state", () => {
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
    });
  });

  describe(EventName.SPECIAL_PERFORMER_IN_RESIDENCE, () => {
    it("game state", () => {
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
    });
  });

  describe(EventName.SPECIAL_UNDER_NEW_MANAGEMENT, () => {
    it("game state", () => {
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
    });
  });
  describe(EventName.SPECIAL_PRISTINE_CHAPEL_CEILING, () => {
    it("game state", () => {
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
    });
  });
});
