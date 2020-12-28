import expect from "expect.js";
import { Event } from "./event";
import { GameState } from "./gameState";
import { createPlayer } from "./player";
import { EventName, GameInputType, GameInput, CardName } from "./types";

const claimEventInput = (event: EventName): GameInput => {
  return {
    inputType: GameInputType.CLAIM_EVENT,
    event,
  };
};

describe("Event", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = GameState.initialGameState({
      players: [createPlayer("One"), createPlayer("Two")],
    });
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
      player.playedCards = {};
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.playedCards[CardName.MINE] = [{}, {}];
      player.playedCards[CardName.FARM] = [{}, {}];
      expect(event.canPlay(gameState, gameInput)).to.be(true);
    });
  });

  describe(EventName.BASIC_THREE_DESTINATION, () => {
    it("should only be playable with three destination tags", () => {
      const event = Event.fromName(EventName.BASIC_THREE_DESTINATION);
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();
      player.playedCards = {};
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.playedCards[CardName.UNIVERSITY] = [{}];
      player.playedCards[CardName.QUEEN] = [{}];
      player.playedCards[CardName.LOOKOUT] = [{}];
      expect(event.canPlay(gameState, gameInput)).to.be(true);
    });
  });

  describe(EventName.BASIC_THREE_TRAVELER, () => {
    it("should only be playable with three traverler tags", () => {
      const event = Event.fromName(EventName.BASIC_THREE_TRAVELER);
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();
      player.playedCards = {};
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.playedCards[CardName.WANDERER] = [{}, {}];
      player.playedCards[CardName.RANGER] = [{}];
      expect(event.canPlay(gameState, gameInput)).to.be(true);
    });
  });

  describe(EventName.BASIC_THREE_GOVERNANCE, () => {
    it("should only be playable with three governance tags", () => {
      const event = Event.fromName(EventName.BASIC_THREE_GOVERNANCE);
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();
      player.playedCards = {};
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.playedCards[CardName.JUDGE] = [{}];
      player.playedCards[CardName.HISTORIAN] = [{}];
      player.playedCards[CardName.INNKEEPER] = [{}];
      expect(event.canPlay(gameState, gameInput)).to.be(true);
    });
  });

  describe(EventName.SPECIAL_THE_EVERDELL_GAMES, () => {
    it("should only be playable with 2 of each tags", () => {
      const event = Event.fromName(EventName.SPECIAL_THE_EVERDELL_GAMES);
      const gameInput = claimEventInput(event.name);
      const player = gameState.getActivePlayer();

      gameState.eventsMap[EventName.SPECIAL_THE_EVERDELL_GAMES] = null;

      player.playedCards = {};
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.playedCards[CardName.JUDGE] = [{}];
      player.playedCards[CardName.HISTORIAN] = [{}];
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.playedCards[CardName.FARM] = [{}, {}];
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.playedCards[CardName.WANDERER] = [{}, {}];
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.playedCards[CardName.QUEEN] = [{}];
      player.playedCards[CardName.LOOKOUT] = [{}];
      expect(event.canPlay(gameState, gameInput)).to.be(false);

      player.playedCards[CardName.KING] = [{}];
      player.playedCards[CardName.WIFE] = [{}];
      expect(event.canPlay(gameState, gameInput)).to.be(true);
    });
  });
});
