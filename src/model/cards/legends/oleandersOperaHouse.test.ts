import expect from "expect.js";
import { Card } from "../../card";
import { GameState } from "../../gameState";
import { Player } from "../../player";
import { testInitialGameState } from "../../testHelpers";
import { CardName } from "../../types";

describe(CardName.OLEANDERS_OPERA_HOUSE, () => {
  let gameState: GameState;
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState();
    player = gameState.getActivePlayer();
  });

  it("should be worth 4 VP", () => {
    expect(Card.fromName(CardName.OLEANDERS_OPERA_HOUSE).baseVP).to.equal(4);
  });

  it("should be worth 2 extra VP per unique critter", () => {
    const card = Card.fromName(CardName.OLEANDERS_OPERA_HOUSE);
    player.addToCity(gameState, card.name);
    const playerId = player.playerId;

    expect(card.getPoints(gameState, playerId)).to.be(4 + 0);

    player.addToCity(gameState, CardName.DUNGEON);
    expect(card.getPoints(gameState, playerId)).to.be(4 + 0);

    player.addToCity(gameState, CardName.RANGER);
    expect(card.getPoints(gameState, playerId)).to.be(4 + 2);

    player.addToCity(gameState, CardName.HUSBAND);
    expect(card.getPoints(gameState, playerId)).to.be(4 + 2);

    player.addToCity(gameState, CardName.WANDERER);
    expect(card.getPoints(gameState, playerId)).to.be(4 + 2);

    player.addToCity(gameState, CardName.BARD);
    expect(card.getPoints(gameState, playerId)).to.be(4 + 4);
  });
});
