import expect from "expect.js";
import { Card } from "../../card";
import { GameState } from "../../gameState";
import { Player } from "../../player";
import { testInitialGameState } from "../../testHelpers";
import { CardName, EventName } from "../../types";

describe(CardName.FYNN_NOBLETAIL, () => {
  let gameState: GameState;
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState();
    player = gameState.getActivePlayer();
  });

  it("should be worth 4 VP", () => {
    expect(Card.fromName(CardName.FYNN_NOBLETAIL).baseVP).to.equal(5);
  });

  it("should be worth 2 extra VP per basic event critter", () => {
    const card = Card.fromName(CardName.FYNN_NOBLETAIL);

    player.placeWorkerOnEvent(EventName.BASIC_FOUR_PRODUCTION);
    expect(card.getPoints(gameState, player.playerId)).to.be(5 + 2);

    player.placeWorkerOnEvent(EventName.SPECIAL_GRADUATION_OF_SCHOLARS);
    expect(card.getPoints(gameState, player.playerId)).to.be(5 + 2 + 3);
  });
});
