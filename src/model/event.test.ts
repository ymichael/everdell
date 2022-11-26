import expect from "expect.js";
import { Event, initialEventMap } from "./event";
import { Player } from "./player";
import { Card } from "./card";
import { GameState } from "./gameState";
import { testInitialGameState, multiStepGameInputTest } from "./testHelpers";
import {
  ExpansionType,
  EventName,
  GameInputType,
  GameInputClaimEvent,
  CardName,
  ResourceType,
  LocationName,
  CardType,
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
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState();
    player = gameState.getActivePlayer();
  });

  describe("fromName", () => {
    it("should return the expect Event instances", () => {
      Object.values(EventName).forEach((evt) => {
        expect(Event.fromName(evt as EventName).name).to.be(evt);
      });
    });
  });

  describe("initialEventMap", () => {
    it("should not include pearlbrook events if not playing with pearlbrook", () => {
      const eventsMap = initialEventMap({ pearlbrook: false });
      expect(
        Object.keys(eventsMap).filter((eventName) => {
          return (
            Event.fromName(eventName as EventName).expansion ===
            ExpansionType.PEARLBROOK
          );
        })
      ).to.eql([]);
    });

    it("should include at least 1 pearlbrook event if playing with pearlbrook", () => {
      const eventsMap = initialEventMap({ pearlbrook: true });
      expect(
        Object.keys(eventsMap).filter((eventName) => {
          return (
            Event.fromName(eventName as EventName).expansion ===
            ExpansionType.PEARLBROOK
          );
        }).length >= 1
      ).to.be(true);
    });
  });

  it("should be able to claim 2 events in one season", () => {
    player.addToCity(gameState, CardName.MINE);
    player.addToCity(gameState, CardName.GENERAL_STORE);
    player.addToCity(gameState, CardName.FARM);
    player.addToCity(gameState, CardName.FARM);

    [player, gameState] = multiStepGameInputTest(gameState, [
      claimEventInput(EventName.BASIC_FOUR_PRODUCTION),
    ]);

    expect(player.getNumClaimedEvents() == 1).to.be(true);

    player.addToCity(gameState, CardName.UNIVERSITY);
    player.addToCity(gameState, CardName.QUEEN);
    player.addToCity(gameState, CardName.LOOKOUT);
    gameState.nextPlayer();

    [player, gameState] = multiStepGameInputTest(gameState, [
      claimEventInput(EventName.BASIC_THREE_DESTINATION),
    ]);

    expect(player.getNumClaimedEvents() == 2).to.be(true);
  });

  describe(EventName.BASIC_FOUR_PRODUCTION, () => {
    it("should only be playable with four production tags", () => {
      const event = Event.fromName(EventName.BASIC_FOUR_PRODUCTION);
      const gameInput = claimEventInput(event.name);

      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(gameState, CardName.MINE);
      player.addToCity(gameState, CardName.MINE);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      expect(player.getNumClaimedEvents() == 0).to.be(true);

      event.play(gameState, gameInput);
      expect(player.getClaimedEvent(EventName.BASIC_FOUR_PRODUCTION));
      expect(player.getNumClaimedEvents() == 1).to.be(true);
    });
  });

  describe(EventName.BASIC_THREE_DESTINATION, () => {
    it("should only be playable with three destination tags", () => {
      const event = Event.fromName(EventName.BASIC_THREE_DESTINATION);
      const gameInput = claimEventInput(event.name);

      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(gameState, CardName.UNIVERSITY);
      player.addToCity(gameState, CardName.QUEEN);
      player.addToCity(gameState, CardName.LOOKOUT);
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      expect(player.getNumClaimedEvents() == 0).to.be(true);

      event.play(gameState, gameInput);
      expect(player.getClaimedEvent(EventName.BASIC_THREE_DESTINATION));
      expect(player.getNumClaimedEvents() == 1).to.be(true);
    });
  });

  describe(EventName.BASIC_THREE_TRAVELER, () => {
    it("should only be playable with three traverler tags", () => {
      const event = Event.fromName(EventName.BASIC_THREE_TRAVELER);
      const gameInput = claimEventInput(event.name);

      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(gameState, CardName.WANDERER);
      player.addToCity(gameState, CardName.WANDERER);
      player.addToCity(gameState, CardName.RANGER);
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      expect(player.getNumClaimedEvents() == 0).to.be(true);

      event.play(gameState, gameInput);
      expect(player.getClaimedEvent(EventName.BASIC_THREE_TRAVELER));
      expect(player.getNumClaimedEvents() == 1).to.be(true);
    });
  });

  describe(EventName.BASIC_THREE_GOVERNANCE, () => {
    it("should only be playable with three governance tags", () => {
      const event = Event.fromName(EventName.BASIC_THREE_GOVERNANCE);
      const gameInput = claimEventInput(event.name);

      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(gameState, CardName.JUDGE);
      player.addToCity(gameState, CardName.HISTORIAN);
      player.addToCity(gameState, CardName.INNKEEPER);
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      expect(player.getNumClaimedEvents() == 0).to.be(true);

      event.play(gameState, gameInput);
      expect(player.getClaimedEvent(EventName.BASIC_THREE_GOVERNANCE));
      expect(player.getNumClaimedEvents() == 1).to.be(true);
    });
  });

  describe(EventName.SPECIAL_THE_EVERDELL_GAMES, () => {
    it("should only be playable with 2 of each tags", () => {
      const event = Event.fromName(EventName.SPECIAL_THE_EVERDELL_GAMES);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_THE_EVERDELL_GAMES] = null;

      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(gameState, CardName.JUDGE);
      player.addToCity(gameState, CardName.HISTORIAN);
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(gameState, CardName.WANDERER);
      player.addToCity(gameState, CardName.WANDERER);
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(gameState, CardName.QUEEN);
      player.addToCity(gameState, CardName.LOOKOUT);
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(gameState, CardName.KING);
      player.addToCity(gameState, CardName.WIFE);
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      expect(player.getNumClaimedEvents() == 0).to.be(true);

      event.play(gameState, gameInput);
      expect(player.getClaimedEvent(EventName.SPECIAL_THE_EVERDELL_GAMES));
      expect(player.getNumClaimedEvents() == 1).to.be(true);
    });
  });

  describe(EventName.SPECIAL_GRADUATION_OF_SCHOLARS, () => {
    it("game state", () => {
      const event = Event.fromName(EventName.SPECIAL_GRADUATION_OF_SCHOLARS);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_GRADUATION_OF_SCHOLARS] = null;
      player.addToCity(gameState, CardName.TEACHER);
      player.addToCity(gameState, CardName.UNIVERSITY);

      player.cardsInHand = [
        CardName.POSTAL_PIGEON,
        CardName.HUSBAND,
        CardName.WIFE,
        CardName.FOOL,
        CardName.FARM,
      ];

      // Check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // Try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_GRADUATION_OF_SCHOLARS)
      ).to.be(undefined);

      expect(event.canPlay(gameState, gameInput)).to.be(true);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
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
            selectedCards: [
              CardName.POSTAL_PIGEON,
              CardName.HUSBAND,
              CardName.WIFE,
            ],
          },
        },
      ]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_GRADUATION_OF_SCHOLARS)
      ).to.eql({
        storedCards: [CardName.POSTAL_PIGEON, CardName.HUSBAND, CardName.WIFE],
      });
    });
  });

  describe(EventName.SPECIAL_FLYING_DOCTOR_SERVICE, () => {
    it("should score based on number of HUSBAND/WIFE pairs in the game", () => {
      const event = Event.fromName(EventName.SPECIAL_FLYING_DOCTOR_SERVICE);
      const gameInput = claimEventInput(event.name);

      expect(event.canPlay(gameState, gameInput)).to.be(false);

      gameState.eventsMap[EventName.SPECIAL_FLYING_DOCTOR_SERVICE] = null;
      player.addToCity(gameState, CardName.DOCTOR);
      player.addToCity(gameState, CardName.POSTAL_PIGEON);

      // Check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // Try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_FLYING_DOCTOR_SERVICE)
      ).to.be(undefined);
      expect(event.canPlay(gameState, gameInput)).to.be(true);
      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_FLYING_DOCTOR_SERVICE)
      ).to.eql({});

      expect(event.getPoints(player, gameState)).to.be(0);
      gameState.players.forEach((p) => {
        p.addToCity(gameState, CardName.WIFE);
        p.addToCity(gameState, CardName.HUSBAND);
      });
      expect(event.getPoints(player, gameState)).to.be(
        gameState.players.length * 3
      );
      expect(player.getPoints(gameState)).to.be(
        gameState.players.length * 3 + // event
          Card.fromName(CardName.DOCTOR).baseVP +
          Card.fromName(CardName.POSTAL_PIGEON).baseVP +
          Card.fromName(CardName.HUSBAND).baseVP +
          Card.fromName(CardName.WIFE).baseVP +
          3 // bonus from HUSBAND + WIFE
      );
    });
  });

  describe(EventName.SPECIAL_CROAK_WART_CURE, () => {
    it("game state", () => {
      const event = Event.fromName(EventName.SPECIAL_CROAK_WART_CURE);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_CROAK_WART_CURE] = null;
      player.gainResources(gameState, { [ResourceType.BERRY]: 2 });

      player.addToCity(gameState, CardName.UNDERTAKER);
      player.addToCity(gameState, CardName.BARGE_TOAD);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.CASTLE);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // Make sure this event works even if the player only has 1 worker left
      while (player.numAvailableWorkers !== 1) {
        player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
      }

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(player.getClaimedEvent(EventName.SPECIAL_CROAK_WART_CURE)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_CROAK_WART_CURE,
          cardOptions: player.getPlayedCards(),
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            // these are the cards the player wants to remove
            // from their city
            selectedCards: [
              ...player.getPlayedCardForCardName(CardName.UNDERTAKER),
              ...player.getPlayedCardForCardName(CardName.FARM),
            ],
          },
        },
      ]);

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
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[
        EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES
      ] = null;

      player.addToCity(gameState, CardName.COURTHOUSE);
      player.addToCity(gameState, CardName.RANGER);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.POSTAL_PIGEON);
      player.addToCity(gameState, CardName.WIFE);
      player.addToCity(gameState, CardName.QUEEN);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
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
              ...player.getPlayedCardForCardName(CardName.POSTAL_PIGEON),
              ...player.getPlayedCardForCardName(CardName.RANGER),
            ],
          },
        },
      ]);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.RANGER)).to.eql(false);
      expect(player.hasCardInCity(CardName.POSTAL_PIGEON)).to.eql(false);
      expect(player.hasCardInCity(CardName.WIFE)).to.eql(true);
      expect(player.hasCardInCity(CardName.QUEEN)).to.eql(true);
      expect(player.hasCardInCity(CardName.COURTHOUSE)).to.eql(true);

      expect(event.getPoints(player, gameState)).to.be(6);
    });
  });

  describe(EventName.SPECIAL_AN_EVENING_OF_FIREWORKS, () => {
    it("should be able to claim event and store twigs", () => {
      const event = Event.fromName(EventName.SPECIAL_AN_EVENING_OF_FIREWORKS);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS] = null;

      player.addToCity(gameState, CardName.LOOKOUT);
      player.addToCity(gameState, CardName.MINER_MOLE);
      player.gainResources(gameState, { [ResourceType.TWIG]: 3 });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_AN_EVENING_OF_FIREWORKS)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: true,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_AN_EVENING_OF_FIREWORKS,
          specificResource: ResourceType.TWIG,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: { [ResourceType.TWIG]: 3 },
          },
        },
      ]);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.LOOKOUT)).to.eql(true);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);

      // check that correct resources are on card
      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_AN_EVENING_OF_FIREWORKS
      );

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

      expect(event.getPoints(player, gameState)).to.be(6);
    });

    it("should calculate points correctly", () => {
      const event = Event.fromName(EventName.SPECIAL_AN_EVENING_OF_FIREWORKS);

      player.claimedEvents[event.name] = {
        storedResources: {},
      };

      expect(() => {
        event.getPoints(player, gameState);
      }).to.throwException(/invalid number of/i);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 0 },
      };

      expect(event.getPoints(player, gameState)).to.be(0);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 1 },
      };

      expect(event.getPoints(player, gameState)).to.be(2);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 2 },
      };

      expect(event.getPoints(player, gameState)).to.be(4);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 3 },
      };

      expect(event.getPoints(player, gameState)).to.be(6);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 4 },
      };

      expect(() => {
        event.getPoints(player, gameState);
      }).to.throwException(/invalid number of/i);
    });

    it("can't put incorrect resources or number of twigs", () => {
      const event = Event.fromName(EventName.SPECIAL_AN_EVENING_OF_FIREWORKS);

      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_AN_EVENING_OF_FIREWORKS] = null;

      player.addToCity(gameState, CardName.LOOKOUT);
      player.addToCity(gameState, CardName.MINER_MOLE);
      player.gainResources(gameState, { [ResourceType.TWIG]: 3 });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_AN_EVENING_OF_FIREWORKS)
      ).to.be(undefined);

      gameState = gameState.next(gameInput);

      expect(() => {
        gameState.next({
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: true,
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
          toSpend: true,
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
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PERFORMER_IN_RESIDENCE] = null;

      player.addToCity(gameState, CardName.BARD);
      player.addToCity(gameState, CardName.INN);
      player.gainResources(gameState, { [ResourceType.BERRY]: 5 });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_PERFORMER_IN_RESIDENCE)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: true,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
          specificResource: ResourceType.BERRY,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: { [ResourceType.BERRY]: 3 },
          },
        },
      ]);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.BARD)).to.eql(true);

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);

      // check that correct resources are on card
      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_PERFORMER_IN_RESIDENCE
      );

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
      expect(event.getPoints(player, gameState)).to.be(6);
    });

    it("should calculate points correctly", () => {
      const event = Event.fromName(EventName.SPECIAL_PERFORMER_IN_RESIDENCE);

      player.claimedEvents[event.name] = {
        storedResources: {},
      };

      expect(() => {
        event.getPoints(player, gameState);
      }).to.throwException(/invalid number of/i);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.BERRY]: 0 },
      };

      expect(event.getPoints(player, gameState)).to.be(0);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.BERRY]: 1 },
      };

      expect(event.getPoints(player, gameState)).to.be(2);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.BERRY]: 2 },
      };

      expect(event.getPoints(player, gameState)).to.be(4);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.BERRY]: 3 },
      };

      expect(event.getPoints(player, gameState)).to.be(6);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.BERRY]: 4 },
      };

      expect(() => {
        event.getPoints(player, gameState);
      }).to.throwException(/invalid number of/i);
    });

    it("can't put incorrect resources or number of berries", () => {
      const event = Event.fromName(EventName.SPECIAL_PERFORMER_IN_RESIDENCE);

      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PERFORMER_IN_RESIDENCE] = null;

      player.addToCity(gameState, CardName.BARD);
      player.addToCity(gameState, CardName.INN);
      player.gainResources(gameState, { [ResourceType.BERRY]: 5 });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_PERFORMER_IN_RESIDENCE)
      ).to.be(undefined);

      gameState = gameState.next(gameInput);

      expect(() => {
        gameState.next({
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: true,
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
          toSpend: true,
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
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_UNDER_NEW_MANAGEMENT] = null;

      player.addToCity(gameState, CardName.PEDDLER);
      player.addToCity(gameState, CardName.GENERAL_STORE);
      player.gainResources(gameState, {
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 2,
      });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_UNDER_NEW_MANAGEMENT)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: true,
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

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.PEDDLER)).to.eql(true);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);

      // check that correct resources are on card
      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_UNDER_NEW_MANAGEMENT
      );

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
      expect(event.getPoints(player, gameState)).to.be(5);
    });

    it("can claim event without having resources", () => {
      const event = Event.fromName(EventName.SPECIAL_UNDER_NEW_MANAGEMENT);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_UNDER_NEW_MANAGEMENT] = null;

      player.addToCity(gameState, CardName.PEDDLER);
      player.addToCity(gameState, CardName.GENERAL_STORE);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_UNDER_NEW_MANAGEMENT)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: true,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: {},
          },
        },
      ]);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.PEDDLER)).to.eql(true);

      // check that correct resources are on card
      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_UNDER_NEW_MANAGEMENT
      );

      if (!eventInfo) {
        throw new Error("invalid event info");
      }
      const storedResources = eventInfo.storedResources;

      if (!storedResources) {
        throw new Error("invalid list of stored resources");
      }
      expect(storedResources).to.eql({});

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(player, gameState)).to.be(0);
    });

    it("can claim event without placing resources", () => {
      const event = Event.fromName(EventName.SPECIAL_UNDER_NEW_MANAGEMENT);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_UNDER_NEW_MANAGEMENT] = null;

      player.addToCity(gameState, CardName.PEDDLER);
      player.addToCity(gameState, CardName.GENERAL_STORE);
      player.gainResources(gameState, {
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 2,
      });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_UNDER_NEW_MANAGEMENT)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: true,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_UNDER_NEW_MANAGEMENT,
          maxResources: 3,
          minResources: 0,
          clientOptions: {
            resources: {},
          },
        },
      ]);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.PEDDLER)).to.eql(true);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(3);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);

      // check that correct resources are on card
      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_UNDER_NEW_MANAGEMENT
      );

      if (!eventInfo) {
        throw new Error("invalid event info");
      }
      const storedResources = eventInfo.storedResources;

      if (!storedResources) {
        throw new Error("invalid list of stored resources");
      }
      expect(storedResources).to.eql({});

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(player, gameState)).to.be(0);
    });

    it("should calculate points correctly", () => {
      const event = Event.fromName(EventName.SPECIAL_UNDER_NEW_MANAGEMENT);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 0, [ResourceType.BERRY]: 0 },
      };

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(player, gameState)).to.be(0);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 1, [ResourceType.BERRY]: 1 },
      };

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(player, gameState)).to.be(2);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.RESIN]: 1, [ResourceType.BERRY]: 1 },
      };

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(player, gameState)).to.be(3);

      player.claimedEvents[event.name] = {
        storedResources: { [ResourceType.TWIG]: 1, [ResourceType.BERRY]: 2 },
      };

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(player, gameState)).to.be(3);

      player.claimedEvents[event.name] = {
        storedResources: {},
      };

      // 1 pt per twig and berry, 2 pts per resin and pebble
      expect(event.getPoints(player, gameState)).to.be(0);
    });
  });

  describe(EventName.SPECIAL_PRISTINE_CHAPEL_CEILING, () => {
    it("should be able to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_PRISTINE_CHAPEL_CEILING);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PRISTINE_CHAPEL_CEILING] = null;

      player.addToCity(gameState, CardName.WOODCARVER);
      player.addToCity(gameState, CardName.CHAPEL);
      player.getPlayedCardForCardName(CardName.CHAPEL).forEach((info) => {
        info.resources = { [ResourceType.VP]: 2 };
      });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_PRISTINE_CHAPEL_CEILING)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: false,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
          maxResources: 2,
          minResources: 2,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
              [ResourceType.RESIN]: 1,
            },
          },
        },
      ]);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.CHAPEL)).to.eql(true);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(event.getPoints(player, gameState)).to.be(4);
    });

    it("if no resources on chapel, claim event but don't get points or resources", () => {
      const event = Event.fromName(EventName.SPECIAL_PRISTINE_CHAPEL_CEILING);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PRISTINE_CHAPEL_CEILING] = null;

      player.addToCity(gameState, CardName.WOODCARVER);
      player.addToCity(gameState, CardName.CHAPEL);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_PRISTINE_CHAPEL_CEILING)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.CHAPEL)).to.eql(true);

      // 2pts per VP on Chapel -> if no VP on chapel, then no points
      expect(event.getPoints(player, gameState)).to.be(0);
    });

    it("should handle case where there is no chapel in city", () => {
      const event = Event.fromName(EventName.SPECIAL_PRISTINE_CHAPEL_CEILING);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PRISTINE_CHAPEL_CEILING] = null;

      player.addToCity(gameState, CardName.WOODCARVER);
      player.addToCity(gameState, CardName.CHAPEL);
      player.getPlayedCardForCardName(CardName.CHAPEL).forEach((info) => {
        info.resources = { [ResourceType.VP]: 2 };
      });

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_PRISTINE_CHAPEL_CEILING)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_RESOURCES,
          toSpend: false,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_PRISTINE_CHAPEL_CEILING,
          maxResources: 2,
          minResources: 2,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 1,
              [ResourceType.RESIN]: 1,
            },
          },
        },
      ]);

      // check to make sure the right cards are still in the city
      expect(player.hasCardInCity(CardName.CHAPEL)).to.eql(true);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(event.getPoints(player, gameState)).to.be(4);

      player.removeCardFromCity(
        gameState,
        player.getFirstPlayedCard(CardName.CHAPEL)
      );

      expect(event.getPoints(player, gameState)).to.be(0);
    });
  });

  describe(EventName.SPECIAL_REMEMBERING_THE_FALLEN, () => {
    it("should be able to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_REMEMBERING_THE_FALLEN);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_REMEMBERING_THE_FALLEN] = null;

      player.addToCity(gameState, CardName.CEMETARY);
      player.addToCity(gameState, CardName.SHEPHERD);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_REMEMBERING_THE_FALLEN)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(event.getPoints(player, gameState)).to.be(0);
    });
    it("should calculate points correctly", () => {
      const event = Event.fromName(EventName.SPECIAL_REMEMBERING_THE_FALLEN);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_REMEMBERING_THE_FALLEN] = null;

      player.addToCity(gameState, CardName.CEMETARY);
      player.addToCity(gameState, CardName.SHEPHERD);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_REMEMBERING_THE_FALLEN)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      // no workers on cards = 0 points
      expect(event.getPoints(player, gameState)).to.be(0);

      // place 1st worker on card
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.CEMETARY)
      );
      expect(event.getPoints(player, gameState)).to.be(3);
      expect(player.numAvailableWorkers).to.be(0);

      // take back worker so we can test case where cemetary has 2 workers
      const recallableWorkers = player.getRecallableWorkers();
      player.recallWorker(gameState, recallableWorkers[0]);

      // place a 2nd worker on card; requires having undertaker in city
      player.addToCity(gameState, CardName.UNDERTAKER);
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.CEMETARY)
      );
      expect(event.getPoints(player, gameState)).to.be(6);
    });
    it("should handle case when no cemetery in city", () => {
      const event = Event.fromName(EventName.SPECIAL_REMEMBERING_THE_FALLEN);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_REMEMBERING_THE_FALLEN] = null;

      player.addToCity(gameState, CardName.CEMETARY);
      player.addToCity(gameState, CardName.SHEPHERD);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_REMEMBERING_THE_FALLEN)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      // no workers on cards = 0 points
      expect(event.getPoints(player, gameState)).to.be(0);

      // place 1st worker on card
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.CEMETARY)
      );
      expect(event.getPoints(player, gameState)).to.be(3);
      expect(player.numAvailableWorkers).to.be(0);

      player.removeCardFromCity(
        gameState,
        player.getFirstPlayedCard(CardName.CEMETARY)
      );

      expect(event.getPoints(player, gameState)).to.be(0);
    });
  });

  describe(EventName.SPECIAL_PATH_OF_THE_PILGRIMS, () => {
    it("should be able to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_PATH_OF_THE_PILGRIMS);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PATH_OF_THE_PILGRIMS] = null;

      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(gameState, CardName.MONASTERY);
      player.addToCity(gameState, CardName.WANDERER);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_PATH_OF_THE_PILGRIMS)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(event.getPoints(player, gameState)).to.be(0);
    });
    it("should calculate points correctly", () => {
      const event = Event.fromName(EventName.SPECIAL_PATH_OF_THE_PILGRIMS);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PATH_OF_THE_PILGRIMS] = null;

      player.addToCity(gameState, CardName.WANDERER);
      player.addToCity(gameState, CardName.MONASTERY);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_PATH_OF_THE_PILGRIMS)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      // no workers on cards = 0 points
      expect(event.getPoints(player, gameState)).to.be(0);

      // place 1st worker on card
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.MONASTERY)
      );
      expect(event.getPoints(player, gameState)).to.be(3);
      expect(player.numAvailableWorkers).to.be(0);

      // take back worker so we can test case where monastery has 2 workers
      const recallableWorkers = player.getRecallableWorkers();
      player.recallWorker(gameState, recallableWorkers[0]);

      // place a 2nd worker on card; requires having monk in city
      player.addToCity(gameState, CardName.MONK);
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.MONASTERY)
      );
      expect(event.getPoints(player, gameState)).to.be(6);
    });
    it("should handle case when no monastery in city", () => {
      const event = Event.fromName(EventName.SPECIAL_PATH_OF_THE_PILGRIMS);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_PATH_OF_THE_PILGRIMS] = null;

      player.addToCity(gameState, CardName.WANDERER);
      player.addToCity(gameState, CardName.MONASTERY);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_PATH_OF_THE_PILGRIMS)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      // no workers on cards = 0 points
      expect(event.getPoints(player, gameState)).to.be(0);

      // place 1st worker on card
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.MONASTERY)
      );
      expect(event.getPoints(player, gameState)).to.be(3);
      expect(player.numAvailableWorkers).to.be(0);

      player.removeCardFromCity(
        gameState,
        player.getFirstPlayedCard(CardName.MONASTERY)
      );

      expect(event.getPoints(player, gameState)).to.be(0);
    });
  });

  describe(EventName.SPECIAL_MINISTERING_TO_MISCREANTS, () => {
    it("should be able to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_MINISTERING_TO_MISCREANTS);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_MINISTERING_TO_MISCREANTS] = null;

      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.addToCity(gameState, CardName.MONK);
      player.addToCity(gameState, CardName.DUNGEON);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_MINISTERING_TO_MISCREANTS)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(event.getPoints(player, gameState)).to.be(0);
    });
    it("should calculate points correctly", () => {
      const event = Event.fromName(EventName.SPECIAL_MINISTERING_TO_MISCREANTS);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_MINISTERING_TO_MISCREANTS] = null;

      player.addToCity(gameState, CardName.DUNGEON);
      player.addToCity(gameState, CardName.MONK);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_PATH_OF_THE_PILGRIMS)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      // no workers on cards = 0 points
      expect(event.getPoints(player, gameState)).to.be(0);

      // add card to dungeon
      player.updatePlayedCard(
        gameState,
        player.getFirstPlayedCard(CardName.DUNGEON),
        {
          pairedCards: [CardName.WIFE],
        }
      );
      expect(event.getPoints(player, gameState)).to.be(3);

      // add 2nd card to Dungeon; requires having ranger in city
      player.addToCity(gameState, CardName.RANGER);
      player.updatePlayedCard(
        gameState,
        player.getFirstPlayedCard(CardName.DUNGEON),
        {
          pairedCards: [CardName.WIFE, CardName.HUSBAND],
        }
      );
      expect(event.getPoints(player, gameState)).to.be(6);
    });
    it("should give 0 points when no dungeon in city", () => {
      const event = Event.fromName(EventName.SPECIAL_MINISTERING_TO_MISCREANTS);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_MINISTERING_TO_MISCREANTS] = null;

      player.addToCity(gameState, CardName.DUNGEON);
      player.addToCity(gameState, CardName.MONK);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(true);

      // try to claim the event + check that you get the correct game state back
      expect(gameState.pendingGameInputs).to.eql([]);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_MINISTERING_TO_MISCREANTS)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      // no critters in dungeon = 0 points
      expect(event.getPoints(player, gameState)).to.be(0);

      // put one card under dungeon
      player.updatePlayedCard(
        gameState,
        player.getFirstPlayedCard(CardName.DUNGEON),
        {
          pairedCards: [CardName.WIFE],
        }
      );
      expect(event.getPoints(player, gameState)).to.be(3);

      player.removeCardFromCity(
        gameState,
        player.getFirstPlayedCard(CardName.DUNGEON)
      );

      expect(event.getPoints(player, gameState)).to.be(0);
    });
  });

  describe(EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED, () => {
    it("should be able to claim event and store 5/5 revealed cards", () => {
      const event = Event.fromName(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED] = null;

      player.addToCity(gameState, CardName.HISTORIAN);
      player.addToCity(gameState, CardName.RUINS);

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
        player.getClaimedEvent(EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
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

      // player should have 0 cards in hand
      expect(player.cardsInHand.length).to.be(0);

      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );

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
      expect(event.getPoints(player, gameState)).to.be(5);
    });

    it("should be able to claim event and store subset of revealed cards", () => {
      const event = Event.fromName(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED] = null;

      player.addToCity(gameState, CardName.HISTORIAN);
      player.addToCity(gameState, CardName.RUINS);

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
        player.getClaimedEvent(EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
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

      // player should have Queen and King
      expect(player.cardsInHand).to.eql([CardName.QUEEN, CardName.KING]);

      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );

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

      expect(event.getPoints(player, gameState)).to.be(3);
    });

    it("should be able to claim event and take all revealed cards into hand", () => {
      const event = Event.fromName(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED] = null;

      player.addToCity(gameState, CardName.HISTORIAN);
      player.addToCity(gameState, CardName.RUINS);

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
        player.getClaimedEvent(EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
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

      expect(player.cardsInHand).to.eql([
        CardName.QUEEN,
        CardName.FOOL,
        CardName.POSTAL_PIGEON,
        CardName.QUEEN,
        CardName.KING,
      ]);

      const eventInfo = player.getClaimedEvent(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );

      if (!eventInfo) {
        throw new Error("invalid event info");
      }
      const storedCards = eventInfo.storedCards;

      if (!storedCards) {
        throw new Error("invalid list of stored cards");
      }
      expect(storedCards).to.eql([]);

      expect(event.getPoints(player, gameState)).to.be(0);
    });

    it("should not be able to claim event if missing cards", () => {
      const event = Event.fromName(
        EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED
      );

      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED] = null;

      player.addToCity(gameState, CardName.HISTORIAN);

      // check if the player can claim the event
      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need to have played/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED)
      ).to.be(undefined);
    });
  });

  describe(EventName.SPECIAL_TAX_RELIEF, () => {
    it("should be able to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_TAX_RELIEF);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_TAX_RELIEF] = null;

      player.addToCity(gameState, CardName.JUDGE);
      player.addToCity(gameState, CardName.QUEEN);

      expect(player.getClaimedEvent(EventName.SPECIAL_TAX_RELIEF)).to.be(
        undefined
      );

      gameState = gameState.next(gameInput);

      expect(player.getClaimedEvent(EventName.SPECIAL_TAX_RELIEF));
      expect(event.getPoints(player, gameState)).to.be(3);
    });

    it("should activate production when claimed", () => {
      const event = Event.fromName(EventName.SPECIAL_TAX_RELIEF);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_TAX_RELIEF] = null;

      player.addToCity(gameState, CardName.JUDGE);
      player.addToCity(gameState, CardName.QUEEN);
      player.addToCity(gameState, CardName.FARM);

      expect(player.getClaimedEvent(EventName.SPECIAL_TAX_RELIEF)).to.be(
        undefined
      );
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_TAX_RELIEF));
      expect(event.getPoints(player, gameState)).to.be(3);

      // indicates that production was activated
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
    });
  });

  describe(EventName.SPECIAL_A_WEE_RUN_CITY, () => {
    it("should be able to claim event + recall 1 worker", () => {
      const event = Event.fromName(EventName.SPECIAL_A_WEE_RUN_CITY);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_A_WEE_RUN_CITY] = null;

      player.addToCity(gameState, CardName.CHIP_SWEEP);
      player.addToCity(gameState, CardName.CLOCK_TOWER);

      gameState.locationsMap[LocationName.BASIC_ONE_BERRY]!.push(
        player.playerId
      );

      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
      expect(player.numAvailableWorkers).to.be(1);

      const recallableWorkers = player.getRecallableWorkers();

      [player, gameState] = multiStepGameInputTest(gameState, [
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
      expect(player.numAvailableWorkers).to.be(1);
      expect(event.getPoints(player, gameState)).to.be(4);
    });

    it("should allow player to reclaim worker on event", () => {
      const event = Event.fromName(EventName.SPECIAL_A_WEE_RUN_CITY);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_A_WEE_RUN_CITY] = null;

      player.addToCity(gameState, CardName.CHIP_SWEEP);
      player.addToCity(gameState, CardName.CLOCK_TOWER);

      gameState.locationsMap[LocationName.BASIC_ONE_BERRY]!.push(
        player.playerId
      );

      player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);

      [player, gameState] = multiStepGameInputTest(gameState, [
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

      // should still be 1 because one worker is still on the basic location
      expect(player.numAvailableWorkers).to.be(1);
      expect(event.getPoints(player, gameState)).to.be(4);
    });

    it("should be claimable even if player hadn't yet placed workers", () => {
      const event = Event.fromName(EventName.SPECIAL_A_WEE_RUN_CITY);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_A_WEE_RUN_CITY] = null;

      player.addToCity(gameState, CardName.CHIP_SWEEP);
      player.addToCity(gameState, CardName.CLOCK_TOWER);

      expect(player.numAvailableWorkers).to.be(2);

      [player, gameState] = multiStepGameInputTest(gameState, [
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

      // should still be 1 because one worker is still on the basic location
      expect(player.numAvailableWorkers).to.be(2);
      expect(event.getPoints(player, gameState)).to.be(4);
    });
  });

  describe(EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN, () => {
    it("should allow player to pay other players (give multiple to one person)", () => {
      const event = Event.fromName(
        EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN
      );
      const gameInput = claimEventInput(event.name);
      let player = gameState.getActivePlayer();
      let player2 = gameState.players[1];

      gameState.eventsMap[EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN] = null;

      player.addToCity(gameState, CardName.SHOPKEEPER);
      player.addToCity(gameState, CardName.POST_OFFICE);
      player.gainResources(gameState, { [ResourceType.TWIG]: 3 });

      expect(
        player.getClaimedEvent(EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN)
      ).to.be(undefined);

      const selectPlayerInput = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: gameInput,
        prevInputType: GameInputType.CLAIM_EVENT,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: { selectedPlayer: player2.playerId },
      };

      const selectResourcesInput = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        toSpend: true,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectPlayerInput,
        maxResources: 3,
        minResources: 0,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: {
          resources: { [ResourceType.TWIG]: 3 },
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectPlayerInput,
        selectResourcesInput,
      ]);

      player2 = gameState.getPlayer(player2.playerId);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN)
      );
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      // shopkeeper is worth 1, post office is worth 2
      expect(player.getPoints(gameState)).to.be(9);
      expect(player2.getNumResourcesByType(ResourceType.TWIG)).to.be(3);
    });

    it("should work with more than 2 players", () => {
      const event = Event.fromName(
        EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN
      );
      gameState = testInitialGameState({ numPlayers: 4 });
      const gameInput = claimEventInput(event.name);
      let player = gameState.getActivePlayer();
      let player2 = gameState.players[1];
      let player3 = gameState.players[2];
      let player4 = gameState.players[3];

      gameState.eventsMap[EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN] = null;

      player.addToCity(gameState, CardName.SHOPKEEPER);
      player.addToCity(gameState, CardName.POST_OFFICE);
      player.gainResources(gameState, {
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.BERRY]: 4,
      });

      expect(
        player.getClaimedEvent(EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN)
      ).to.be(undefined);

      const selectFirstOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: gameInput,
        prevInputType: GameInputType.CLAIM_EVENT,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: { selectedPlayer: player2.playerId },
      };

      const selectFirstResource = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        toSpend: true,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectFirstOppo,
        maxResources: 3,
        minResources: 0,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: {
          resources: { [ResourceType.TWIG]: 1 },
        },
      };

      const selectSecondOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInputType: GameInputType.SELECT_RESOURCES,
        prevInput: selectFirstResource,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: { selectedPlayer: player4.playerId },
      };

      const selectSecondResource = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        toSpend: true,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectSecondOppo,
        maxResources: 2,
        minResources: 0,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: {
          resources: { [ResourceType.RESIN]: 1 },
        },
      };

      const selectThirdOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInputType: GameInputType.SELECT_RESOURCES,
        prevInput: selectSecondResource,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: { selectedPlayer: player3.playerId },
      };

      const selectThirdResource = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        toSpend: true,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectThirdOppo,
        maxResources: 1,
        minResources: 0,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: {
          resources: { [ResourceType.BERRY]: 1 },
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectFirstOppo,
        selectFirstResource,
        selectSecondOppo,
        selectSecondResource,
        selectThirdOppo,
        selectThirdResource,
      ]);

      player2 = gameState.getPlayer(player2.playerId);
      player3 = gameState.getPlayer(player3.playerId);
      player4 = gameState.getPlayer(player4.playerId);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN)
      );
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
      // shopkeeper is worth 1, post office is worth 2
      expect(player.getPoints(gameState)).to.be(9);

      expect(player2.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player3.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      expect(player4.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
    });

    it("should be able to claim event with 0 resources", () => {
      const event = Event.fromName(
        EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN
      );
      gameState = testInitialGameState({ numPlayers: 4 });
      const gameInput = claimEventInput(event.name);
      let player = gameState.getActivePlayer();
      const player2 = gameState.players[1];
      const player3 = gameState.players[2];
      const player4 = gameState.players[3];

      gameState.eventsMap[EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN] = null;

      player.addToCity(gameState, CardName.SHOPKEEPER);
      player.addToCity(gameState, CardName.POST_OFFICE);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN)
      );

      // shopkeeper is worth 1, post office is worth 2
      expect(player.getPoints(gameState)).to.be(3);
    });

    it("should be able to give fewer than 3 resources", () => {
      const event = Event.fromName(
        EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN
      );
      gameState = testInitialGameState({ numPlayers: 4 });
      const gameInput = claimEventInput(event.name);
      let player = gameState.getActivePlayer();
      let player2 = gameState.players[1];
      let player3 = gameState.players[2];
      let player4 = gameState.players[3];

      gameState.eventsMap[EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN] = null;

      player.addToCity(gameState, CardName.SHOPKEEPER);
      player.addToCity(gameState, CardName.POST_OFFICE);
      player.gainResources(gameState, {
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.BERRY]: 4,
      });

      expect(
        player.getClaimedEvent(EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN)
      ).to.be(undefined);

      const selectFirstOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: gameInput,
        prevInputType: GameInputType.CLAIM_EVENT,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: { selectedPlayer: player2.playerId },
      };

      const selectFirstResource = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        toSpend: true,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectFirstOppo,
        maxResources: 3,
        minResources: 0,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: {
          resources: { [ResourceType.TWIG]: 1 },
        },
      };

      const selectSecondOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInputType: GameInputType.SELECT_RESOURCES,
        prevInput: selectFirstResource,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: { selectedPlayer: player4.playerId },
      };

      const selectSecondResource = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        toSpend: true,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectSecondOppo,
        maxResources: 2,
        minResources: 0,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: {
          resources: { [ResourceType.RESIN]: 1 },
        },
      };

      const selectThirdOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInputType: GameInputType.SELECT_RESOURCES,
        prevInput: selectSecondResource,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: { selectedPlayer: null },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectFirstOppo,
        selectFirstResource,
        selectSecondOppo,
        selectSecondResource,
        selectThirdOppo,
      ]);

      player2 = gameState.getPlayer(player2.playerId);
      player3 = gameState.getPlayer(player3.playerId);
      player4 = gameState.getPlayer(player4.playerId);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN)
      );
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(4);

      // shopkeeper is worth 1, post office is worth 2
      // 4 points from event because only 2 donations
      expect(player.getPoints(gameState)).to.be(7);

      expect(player2.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player3.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player4.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
    });

    it("should not be able to give more than 3 resources", () => {
      const event = Event.fromName(
        EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN
      );
      gameState = testInitialGameState({ numPlayers: 4 });
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();
      const player2 = gameState.players[1];

      gameState.eventsMap[EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN] = null;

      player.addToCity(gameState, CardName.SHOPKEEPER);
      player.addToCity(gameState, CardName.POST_OFFICE);
      player.gainResources(gameState, {
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.BERRY]: 4,
      });

      expect(
        player.getClaimedEvent(EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN)
      ).to.be(undefined);

      const selectFirstOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: gameInput,
        prevInputType: GameInputType.CLAIM_EVENT,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: { selectedPlayer: player2.playerId },
      };

      const selectFirstResource = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        toSpend: true,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectFirstOppo,
        maxResources: 3,
        minResources: 0,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: {
          resources: { [ResourceType.TWIG]: 4 },
        },
      };

      gameState = gameState.next(gameInput);
      gameState = gameState.next(selectFirstOppo);

      expect(() => {
        gameState.next(selectFirstResource);
      }).to.throwException(/cannot give/i);
    });

    it("should not be able to give more than 3 resources across all donations", () => {
      const event = Event.fromName(
        EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN
      );
      gameState = testInitialGameState({ numPlayers: 4 });
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();
      const player2 = gameState.players[1];
      const player3 = gameState.players[2];
      const player4 = gameState.players[3];

      gameState.eventsMap[EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN] = null;

      player.addToCity(gameState, CardName.SHOPKEEPER);
      player.addToCity(gameState, CardName.POST_OFFICE);
      player.gainResources(gameState, {
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.BERRY]: 4,
      });

      expect(
        player.getClaimedEvent(EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN)
      ).to.be(undefined);

      const selectFirstOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: gameInput,
        prevInputType: GameInputType.CLAIM_EVENT,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: { selectedPlayer: player2.playerId },
      };

      const selectFirstResource = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        prevInputType: GameInputType.SELECT_PLAYER,
        toSpend: true,
        prevInput: selectFirstOppo,
        maxResources: 3,
        minResources: 0,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: {
          resources: { [ResourceType.TWIG]: 1 },
        },
      };

      const selectSecondOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInputType: GameInputType.SELECT_RESOURCES,
        prevInput: selectFirstResource,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: { selectedPlayer: player4.playerId },
      };

      const selectSecondResource = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        prevInputType: GameInputType.SELECT_PLAYER,
        toSpend: true,
        prevInput: selectSecondOppo,
        maxResources: 2,
        minResources: 0,
        eventContext: EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
        clientOptions: {
          resources: { [ResourceType.RESIN]: 3 },
        },
      };

      gameState = gameState.next(gameInput);
      gameState = gameState.next(selectFirstOppo);
      gameState = gameState.next(selectFirstResource);
      gameState = gameState.next(selectSecondOppo);

      expect(() => {
        gameState.next(selectSecondResource);
      }).to.throwException(/cannot give/i);
    });
  });

  describe(EventName.WONDER_HOPEWATCH_GATE, () => {
    it("should allow player to claim wonder", () => {
      const event = Event.fromName(EventName.WONDER_HOPEWATCH_GATE);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 1,
        [ResourceType.PEARL]: 2,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.POSTAL_PIGEON);

      expect(event.canPlay(gameState, gameInput)).to.be(true);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.WONDER_HOPEWATCH_GATE,
          cardOptions: [
            CardName.FARM,
            CardName.INN,
            CardName.WIFE,
            CardName.POSTAL_PIGEON,
          ],
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            selectedCards: [CardName.FARM, CardName.INN],
          },
        },
      ]);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(player.getPoints(gameState)).to.be(10);
      expect(player.cardsInHand.length).to.be(2);
      expect(player.cardsInHand).to.eql([
        CardName.WIFE,
        CardName.POSTAL_PIGEON,
      ]);
    });

    it("can't claim if you don't have enough resources", () => {
      const event = Event.fromName(EventName.WONDER_HOPEWATCH_GATE);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 1,
        [ResourceType.PEARL]: 1,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.POSTAL_PIGEON);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/enough resources/i);
    });

    it("can't claim if you don't have enough cards", () => {
      const event = Event.fromName(EventName.WONDER_HOPEWATCH_GATE);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 1,
        [ResourceType.PEARL]: 2,
      });
      player.addCardToHand(gameState, CardName.FARM);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/enough cards/i);
    });
  });

  describe(EventName.WONDER_MISTRISE_FOUNTAIN, () => {
    it("should allow player to claim wonder", () => {
      const event = Event.fromName(EventName.WONDER_MISTRISE_FOUNTAIN);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 2,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.POSTAL_PIGEON);

      expect(event.canPlay(gameState, gameInput)).to.be(true);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.WONDER_MISTRISE_FOUNTAIN,
          cardOptions: [
            CardName.FARM,
            CardName.INN,
            CardName.WIFE,
            CardName.POSTAL_PIGEON,
          ],
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            selectedCards: [CardName.FARM, CardName.INN],
          },
        },
      ]);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(player.getPoints(gameState)).to.be(15);
      expect(player.cardsInHand.length).to.be(2);
      expect(player.cardsInHand).to.eql([
        CardName.WIFE,
        CardName.POSTAL_PIGEON,
      ]);
    });

    it("can't claim if you don't have enough resources", () => {
      const event = Event.fromName(EventName.WONDER_MISTRISE_FOUNTAIN);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 2,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.POSTAL_PIGEON);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/enough resources/i);
    });

    it("can't claim if you don't have enough cards", () => {
      const event = Event.fromName(EventName.WONDER_MISTRISE_FOUNTAIN);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 2,
      });
      player.addCardToHand(gameState, CardName.FARM);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/enough cards/i);
    });
  });

  describe(EventName.WONDER_SUNBLAZE_BRIDGE, () => {
    it("should allow player to claim wonder", () => {
      const event = Event.fromName(EventName.WONDER_SUNBLAZE_BRIDGE);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.POSTAL_PIGEON);

      expect(event.canPlay(gameState, gameInput)).to.be(true);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.WONDER_SUNBLAZE_BRIDGE,
          cardOptions: [
            CardName.FARM,
            CardName.INN,
            CardName.WIFE,
            CardName.POSTAL_PIGEON,
          ],
          maxToSelect: 3,
          minToSelect: 3,
          clientOptions: {
            selectedCards: [
              CardName.FARM,
              CardName.INN,
              CardName.POSTAL_PIGEON,
            ],
          },
        },
      ]);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(player.getPoints(gameState)).to.be(20);
      expect(player.cardsInHand.length).to.be(1);
      expect(player.cardsInHand).to.eql([CardName.WIFE]);
    });

    it("can't claim if you don't have enough resources", () => {
      const event = Event.fromName(EventName.WONDER_SUNBLAZE_BRIDGE);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 2,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.POSTAL_PIGEON);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/enough resources/i);
    });

    it("can't claim if you don't have enough cards", () => {
      const event = Event.fromName(EventName.WONDER_SUNBLAZE_BRIDGE);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 2,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/enough cards/i);
    });
  });

  describe(EventName.WONDER_STARFALLS_FLAME, () => {
    it("should allow player to claim wonder", () => {
      const event = Event.fromName(EventName.WONDER_STARFALLS_FLAME);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 3,
        [ResourceType.PEBBLE]: 3,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.POSTAL_PIGEON);

      expect(event.canPlay(gameState, gameInput)).to.be(true);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.WONDER_STARFALLS_FLAME,
          cardOptions: [
            CardName.FARM,
            CardName.INN,
            CardName.WIFE,
            CardName.POSTAL_PIGEON,
          ],
          maxToSelect: 3,
          minToSelect: 3,
          clientOptions: {
            selectedCards: [
              CardName.FARM,
              CardName.INN,
              CardName.POSTAL_PIGEON,
            ],
          },
        },
      ]);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(player.getPoints(gameState)).to.be(25);
      expect(player.cardsInHand.length).to.be(1);
      expect(player.cardsInHand).to.eql([CardName.WIFE]);
    });

    it("can't claim if you don't have enough resources", () => {
      const event = Event.fromName(EventName.WONDER_STARFALLS_FLAME);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 2,
        [ResourceType.RESIN]: 1,
        [ResourceType.PEBBLE]: 2,
        [ResourceType.PEARL]: 2,
      });
      player.addCardToHand(gameState, CardName.FARM);
      player.addCardToHand(gameState, CardName.INN);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.POSTAL_PIGEON);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/enough resources/i);
    });

    it("can't claim if you don't have enough cards", () => {
      const event = Event.fromName(EventName.WONDER_STARFALLS_FLAME);
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const gameInput = claimEventInput(event.name);

      player.gainResources(gameState, {
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 3,
        [ResourceType.PEBBLE]: 3,
        [ResourceType.PEARL]: 3,
      });
      player.addCardToHand(gameState, CardName.FARM);

      expect(event.canPlay(gameState, gameInput)).to.be(false);
      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/enough cards/i);
    });
  });

  describe(EventName.SPECIAL_RIVERSIDE_RESORT, () => {
    it("can claim event + meadow replenishes properly", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_RIVERSIDE_RESORT);
      const gameInput = claimEventInput(event.name);

      let topOfDeck = [
        CardName.HUSBAND,
        CardName.QUEEN,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      gameState.replenishMeadow();

      // so we know which cards to expect in the meadow
      topOfDeck = [CardName.MINER_MOLE, CardName.MINE, CardName.WOODCARVER];
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_RIVERSIDE_RESORT,
        cardOptions: [
          CardName.HUSBAND,
          CardName.QUEEN,
          CardName.WIFE,
          CardName.POSTAL_PIGEON,
          CardName.RANGER,
        ],
        maxToSelect: 3,
        minToSelect: 0,
        clientOptions: {
          selectedCards: [CardName.RANGER, CardName.HUSBAND, CardName.QUEEN],
        },
      };

      gameState.eventsMap[EventName.SPECIAL_RIVERSIDE_RESORT] = null;

      player.addToCity(gameState, CardName.INNKEEPER);
      player.addToCity(gameState, CardName.HARBOR);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVERSIDE_RESORT)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVERSIDE_RESORT));
      expect(gameState.meadowCards).to.eql([
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.WOODCARVER,
        CardName.MINE,
        CardName.MINER_MOLE,
      ]);
      expect(event.getPoints(player, gameState)).to.be(6);
      expect(player.getPointsFromEvents(gameState)).to.be(6);
    });

    it("should not be able to put non-Critters under event", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_RIVERSIDE_RESORT);
      const gameInput = claimEventInput(event.name);

      let topOfDeck = [
        CardName.HUSBAND,
        CardName.QUEEN,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      gameState.replenishMeadow();

      // so we know which cards to expect in the meadow
      topOfDeck = [CardName.MINER_MOLE, CardName.MINE, CardName.WOODCARVER];
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_RIVERSIDE_RESORT,
        cardOptions: [
          CardName.HUSBAND,
          CardName.QUEEN,
          CardName.WIFE,
          CardName.POSTAL_PIGEON,
          CardName.RANGER,
        ],
        maxToSelect: 3,
        minToSelect: 0,
        clientOptions: {
          selectedCards: [CardName.FARM, CardName.HUSBAND, CardName.QUEEN],
        },
      };

      gameState.eventsMap[EventName.SPECIAL_RIVERSIDE_RESORT] = null;

      player.addToCity(gameState, CardName.INNKEEPER);
      player.addToCity(gameState, CardName.HARBOR);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVERSIDE_RESORT)).to.be(
        undefined
      );

      gameState.next(gameInput);

      expect(() => {
        gameState.next(selectCardsInput);
      }).to.throwException(/Selected card is not a valid option/i);
    });

    it("calculate points correctly if putting 3 Critters beneath event", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_RIVERSIDE_RESORT);
      const gameInput = claimEventInput(event.name);

      let topOfDeck = [
        CardName.HUSBAND,
        CardName.QUEEN,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      gameState.replenishMeadow();

      // so we know which cards to expect in the meadow
      topOfDeck = [CardName.MINER_MOLE, CardName.MINE, CardName.WOODCARVER];
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_RIVERSIDE_RESORT,
        cardOptions: [
          CardName.HUSBAND,
          CardName.QUEEN,
          CardName.WIFE,
          CardName.POSTAL_PIGEON,
          CardName.RANGER,
        ],
        maxToSelect: 3,
        minToSelect: 0,
        clientOptions: {
          selectedCards: [CardName.RANGER, CardName.HUSBAND, CardName.QUEEN],
        },
      };

      gameState.eventsMap[EventName.SPECIAL_RIVERSIDE_RESORT] = null;

      player.addToCity(gameState, CardName.INNKEEPER);
      player.addToCity(gameState, CardName.HARBOR);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVERSIDE_RESORT)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVERSIDE_RESORT));
      expect(gameState.meadowCards).to.eql([
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.WOODCARVER,
        CardName.MINE,
        CardName.MINER_MOLE,
      ]);
      expect(event.getPoints(player, gameState)).to.be(6);
      expect(player.getPointsFromEvents(gameState)).to.be(6);
    });

    it("should calculate points correctly if putting 2 Critters beneath event", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_RIVERSIDE_RESORT);
      const gameInput = claimEventInput(event.name);

      let topOfDeck = [
        CardName.HUSBAND,
        CardName.QUEEN,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      gameState.replenishMeadow();

      // so we know which cards to expect in the meadow
      topOfDeck = [CardName.MINER_MOLE, CardName.MINE, CardName.WOODCARVER];
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_RIVERSIDE_RESORT,
        cardOptions: [
          CardName.HUSBAND,
          CardName.QUEEN,
          CardName.WIFE,
          CardName.POSTAL_PIGEON,
          CardName.RANGER,
        ],
        maxToSelect: 3,
        minToSelect: 0,
        clientOptions: {
          selectedCards: [CardName.HUSBAND, CardName.QUEEN],
        },
      };

      gameState.eventsMap[EventName.SPECIAL_RIVERSIDE_RESORT] = null;

      player.addToCity(gameState, CardName.INNKEEPER);
      player.addToCity(gameState, CardName.HARBOR);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVERSIDE_RESORT)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVERSIDE_RESORT));
      expect(gameState.meadowCards).to.eql([
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
        CardName.WOODCARVER,
        CardName.MINE,
      ]);
      expect(event.getPoints(player, gameState)).to.be(4);
      expect(player.getPointsFromEvents(gameState)).to.be(4);
    });

    it("should calculate points correctly if putting 1 Critters beneath event", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_RIVERSIDE_RESORT);
      const gameInput = claimEventInput(event.name);

      let topOfDeck = [
        CardName.HUSBAND,
        CardName.QUEEN,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      gameState.replenishMeadow();

      // so we know which cards to expect in the meadow
      topOfDeck = [CardName.MINER_MOLE, CardName.MINE, CardName.WOODCARVER];
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_RIVERSIDE_RESORT,
        cardOptions: [
          CardName.HUSBAND,
          CardName.QUEEN,
          CardName.WIFE,
          CardName.POSTAL_PIGEON,
          CardName.RANGER,
        ],
        maxToSelect: 3,
        minToSelect: 0,
        clientOptions: {
          selectedCards: [CardName.QUEEN],
        },
      };

      gameState.eventsMap[EventName.SPECIAL_RIVERSIDE_RESORT] = null;

      player.addToCity(gameState, CardName.INNKEEPER);
      player.addToCity(gameState, CardName.HARBOR);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVERSIDE_RESORT)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVERSIDE_RESORT));
      expect(gameState.meadowCards).to.eql([
        CardName.HUSBAND,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
        CardName.WOODCARVER,
      ]);
      expect(event.getPoints(player, gameState)).to.be(2);
      expect(player.getPointsFromEvents(gameState)).to.be(2);
    });

    it("should calculate points correctly if putting 0 Critters beneath event", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_RIVERSIDE_RESORT);
      const gameInput = claimEventInput(event.name);

      const topOfDeck = [
        CardName.HUSBAND,
        CardName.QUEEN,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      gameState.replenishMeadow();

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_RIVERSIDE_RESORT,
        cardOptions: [
          CardName.HUSBAND,
          CardName.QUEEN,
          CardName.WIFE,
          CardName.POSTAL_PIGEON,
          CardName.RANGER,
        ],
        maxToSelect: 3,
        minToSelect: 0,
        clientOptions: {
          selectedCards: [],
        },
      };

      gameState.eventsMap[EventName.SPECIAL_RIVERSIDE_RESORT] = null;

      player.addToCity(gameState, CardName.INNKEEPER);
      player.addToCity(gameState, CardName.HARBOR);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVERSIDE_RESORT)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVERSIDE_RESORT));
      expect(gameState.meadowCards).to.eql([
        CardName.HUSBAND,
        CardName.QUEEN,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
      ]);
      expect(event.getPoints(player, gameState)).to.be(0);
      expect(player.getPointsFromEvents(gameState)).to.be(0);
    });
  });

  describe(EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED, () => {
    it("can claim event, choose a card, and have meadow replenish properly", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(
        EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED
      );
      const gameInput = claimEventInput(event.name);

      const topOfDeck = [
        CardName.HUSBAND,
        CardName.QUEEN,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      gameState.replenishMeadow();

      // so we know which card to expect in the meadow
      gameState.deck.addToStack(CardName.WOODCARVER);

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED,
        cardOptions: [
          CardName.HUSBAND,
          CardName.WIFE,
          CardName.FARM,
          CardName.INN,
          CardName.POST_OFFICE,
          CardName.POSTAL_PIGEON,
          CardName.RANGER,
        ],
        maxToSelect: 1,
        minToSelect: 0,
        clientOptions: {
          selectedCards: [CardName.HUSBAND],
        },
      };

      gameState.eventsMap[EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED] = null;

      player.addToCity(gameState, CardName.PIRATE);
      player.addToCity(gameState, CardName.CRANE);

      expect(player.getPointsFromCards(gameState)).to.be(2);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
      ]);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED)
      );
      expect(gameState.meadowCards).to.eql([
        CardName.QUEEN,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
        CardName.WOODCARVER,
      ]);

      expect(player.getPointsFromEvents(gameState)).to.be(0);
      expect(player.getPointsFromCards(gameState)).to.be(4);
    });

    it("cannot play card worth more than 3 VP", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(
        EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED
      );
      const gameInput = claimEventInput(event.name);

      const topOfDeck = [
        CardName.HUSBAND,
        CardName.QUEEN,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      gameState.replenishMeadow();

      // so we know which card to expect in the meadow
      gameState.deck.addToStack(CardName.WOODCARVER);

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED,
        cardOptions: [
          CardName.HUSBAND,
          CardName.WIFE,
          CardName.FARM,
          CardName.INN,
          CardName.POST_OFFICE,
          CardName.POSTAL_PIGEON,
          CardName.RANGER,
        ],
        maxToSelect: 1,
        minToSelect: 0,
        clientOptions: {
          selectedCards: [CardName.QUEEN],
        },
      };

      gameState.eventsMap[EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED] = null;

      player.addToCity(gameState, CardName.PIRATE);
      player.addToCity(gameState, CardName.CRANE);

      expect(player.getPointsFromCards(gameState)).to.be(2);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED)
      ).to.be(undefined);

      gameState = gameState.next(gameInput);

      expect(() => gameState.next(selectCardsInput)).to.throwException(
        /Selected card is not a valid option/i
      );
    });

    it("played card effect happens", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(
        EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED
      );
      const gameInput = claimEventInput(event.name);

      const topOfDeck = [
        CardName.HUSBAND,
        CardName.QUEEN,
        CardName.WIFE,
        CardName.FARM,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
      ];
      topOfDeck.reverse();
      topOfDeck.forEach((cardName) => {
        gameState.deck.addToStack(cardName);
      });

      gameState.replenishMeadow();

      // so we know which card to expect in the meadow
      gameState.deck.addToStack(CardName.WOODCARVER);

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED,
        cardOptions: [
          CardName.HUSBAND,
          CardName.WIFE,
          CardName.FARM,
          CardName.INN,
          CardName.POST_OFFICE,
          CardName.POSTAL_PIGEON,
          CardName.RANGER,
        ],
        maxToSelect: 1,
        minToSelect: 0,
        clientOptions: {
          selectedCards: [CardName.FARM],
        },
      };

      gameState.eventsMap[EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED] = null;

      player.addToCity(gameState, CardName.PIRATE);
      player.addToCity(gameState, CardName.CRANE);

      expect(player.getPointsFromCards(gameState)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectCardsInput,
      ]);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_SUNKEN_TREASURE_DISCOVERED)
      );
      expect(gameState.meadowCards).to.eql([
        CardName.HUSBAND,
        CardName.QUEEN,
        CardName.WIFE,
        CardName.INN,
        CardName.POST_OFFICE,
        CardName.POSTAL_PIGEON,
        CardName.RANGER,
        CardName.WOODCARVER,
      ]);

      expect(player.getPointsFromEvents(gameState)).to.be(0);
      expect(player.getPointsFromCards(gameState)).to.be(3);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
    });
  });

  describe(EventName.SPECIAL_RIVER_RACE, () => {
    it("can claim event and put ferry ferret beneath to gain 2 extra VP", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_RIVER_RACE);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_RIVER_RACE] = null;

      player.addToCity(gameState, CardName.FERRY_FERRET);
      player.addToCity(gameState, CardName.TWIG_BARGE);

      expect(player.hasCardInCity(CardName.FERRY_FERRET)).to.be(true);
      expect(player.hasCardInCity(CardName.TWIG_BARGE)).to.be(true);

      expect(player.getPointsFromCards(gameState)).to.be(2);
      expect(player.getClaimedEvent(EventName.SPECIAL_RIVER_RACE)).to.be(
        undefined
      );

      const selectPlayedCardsInput = {
        inputType: GameInputType.SELECT_PLAYED_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_RIVER_RACE,
        cardOptions: [
          ...player.getPlayedCardForCardName(CardName.FERRY_FERRET),
          ...player.getPlayedCardForCardName(CardName.TWIG_BARGE),
        ],
        maxToSelect: 1,
        minToSelect: 1,
        clientOptions: {
          selectedCards: player.getPlayedCardForCardName(CardName.FERRY_FERRET),
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectPlayedCardsInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVER_RACE));

      expect(player.getPointsFromEvents(gameState)).to.be(6);
      expect(player.getPointsFromCards(gameState)).to.be(1);
      expect(player.hasCardInCity(CardName.FERRY_FERRET)).to.be(false);
      expect(player.hasCardInCity(CardName.TWIG_BARGE)).to.be(true);
    });

    it("can claim event and put twig barge beneath to gain 2 ANY", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_RIVER_RACE);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_RIVER_RACE] = null;

      player.addToCity(gameState, CardName.FERRY_FERRET);
      player.addToCity(gameState, CardName.TWIG_BARGE);

      expect(player.hasCardInCity(CardName.FERRY_FERRET)).to.be(true);
      expect(player.hasCardInCity(CardName.TWIG_BARGE)).to.be(true);

      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

      expect(player.getPointsFromCards(gameState)).to.be(2);
      expect(player.getClaimedEvent(EventName.SPECIAL_RIVER_RACE)).to.be(
        undefined
      );

      const selectPlayedCardsInput = {
        inputType: GameInputType.SELECT_PLAYED_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_RIVER_RACE,
        cardOptions: [
          ...player.getPlayedCardForCardName(CardName.FERRY_FERRET),
          ...player.getPlayedCardForCardName(CardName.TWIG_BARGE),
        ],
        maxToSelect: 1,
        minToSelect: 1,
        clientOptions: {
          selectedCards: player.getPlayedCardForCardName(CardName.TWIG_BARGE),
        },
      };

      const selectResourcesInput = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        toSpend: false,
        prevInputType: GameInputType.SELECT_PLAYED_CARDS,
        maxResources: 2,
        minResources: 2,
        eventContext: EventName.SPECIAL_RIVER_RACE,
        clientOptions: {
          resources: { [ResourceType.TWIG]: 1, [ResourceType.RESIN]: 1 },
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectPlayedCardsInput,
        selectResourcesInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVER_RACE));

      expect(player.getPointsFromEvents(gameState)).to.be(4);
      expect(player.getPointsFromCards(gameState)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.hasCardInCity(CardName.FERRY_FERRET)).to.be(true);
      expect(player.hasCardInCity(CardName.TWIG_BARGE)).to.be(false);
    });

    it("handle case where you have multiple ferry ferrets", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_RIVER_RACE);
      const gameInput = claimEventInput(event.name);

      gameState.eventsMap[EventName.SPECIAL_RIVER_RACE] = null;

      player.addToCity(gameState, CardName.FERRY_FERRET);
      player.addToCity(gameState, CardName.TWIG_BARGE);
      player.addToCity(gameState, CardName.TWIG_BARGE);

      expect(player.hasCardInCity(CardName.FERRY_FERRET)).to.be(true);
      expect(player.hasCardInCity(CardName.TWIG_BARGE)).to.be(true);
      expect(player.getPlayedCardForCardName(CardName.TWIG_BARGE).length).to.be(
        2
      );

      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

      expect(player.getPointsFromCards(gameState)).to.be(3);
      expect(player.getClaimedEvent(EventName.SPECIAL_RIVER_RACE)).to.be(
        undefined
      );

      const selectPlayedCardsInput = {
        inputType: GameInputType.SELECT_PLAYED_CARDS as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        eventContext: EventName.SPECIAL_RIVER_RACE,
        cardOptions: [
          ...player.getPlayedCardForCardName(CardName.FERRY_FERRET),
          ...player.getPlayedCardForCardName(CardName.TWIG_BARGE),
        ],
        maxToSelect: 1,
        minToSelect: 1,
        clientOptions: {
          // select the 2nd one in the list
          selectedCards: [
            player.getPlayedCardForCardName(CardName.TWIG_BARGE)[1],
          ],
        },
      };

      const selectResourcesInput = {
        inputType: GameInputType.SELECT_RESOURCES as const,
        toSpend: false,
        prevInputType: GameInputType.SELECT_PLAYED_CARDS,
        maxResources: 2,
        minResources: 2,
        eventContext: EventName.SPECIAL_RIVER_RACE,
        clientOptions: {
          resources: { [ResourceType.BERRY]: 1, [ResourceType.RESIN]: 1 },
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectPlayedCardsInput,
        selectResourcesInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_RIVER_RACE));

      expect(player.getPointsFromEvents(gameState)).to.be(4);
      expect(player.getPointsFromCards(gameState)).to.be(2);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.hasCardInCity(CardName.FERRY_FERRET)).to.be(true);
      expect(player.hasCardInCity(CardName.TWIG_BARGE)).to.be(true);
    });
  });

  describe(EventName.SPECIAL_ROMANTIC_CRUISE, () => {
    it("can claim event and choose the wife", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_ROMANTIC_CRUISE);
      const gameInput = claimEventInput(event.name);
      const deckLength = gameState.deck.length;

      gameState.eventsMap[EventName.SPECIAL_ROMANTIC_CRUISE] = null;

      player.addToCity(gameState, CardName.HUSBAND);
      player.addToCity(gameState, CardName.FERRY);

      expect(player.hasCardInCity(CardName.WIFE)).to.be(false);

      expect(player.getPointsFromCards(gameState)).to.be(4);
      expect(player.getClaimedEvent(EventName.SPECIAL_ROMANTIC_CRUISE)).to.be(
        undefined
      );

      const selectGenericInput = {
        inputType: GameInputType.SELECT_OPTION_GENERIC as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        options: ["Search deck for a Wife", "Gain 5 VP"],
        eventContext: EventName.SPECIAL_ROMANTIC_CRUISE,
        clientOptions: {
          selectedOption: "Search deck for a Wife",
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectGenericInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_ROMANTIC_CRUISE));

      // check to make sure the card was drawn from the deck
      expect(gameState.deck.length).to.be(deckLength - 1);

      expect(player.getPointsFromEvents(gameState)).to.be(0);
      expect(player.getPointsFromCards(gameState)).to.be(9);
      expect(player.hasCardInCity(CardName.WIFE)).to.be(true);
    });

    it("can claim event and choose 5 VP", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_ROMANTIC_CRUISE);
      const gameInput = claimEventInput(event.name);
      const deckLength = gameState.deck.length;

      gameState.eventsMap[EventName.SPECIAL_ROMANTIC_CRUISE] = null;

      player.addToCity(gameState, CardName.HUSBAND);
      player.addToCity(gameState, CardName.FERRY);

      expect(player.hasCardInCity(CardName.WIFE)).to.be(false);

      expect(player.getPointsFromCards(gameState)).to.be(4);
      expect(player.getClaimedEvent(EventName.SPECIAL_ROMANTIC_CRUISE)).to.be(
        undefined
      );

      const selectGenericInput = {
        inputType: GameInputType.SELECT_OPTION_GENERIC as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        options: ["Search deck for a Wife", "Gain 5 VP"],
        eventContext: EventName.SPECIAL_ROMANTIC_CRUISE,
        clientOptions: {
          selectedOption: "Gain 5 VP",
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectGenericInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_ROMANTIC_CRUISE));

      // check to make sure no card was drawn from the deck
      expect(gameState.deck.length).to.be(deckLength);

      expect(player.getPointsFromEvents(gameState)).to.be(5);
      expect(player.getPointsFromCards(gameState)).to.be(4);
      expect(player.hasCardInCity(CardName.WIFE)).to.be(false);
    });

    it("should be able to search for wife and handle case where there's no Wife cards in deck", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_ROMANTIC_CRUISE);
      const gameInput = claimEventInput(event.name);

      // draw all the cards from the deck
      while (!gameState.deck.isEmpty) {
        gameState.deck.drawInner();
      }

      expect(gameState.deck.length).to.be(0);

      gameState.deck.addToStack(CardName.FARM);
      gameState.deck.addToStack(CardName.QUEEN);
      gameState.deck.addToStack(CardName.POSTAL_PIGEON);
      gameState.deck.addToStack(CardName.RANGER);
      gameState.deck.addToStack(CardName.DUNGEON);
      gameState.deck.addToStack(CardName.MINE);
      gameState.deck.addToStack(CardName.HUSBAND);

      const deckLength = gameState.deck.length;

      gameState.eventsMap[EventName.SPECIAL_ROMANTIC_CRUISE] = null;

      player.addToCity(gameState, CardName.HUSBAND);
      player.addToCity(gameState, CardName.FERRY);

      expect(player.hasCardInCity(CardName.WIFE)).to.be(false);

      expect(player.getPointsFromCards(gameState)).to.be(4);
      expect(player.getClaimedEvent(EventName.SPECIAL_ROMANTIC_CRUISE)).to.be(
        undefined
      );

      const selectGenericInput = {
        inputType: GameInputType.SELECT_OPTION_GENERIC as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        options: ["Search deck for a Wife", "Gain 5 VP"],
        eventContext: EventName.SPECIAL_ROMANTIC_CRUISE,
        clientOptions: {
          selectedOption: "Search deck for a Wife",
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectGenericInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_ROMANTIC_CRUISE));

      // deck is the same length because no wife in the deck
      expect(gameState.deck.length).to.be(deckLength);

      expect(player.getPointsFromEvents(gameState)).to.be(0);
      expect(player.getPointsFromCards(gameState)).to.be(4);
      expect(player.hasCardInCity(CardName.WIFE)).to.be(false);
    });

    it("should allow player to claim event even if deck is empty", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_ROMANTIC_CRUISE);
      const gameInput = claimEventInput(event.name);

      // draw all the cards from the deck
      while (!gameState.deck.isEmpty) {
        gameState.deck.drawInner();
      }

      expect(gameState.deck.length).to.be(0);

      gameState.eventsMap[EventName.SPECIAL_ROMANTIC_CRUISE] = null;

      player.addToCity(gameState, CardName.HUSBAND);
      player.addToCity(gameState, CardName.FERRY);

      expect(player.hasCardInCity(CardName.WIFE)).to.be(false);

      expect(player.getPointsFromCards(gameState)).to.be(4);
      expect(player.getClaimedEvent(EventName.SPECIAL_ROMANTIC_CRUISE)).to.be(
        undefined
      );

      const selectGenericInput = {
        inputType: GameInputType.SELECT_OPTION_GENERIC as const,
        prevInputType: GameInputType.CLAIM_EVENT,
        options: ["Search deck for a Wife", "Gain 5 VP"],
        eventContext: EventName.SPECIAL_ROMANTIC_CRUISE,
        clientOptions: {
          selectedOption: "Search deck for a Wife",
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectGenericInput,
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_ROMANTIC_CRUISE));

      // deck is the same length because no wife in the deck
      expect(gameState.deck.length).to.be(0);

      expect(player.getPointsFromEvents(gameState)).to.be(0);
      expect(player.getPointsFromCards(gameState)).to.be(4);
      expect(player.hasCardInCity(CardName.WIFE)).to.be(false);
    });
  });

  describe(EventName.SPECIAL_X_MARKS_THE_SPOT, () => {
    it("can claim event with empty storehouse", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_X_MARKS_THE_SPOT);
      const gameInput = claimEventInput(event.name);
      const deckLength = gameState.deck.length;

      gameState.eventsMap[EventName.SPECIAL_X_MARKS_THE_SPOT] = null;

      player.addToCity(gameState, CardName.PIRATE_SHIP);
      player.addToCity(gameState, CardName.STOREHOUSE);

      expect(player.getClaimedEvent(EventName.SPECIAL_X_MARKS_THE_SPOT)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_X_MARKS_THE_SPOT));

      expect(player.getPointsFromEvents(gameState)).to.be(0);
      expect(player.getPointsFromCards(gameState)).to.be(2);
    });

    it("get correct number of VP tokens on storehouse", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_X_MARKS_THE_SPOT);
      const gameInput = claimEventInput(event.name);
      const deckLength = gameState.deck.length;

      gameState.eventsMap[EventName.SPECIAL_X_MARKS_THE_SPOT] = null;

      player.addToCity(gameState, CardName.PIRATE_SHIP);
      player.addToCity(gameState, CardName.STOREHOUSE);

      const playedCard = player.getFirstPlayedCard(CardName.STOREHOUSE);
      playedCard.resources = {
        [ResourceType.BERRY]: 0,
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 0,
        [ResourceType.PEBBLE]: 0,
      };

      expect(player.getPointsFromCards(gameState)).to.be(2);
      expect(player.getClaimedEvent(EventName.SPECIAL_X_MARKS_THE_SPOT)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_X_MARKS_THE_SPOT));

      expect(player.getPointsFromEvents(gameState)).to.be(0);
      expect(player.getPointsFromCards(gameState)).to.be(5);

      const resources =
        player.getFirstPlayedCard(CardName.STOREHOUSE).resources || {};

      expect(resources[ResourceType.VP]).to.be(3);
    });

    it("handle multiple storehouses + pick one with most resources", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_X_MARKS_THE_SPOT);
      const gameInput = claimEventInput(event.name);
      const deckLength = gameState.deck.length;

      gameState.eventsMap[EventName.SPECIAL_X_MARKS_THE_SPOT] = null;

      player.addToCity(gameState, CardName.PIRATE_SHIP);
      player.addToCity(gameState, CardName.STOREHOUSE);
      player.addToCity(gameState, CardName.STOREHOUSE);
      player.addToCity(gameState, CardName.STOREHOUSE);

      let storehouses = player.getPlayedCardForCardName(CardName.STOREHOUSE);
      expect(storehouses.length).to.be(3);

      storehouses[0].resources = {
        [ResourceType.BERRY]: 0,
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 0,
        [ResourceType.PEBBLE]: 0,
      };

      // we should end up picking this storehouse
      storehouses[1].resources = {
        [ResourceType.BERRY]: 2,
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 0,
        [ResourceType.PEBBLE]: 0,
      };

      storehouses[2].resources = {
        [ResourceType.BERRY]: 0,
        [ResourceType.TWIG]: 0,
        [ResourceType.RESIN]: 4,
        [ResourceType.PEBBLE]: 0,
      };

      expect(player.getPointsFromCards(gameState)).to.be(6);
      expect(player.getClaimedEvent(EventName.SPECIAL_X_MARKS_THE_SPOT)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_X_MARKS_THE_SPOT));

      expect(player.getPointsFromEvents(gameState)).to.be(0);
      expect(player.getPointsFromCards(gameState)).to.be(11);

      storehouses = player.getPlayedCardForCardName(CardName.STOREHOUSE);

      expect(storehouses.length).to.be(3);

      let resources = storehouses[0].resources || {};
      expect(resources[ResourceType.VP]).to.be(undefined);

      resources = storehouses[1].resources || {};
      expect(resources[ResourceType.VP]).to.be(5);

      resources = storehouses[2].resources || {};
      expect(resources[ResourceType.VP]).to.be(undefined);
    });

    it("max 6 VP tokens on storehouse", () => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();
      const event = Event.fromName(EventName.SPECIAL_X_MARKS_THE_SPOT);
      const gameInput = claimEventInput(event.name);
      const deckLength = gameState.deck.length;

      gameState.eventsMap[EventName.SPECIAL_X_MARKS_THE_SPOT] = null;

      player.addToCity(gameState, CardName.PIRATE_SHIP);
      player.addToCity(gameState, CardName.STOREHOUSE);

      const playedCard = player.getFirstPlayedCard(CardName.STOREHOUSE);
      playedCard.resources = {
        [ResourceType.BERRY]: 2,
        [ResourceType.TWIG]: 3,
        [ResourceType.RESIN]: 4,
        [ResourceType.PEBBLE]: 1,
      };

      expect(player.getPointsFromCards(gameState)).to.be(2);
      expect(player.getClaimedEvent(EventName.SPECIAL_X_MARKS_THE_SPOT)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_X_MARKS_THE_SPOT));

      expect(player.getPointsFromEvents(gameState)).to.be(0);
      expect(player.getPointsFromCards(gameState)).to.be(8);

      const resources =
        player.getFirstPlayedCard(CardName.STOREHOUSE).resources || {};

      expect(resources[ResourceType.VP]).to.be(6);
    });
  });

  describe(EventName.SPECIAL_MASQUERADE_INVITATIONS, () => {
    beforeEach(() => {
      gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
      player = gameState.getActivePlayer();

      player.addCardToHand(gameState, CardName.HUSBAND);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.QUEEN);
      player.addCardToHand(gameState, CardName.KING);
      player.addCardToHand(gameState, CardName.FERRY);
      player.addCardToHand(gameState, CardName.FERRY_FERRET);

      gameState.eventsMap[EventName.SPECIAL_MASQUERADE_INVITATIONS] = null;

      player.addToCity(gameState, CardName.FAIRGROUNDS);
      player.addToCity(gameState, CardName.MESSENGER);
    });

    it("should allow player to give 6 cards to another player for 6 VP", () => {
      const event = Event.fromName(EventName.SPECIAL_MASQUERADE_INVITATIONS);
      const gameInput = claimEventInput(event.name);
      let player2 = gameState.players[1];

      expect(
        player.getClaimedEvent(EventName.SPECIAL_MASQUERADE_INVITATIONS)
      ).to.be(undefined);

      const selectPlayerInput = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: gameInput,
        prevInputType: GameInputType.CLAIM_EVENT,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: { selectedPlayer: player2.playerId },
      };

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectPlayerInput,
        cardOptions: player.cardsInHand,
        maxToSelect: 6,
        minToSelect: 0,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: {
          selectedCards: [
            CardName.HUSBAND,
            CardName.FERRY_FERRET,
            CardName.WIFE,
            CardName.WIFE,
            CardName.QUEEN,
            CardName.KING,
          ],
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectPlayerInput,
        selectCardsInput,
      ]);

      player2 = gameState.getPlayer(player2.playerId);

      player = gameState.getPlayer(player.playerId);

      expect(player.getClaimedEvent(EventName.SPECIAL_MASQUERADE_INVITATIONS));

      expect(player.cardsInHand).to.eql([CardName.FERRY]);

      expect(player2.cardsInHand).to.eql([
        CardName.HUSBAND,
        CardName.FERRY_FERRET,
        CardName.WIFE,
        CardName.WIFE,
        CardName.QUEEN,
        CardName.KING,
      ]);

      expect(player.getPointsFromEvents(gameState)).to.be(6);
    });

    it("should allow player to give fewer than 6 cards", () => {
      const event = Event.fromName(EventName.SPECIAL_MASQUERADE_INVITATIONS);
      const gameInput = claimEventInput(event.name);
      let player2 = gameState.players[1];

      expect(
        player.getClaimedEvent(EventName.SPECIAL_MASQUERADE_INVITATIONS)
      ).to.be(undefined);

      const selectPlayerInput = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: gameInput,
        prevInputType: GameInputType.CLAIM_EVENT,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: { selectedPlayer: player2.playerId },
      };

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectPlayerInput,
        cardOptions: player.cardsInHand,
        maxToSelect: 6,
        minToSelect: 0,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: {
          selectedCards: [CardName.HUSBAND, CardName.FERRY_FERRET],
        },
      };

      const selectAnotherPlayerInput = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: selectCardsInput,
        prevInputType: GameInputType.SELECT_CARDS,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: { selectedPlayer: null },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectPlayerInput,
        selectCardsInput,
        selectAnotherPlayerInput,
      ]);

      player2 = gameState.getPlayer(player2.playerId);

      player = gameState.getPlayer(player.playerId);

      expect(player.getClaimedEvent(EventName.SPECIAL_MASQUERADE_INVITATIONS));

      expect(player.cardsInHand).to.eql([
        CardName.WIFE,
        CardName.WIFE,
        CardName.QUEEN,
        CardName.KING,
        CardName.FERRY,
      ]);

      expect(player2.cardsInHand).to.eql([
        CardName.HUSBAND,
        CardName.FERRY_FERRET,
      ]);

      expect(player.getPointsFromEvents(gameState)).to.be(2);
    });

    it("should work with more than 2 players", () => {
      const event = Event.fromName(EventName.SPECIAL_MASQUERADE_INVITATIONS);
      gameState = testInitialGameState({
        numPlayers: 4,
        gameOptions: { pearlbrook: true },
      });
      const gameInput = claimEventInput(event.name);
      let player = gameState.getActivePlayer();
      let player2 = gameState.players[1];
      let player3 = gameState.players[2];
      let player4 = gameState.players[3];

      player.addCardToHand(gameState, CardName.HUSBAND);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.QUEEN);
      player.addCardToHand(gameState, CardName.KING);
      player.addCardToHand(gameState, CardName.FERRY);
      player.addCardToHand(gameState, CardName.FERRY_FERRET);

      gameState.eventsMap[EventName.SPECIAL_MASQUERADE_INVITATIONS] = null;

      player.addToCity(gameState, CardName.FAIRGROUNDS);
      player.addToCity(gameState, CardName.MESSENGER);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_MASQUERADE_INVITATIONS)
      ).to.be(undefined);

      const selectFirstOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: gameInput,
        prevInputType: GameInputType.CLAIM_EVENT,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: { selectedPlayer: player2.playerId },
      };

      const selectFirstCards = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectFirstOppo,
        cardOptions: player.cardsInHand,
        maxToSelect: 6,
        minToSelect: 0,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: {
          selectedCards: [CardName.HUSBAND, CardName.FERRY_FERRET],
        },
      };

      const selectSecondOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: selectFirstCards,
        prevInputType: GameInputType.SELECT_CARDS,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: { selectedPlayer: player4.playerId },
      };

      const selectSecondCards = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectSecondOppo,
        cardOptions: [
          CardName.WIFE,
          CardName.WIFE,
          CardName.QUEEN,
          CardName.KING,
          CardName.FERRY,
        ],
        maxToSelect: 4,
        minToSelect: 0,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: {
          selectedCards: [CardName.QUEEN, CardName.WIFE, CardName.KING],
        },
      };

      const selectThirdOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: selectSecondCards,
        prevInputType: GameInputType.SELECT_CARDS,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: { selectedPlayer: player3.playerId },
      };

      const selectThirdCards = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectThirdOppo,
        cardOptions: [CardName.WIFE, CardName.FERRY],
        maxToSelect: 1,
        minToSelect: 0,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: {
          selectedCards: [CardName.FERRY],
        },
      };

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        selectFirstOppo,
        selectFirstCards,
        selectSecondOppo,
        selectSecondCards,
        selectThirdOppo,
        selectThirdCards,
      ]);

      player2 = gameState.getPlayer(player2.playerId);
      player3 = gameState.getPlayer(player3.playerId);
      player4 = gameState.getPlayer(player4.playerId);

      expect(player.getClaimedEvent(EventName.SPECIAL_MASQUERADE_INVITATIONS));
      expect(player.cardsInHand).to.eql([CardName.WIFE]);
      expect(player.getPointsFromEvents(gameState)).to.be(6);

      expect(player2.cardsInHand).to.eql([
        CardName.HUSBAND,
        CardName.FERRY_FERRET,
      ]);
      expect(player3.cardsInHand).to.eql([CardName.FERRY]);
      expect(player4.cardsInHand).to.eql([
        CardName.QUEEN,
        CardName.WIFE,
        CardName.KING,
      ]);
    });

    it("should be able to claim event with 0 cards in hand", () => {
      const event = Event.fromName(EventName.SPECIAL_MASQUERADE_INVITATIONS);
      gameState = testInitialGameState({
        gameOptions: { pearlbrook: true },
      });
      const gameInput = claimEventInput(event.name);
      let player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_MASQUERADE_INVITATIONS] = null;

      player.addToCity(gameState, CardName.FAIRGROUNDS);
      player.addToCity(gameState, CardName.MESSENGER);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_MASQUERADE_INVITATIONS)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_MASQUERADE_INVITATIONS));
      expect(player.cardsInHand).to.eql([]);
      expect(player.getPointsFromEvents(gameState)).to.be(0);
    });

    it("should not be able to give more than 6 cards to another player", () => {
      const event = Event.fromName(EventName.SPECIAL_MASQUERADE_INVITATIONS);
      const gameInput = claimEventInput(event.name);
      const player2 = gameState.players[1];

      expect(
        player.getClaimedEvent(EventName.SPECIAL_MASQUERADE_INVITATIONS)
      ).to.be(undefined);

      const selectPlayerInput = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: gameInput,
        prevInputType: GameInputType.CLAIM_EVENT,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: { selectedPlayer: player2.playerId },
      };

      const selectCardsInput = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectPlayerInput,
        cardOptions: player.cardsInHand,
        maxToSelect: 6,
        minToSelect: 0,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: {
          selectedCards: [
            CardName.HUSBAND,
            CardName.FERRY_FERRET,
            CardName.WIFE,
            CardName.WIFE,
            CardName.QUEEN,
            CardName.KING,
            CardName.FERRY,
          ],
        },
      };

      gameState = gameState.next(gameInput);

      gameState = gameState.next(selectPlayerInput);

      expect(() => {
        gameState.next(selectCardsInput);
      }).to.throwException(/Please select a max of 6 cards/i);
    });

    it("should not be able to give more than 6 cards across all donations", () => {
      const event = Event.fromName(EventName.SPECIAL_MASQUERADE_INVITATIONS);
      gameState = testInitialGameState({
        numPlayers: 4,
        gameOptions: { pearlbrook: true },
      });
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();
      const player2 = gameState.players[1];
      const player3 = gameState.players[2];
      const player4 = gameState.players[3];

      player.addCardToHand(gameState, CardName.HUSBAND);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.WIFE);
      player.addCardToHand(gameState, CardName.QUEEN);
      player.addCardToHand(gameState, CardName.KING);
      player.addCardToHand(gameState, CardName.FERRY);
      player.addCardToHand(gameState, CardName.FERRY_FERRET);

      gameState.eventsMap[EventName.SPECIAL_MASQUERADE_INVITATIONS] = null;

      player.addToCity(gameState, CardName.FAIRGROUNDS);
      player.addToCity(gameState, CardName.MESSENGER);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_MASQUERADE_INVITATIONS)
      ).to.be(undefined);

      const selectFirstOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: gameInput,
        prevInputType: GameInputType.CLAIM_EVENT,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: { selectedPlayer: player2.playerId },
      };

      const selectFirstCards = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectFirstOppo,
        cardOptions: player.cardsInHand,
        maxToSelect: 6,
        minToSelect: 0,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: {
          selectedCards: [CardName.HUSBAND, CardName.FERRY_FERRET],
        },
      };

      const selectSecondOppo = {
        inputType: GameInputType.SELECT_PLAYER as const,
        prevInput: selectFirstCards,
        prevInputType: GameInputType.SELECT_CARDS,
        playerOptions: gameState.players
          .filter((p) => {
            return p.playerId !== player.playerId;
          })
          .map((p) => p.playerId),
        mustSelectOne: false,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: { selectedPlayer: player4.playerId },
      };

      const selectSecondCards = {
        inputType: GameInputType.SELECT_CARDS as const,
        prevInputType: GameInputType.SELECT_PLAYER,
        prevInput: selectSecondOppo,
        cardOptions: [
          CardName.WIFE,
          CardName.WIFE,
          CardName.QUEEN,
          CardName.KING,
          CardName.FERRY,
        ],
        maxToSelect: 4,
        minToSelect: 0,
        eventContext: EventName.SPECIAL_MASQUERADE_INVITATIONS,
        clientOptions: {
          selectedCards: [
            CardName.QUEEN,
            CardName.WIFE,
            CardName.KING,
            CardName.FERRY,
            CardName.WIFE,
          ],
        },
      };

      gameState = gameState.next(gameInput);
      gameState = gameState.next(selectFirstOppo);
      gameState = gameState.next(selectFirstCards);
      gameState = gameState.next(selectSecondOppo);

      expect(() => {
        gameState.next(selectSecondCards);
      }).to.throwException(/Please select a max of 4 cards/i);
    });
  });

  describe(EventName.SPECIAL_CITY_JUBILEE, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_CITY_JUBILEE] = null;

      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
    });

    it("should allow player claim event with no other claimed events", () => {
      const event = Event.fromName(EventName.SPECIAL_CITY_JUBILEE);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_CITY_JUBILEE)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_CITY_JUBILEE));
      expect(player.getPointsFromEvents(gameState)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(2);
    });
    it("should calculate points correctly when player has claimed 1 basic event", () => {
      const event = Event.fromName(EventName.SPECIAL_CITY_JUBILEE);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_CITY_JUBILEE)).to.be(
        undefined
      );

      player.placeWorkerOnEvent(EventName.BASIC_FOUR_PRODUCTION);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_CITY_JUBILEE));

      // 2 from event, 1 from
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(2 + 1);
    });
    it("should calculate points correctly when player has claimed other special events", () => {
      const event = Event.fromName(EventName.SPECIAL_CITY_JUBILEE);
      const gameInput = claimEventInput(event.name);
      expect(player.getClaimedEvent(EventName.SPECIAL_CITY_JUBILEE)).to.be(
        undefined
      );
      player.placeWorkerOnEvent(EventName.SPECIAL_ANCIENT_SCROLLS_DISCOVERED);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_CITY_JUBILEE));

      // 2 from SPECIAL_CITY_JUBILEE, 2 from ANCIENT_SCROLLS_DISCOVERED
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(2 + 2);
    });
  });

  describe(EventName.SPECIAL_EVER_WALL_TOWER_CONSTRUCTED, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_EVER_WALL_TOWER_CONSTRUCTED] = null;
    });

    it("should not allow player to claim event with < 9 constructions", () => {
      const event = Event.fromName(
        EventName.SPECIAL_EVER_WALL_TOWER_CONSTRUCTED
      );
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_EVER_WALL_TOWER_CONSTRUCTED)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Constructions/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_EVER_WALL_TOWER_CONSTRUCTED)
      ).to.be(undefined);
    });

    it("should allow player to claim event with >= 9 constructions", () => {
      const event = Event.fromName(
        EventName.SPECIAL_EVER_WALL_TOWER_CONSTRUCTED
      );
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_EVER_WALL_TOWER_CONSTRUCTED)
      ).to.be(undefined);

      player.addToCityMulti(gameState, [
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
      ]);
      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_EVER_WALL_TOWER_CONSTRUCTED)
      );
      expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
  });

  describe(EventName.SPECIAL_GLOW_LIGHT_FESTIVAL, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_GLOW_LIGHT_FESTIVAL] = null;
    });
    it("should not allow player to claim event conditions if not met", () => {
      const event = Event.fromName(EventName.SPECIAL_GLOW_LIGHT_FESTIVAL);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_GLOW_LIGHT_FESTIVAL)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 3 PRODUCTION/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_GLOW_LIGHT_FESTIVAL)
      ).to.be(undefined);
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_GLOW_LIGHT_FESTIVAL);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_GLOW_LIGHT_FESTIVAL)
      ).to.be(undefined);

      player.addToCityMulti(gameState, [
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.WANDERER,
        CardName.WANDERER,
      ]);
      expect(player.getNumCardsInCity()).to.be(5);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_GLOW_LIGHT_FESTIVAL,
          cardOptions: player.getPlayedCards(),
          maxToSelect: 3,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [
              player.getFirstPlayedCard(CardName.FARM),
              player.getFirstPlayedCard(CardName.WANDERER),
            ],
          },
        },
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_GLOW_LIGHT_FESTIVAL));
      expect(player.getPointsFromEvents(gameState)).to.be(3);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(2);
      expect(player.getNumCardsInCity()).to.be(3);
    });
    it("should allow player to claim event and not discard cards", () => {
      const event = Event.fromName(EventName.SPECIAL_GLOW_LIGHT_FESTIVAL);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_GLOW_LIGHT_FESTIVAL)
      ).to.be(undefined);

      player.addToCityMulti(gameState, [
        CardName.FARM,
        CardName.FARM,
        CardName.FARM,
        CardName.WANDERER,
        CardName.WANDERER,
      ]);
      expect(player.getNumCardsInCity()).to.be(5);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_GLOW_LIGHT_FESTIVAL,
          cardOptions: player.getPlayedCards(),
          maxToSelect: 3,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        },
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_GLOW_LIGHT_FESTIVAL));
      expect(player.getPointsFromEvents(gameState)).to.be(3);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
      expect(player.getNumCardsInCity()).to.be(5);
    });
  });

  describe(EventName.SPECIAL_HOT_AIR_BALLOON_RACE, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_HOT_AIR_BALLOON_RACE] = null;
    });
    it("should not allow player to claim event conditions if not met", () => {
      const event = Event.fromName(EventName.SPECIAL_HOT_AIR_BALLOON_RACE);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_HOT_AIR_BALLOON_RACE)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 2 TRAVELER/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_HOT_AIR_BALLOON_RACE)
      ).to.be(undefined);
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_HOT_AIR_BALLOON_RACE);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_HOT_AIR_BALLOON_RACE)
      ).to.be(undefined);

      player.addToCityMulti(gameState, [
        CardName.WANDERER,
        CardName.WANDERER,
        CardName.SHOPKEEPER,
        CardName.JUDGE,
      ]);
      expect(player.getNumCardsInCity()).to.be(4);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_HOT_AIR_BALLOON_RACE,
          cardOptions: player.getPlayedCards(),
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.SHOPKEEPER)],
          },
        },
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_HOT_AIR_BALLOON_RACE));
      expect(player.getPointsFromEvents(gameState)).to.be(4);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
      expect(player.getNumCardsInCity()).to.be(3);
    });
    it("should allow player to claim event and not discard cards", () => {
      const event = Event.fromName(EventName.SPECIAL_HOT_AIR_BALLOON_RACE);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_HOT_AIR_BALLOON_RACE)
      ).to.be(undefined);

      player.addToCityMulti(gameState, [
        CardName.WANDERER,
        CardName.WANDERER,
        CardName.SHOPKEEPER,
        CardName.JUDGE,
      ]);
      expect(player.getNumCardsInCity()).to.be(4);

      [player, gameState] = multiStepGameInputTest(gameState, [
        gameInput,
        {
          inputType: GameInputType.SELECT_PLAYED_CARDS,
          prevInputType: GameInputType.CLAIM_EVENT,
          eventContext: EventName.SPECIAL_HOT_AIR_BALLOON_RACE,
          cardOptions: player.getPlayedCards(),
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        },
      ]);

      expect(player.getClaimedEvent(EventName.SPECIAL_HOT_AIR_BALLOON_RACE));
      expect(player.getPointsFromEvents(gameState)).to.be(4);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
      expect(player.getNumCardsInCity()).to.be(4);
    });
  });

  describe(EventName.SPECIAL_JUNIPER_JIG_DANCE_CONTEST, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_JUNIPER_JIG_DANCE_CONTEST] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_JUNIPER_JIG_DANCE_CONTEST);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_JUNIPER_JIG_DANCE_CONTEST)
      ).to.be(undefined);

      player.addToCityMulti(gameState, [
        CardName.WIFE,
        CardName.WIFE,
        CardName.WIFE,
        CardName.WIFE,
        CardName.WIFE,
        CardName.WIFE,
        CardName.WIFE,
        CardName.WIFE,
        CardName.WIFE,
      ]);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_JUNIPER_JIG_DANCE_CONTEST)
      );
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event with < 9 Critters", () => {
      const event = Event.fromName(EventName.SPECIAL_JUNIPER_JIG_DANCE_CONTEST);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_JUNIPER_JIG_DANCE_CONTEST)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_JUNIPER_JIG_DANCE_CONTEST)
      ).to.be(undefined);
    });
  });
  describe.skip(EventName.SPECIAL_MAGIC_SNOW, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_MAGIC_SNOW] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_MAGIC_SNOW);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_MAGIC_SNOW)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_MAGIC_SNOW));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_MAGIC_SNOW);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_MAGIC_SNOW)).to.be(
        undefined
      );

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(player.getClaimedEvent(EventName.SPECIAL_MAGIC_SNOW)).to.be(
        undefined
      );
    });
  });
  describe.skip(EventName.SPECIAL_ROYAL_TEA, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_ROYAL_TEA] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_ROYAL_TEA);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_ROYAL_TEA)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_ROYAL_TEA));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_ROYAL_TEA);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_ROYAL_TEA)).to.be(
        undefined
      );

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(player.getClaimedEvent(EventName.SPECIAL_ROYAL_TEA)).to.be(
        undefined
      );
    });
  });
  describe.skip(EventName.SPECIAL_STOCK_MARKET_BOOM, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_STOCK_MARKET_BOOM] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_STOCK_MARKET_BOOM);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_STOCK_MARKET_BOOM)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_STOCK_MARKET_BOOM));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_STOCK_MARKET_BOOM);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_STOCK_MARKET_BOOM)).to.be(
        undefined
      );

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(player.getClaimedEvent(EventName.SPECIAL_STOCK_MARKET_BOOM)).to.be(
        undefined
      );
    });
  });
  describe.skip(EventName.SPECIAL_SUNFLOWER_PARADE, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_SUNFLOWER_PARADE] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_SUNFLOWER_PARADE);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_SUNFLOWER_PARADE)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_SUNFLOWER_PARADE));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_SUNFLOWER_PARADE);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_SUNFLOWER_PARADE)).to.be(
        undefined
      );

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(player.getClaimedEvent(EventName.SPECIAL_SUNFLOWER_PARADE)).to.be(
        undefined
      );
    });
  });

  // Bellfaire Events
  describe.skip(EventName.SPECIAL_ARCHITECTURAL_RENAISSANCE, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_ARCHITECTURAL_RENAISSANCE] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_ARCHITECTURAL_RENAISSANCE);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_ARCHITECTURAL_RENAISSANCE)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_ARCHITECTURAL_RENAISSANCE)
      );
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_ARCHITECTURAL_RENAISSANCE);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_ARCHITECTURAL_RENAISSANCE)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_ARCHITECTURAL_RENAISSANCE)
      ).to.be(undefined);
    });
  });
  describe.skip(EventName.SPECIAL_ARTS_AND_MUSIC_FESTIVAL, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_ARTS_AND_MUSIC_FESTIVAL] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_ARTS_AND_MUSIC_FESTIVAL);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_ARTS_AND_MUSIC_FESTIVAL)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_ARTS_AND_MUSIC_FESTIVAL));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_ARTS_AND_MUSIC_FESTIVAL);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_ARTS_AND_MUSIC_FESTIVAL)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_ARTS_AND_MUSIC_FESTIVAL)
      ).to.be(undefined);
    });
  });
  describe.skip(EventName.SPECIAL_BED_AND_BREAKFAST_GUILD, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_BED_AND_BREAKFAST_GUILD] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_BED_AND_BREAKFAST_GUILD);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_BED_AND_BREAKFAST_GUILD)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_BED_AND_BREAKFAST_GUILD));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_BED_AND_BREAKFAST_GUILD);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_BED_AND_BREAKFAST_GUILD)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_BED_AND_BREAKFAST_GUILD)
      ).to.be(undefined);
    });
  });
  describe.skip(EventName.SPECIAL_CITY_HOLIDAY, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_CITY_HOLIDAY] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_CITY_HOLIDAY);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_CITY_HOLIDAY)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_CITY_HOLIDAY));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_CITY_HOLIDAY);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_CITY_HOLIDAY)).to.be(
        undefined
      );

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_BED_AND_BREAKFAST_GUILD)
      ).to.be(undefined);
    });
  });
  describe.skip(EventName.SPECIAL_GATHERING_OF_ELDERS, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_GATHERING_OF_ELDERS] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_GATHERING_OF_ELDERS);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_GATHERING_OF_ELDERS)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_GATHERING_OF_ELDERS));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_GATHERING_OF_ELDERS);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_GATHERING_OF_ELDERS)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_GATHERING_OF_ELDERS)
      ).to.be(undefined);
    });
  });
  describe.skip(EventName.SPECIAL_KINGS_ROAD_ESTABLISHED, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_KINGS_ROAD_ESTABLISHED] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_KINGS_ROAD_ESTABLISHED);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_KINGS_ROAD_ESTABLISHED)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_KINGS_ROAD_ESTABLISHED));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_KINGS_ROAD_ESTABLISHED);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_KINGS_ROAD_ESTABLISHED)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_KINGS_ROAD_ESTABLISHED)
      ).to.be(undefined);
    });
  });
  describe.skip(EventName.SPECIAL_PIE_EATING_CONTEST, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_PIE_EATING_CONTEST] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_PIE_EATING_CONTEST);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_PIE_EATING_CONTEST)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_PIE_EATING_CONTEST));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_PIE_EATING_CONTEST);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_PIE_EATING_CONTEST)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_PIE_EATING_CONTEST)
      ).to.be(undefined);
    });
  });
  describe.skip(EventName.SPECIAL_ROYAL_WEDDING, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_ROYAL_WEDDING] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_ROYAL_WEDDING);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_ROYAL_WEDDING)).to.be(
        undefined
      );

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_ROYAL_WEDDING));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_ROYAL_WEDDING);
      const gameInput = claimEventInput(event.name);

      expect(player.getClaimedEvent(EventName.SPECIAL_ROYAL_WEDDING)).to.be(
        undefined
      );

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(player.getClaimedEvent(EventName.SPECIAL_ROYAL_WEDDING)).to.be(
        undefined
      );
    });
  });
  describe.skip(EventName.SPECIAL_STATUES_COMMISSIONED, () => {
    beforeEach(() => {
      gameState = testInitialGameState();
      player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_STATUES_COMMISSIONED] = null;
    });

    it("should allow player to claim event", () => {
      const event = Event.fromName(EventName.SPECIAL_STATUES_COMMISSIONED);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_STATUES_COMMISSIONED)
      ).to.be(undefined);

      [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

      expect(player.getClaimedEvent(EventName.SPECIAL_STATUES_COMMISSIONED));
      // expect(player.getPointsFromEvents(gameState)).to.be(5);
    });
    it("should not allow player to claim event if conditions not met", () => {
      const event = Event.fromName(EventName.SPECIAL_STATUES_COMMISSIONED);
      const gameInput = claimEventInput(event.name);

      expect(
        player.getClaimedEvent(EventName.SPECIAL_STATUES_COMMISSIONED)
      ).to.be(undefined);

      expect(() => {
        gameState.next(gameInput);
      }).to.throwException(/Need at least 9 Critters/i);
      expect(
        player.getClaimedEvent(EventName.SPECIAL_STATUES_COMMISSIONED)
      ).to.be(undefined);
    });
  });
});
