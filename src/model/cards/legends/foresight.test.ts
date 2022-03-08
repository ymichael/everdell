import expect from "expect.js";
import { Card } from "../../card";
import { GameState } from "../../gameState";
import { Player } from "../../player";
import {
  multiStepGameInputTest,
  playCardInput,
  testInitialGameState,
} from "../../testHelpers";
import { CardName, GameInputType, ResourceType } from "../../types";

describe(CardName.FORESIGHT, () => {
  let gameState: GameState;
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState();
    player = gameState.getActivePlayer();
  });

  it("should be worth 4 VP", () => {
    expect(Card.fromName(CardName.FORESIGHT).baseVP).to.equal(4);
  });

  it("should draw 2 cards if player plays a critter", () => {
    player.addToCity(gameState, CardName.FORESIGHT);

    const cardToPlay = Card.fromName(CardName.MINER_MOLE);
    player.cardsInHand.push(cardToPlay.name);
    player.gainResources(gameState, cardToPlay.baseCost);

    gameState.deck.addToStack(CardName.QUEEN);
    gameState.deck.addToStack(CardName.KING);

    [player, gameState] = multiStepGameInputTest(gameState, [
      playCardInput(cardToPlay.name),
    ]);

    expect(player.cardsInHand).to.eql([CardName.KING, CardName.QUEEN]);
  });

  it("should gain a resource if player plays a construction", () => {
    player.addToCity(gameState, CardName.FORESIGHT);

    const cardToPlay = Card.fromName(CardName.MINE);
    player.cardsInHand = [cardToPlay.name];
    player.gainResources(gameState, cardToPlay.baseCost);

    [player, gameState] = multiStepGameInputTest(gameState, [
      playCardInput(cardToPlay.name),
      {
        inputType: GameInputType.SELECT_OPTION_GENERIC,
        prevInputType: GameInputType.PLAY_CARD,
        cardContext: CardName.FORESIGHT,
        options: ["TWIG", "RESIN", "PEBBLE", "BERRY"],
        clientOptions: {
          selectedOption: "BERRY",
        },
      },
    ]);

    expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
    expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
  });

  it("should not draw cards when the player plays the foresight", () => {
    const cardToPlay = Card.fromName(CardName.FORESIGHT);
    player.cardsInHand = [cardToPlay.name];
    player.gainResources(gameState, cardToPlay.baseCost);

    [player, gameState] = multiStepGameInputTest(gameState, [
      playCardInput(cardToPlay.name),
    ]);
    expect(player.cardsInHand).to.eql([]);
  });
});
