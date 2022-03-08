import { Card } from "../../card";
import { GameState } from "../../gameState";
import { toGameText } from "../../gameText";
import {
  CardName,
  CardType,
  ExpansionType,
  GameInput,
  GameInputType,
  ResourceType,
} from "../../types";

export const foresight: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.FORESIGHT,
  upgradeableCard: CardName.HISTORIAN,
  cardType: CardType.GOVERNANCE,
  cardDescription: toGameText([
    "Draw 2 CARD after you play a ",
    { type: "em", text: "Critter" },
    ". Gain 1 ANY after you play a ",
    { type: "em", text: "Construction" },
  ]),
  isConstruction: false,
  isUnique: false,
  baseVP: 4,
  numInDeck: 1,
  resourcesToGain: {},
  baseCost: {
    [ResourceType.BERRY]: 4,
  },
  playInner: (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    if (
      gameInput.inputType === GameInputType.PLAY_CARD &&
      gameInput.clientOptions.card !== CardName.FORESIGHT &&
      gameInput.clientOptions.card
    ) {
      const card = Card.fromName(gameInput.clientOptions.card);
      if (card.isCritter) {
        player.drawCards(gameState, 2);
        gameState.addGameLogFromCard(CardName.HISTORIAN, [
          player,
          ` drew 2 CARDS.`,
        ]);
      } else {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          label: "Select TWIG / RESIN / PEBBLE / BERRY",
          prevInputType: gameInput.inputType,
          cardContext: CardName.FORESIGHT,
          options: ["TWIG", "RESIN", "PEBBLE", "BERRY"],
          clientOptions: {
            selectedOption: null,
          },
        });
      }
    } else if (
      gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC &&
      gameInput.cardContext === CardName.FORESIGHT
    ) {
      const selectedOption = gameInput.clientOptions?.selectedOption || "";
      if (["TWIG", "RESIN", "PEBBLE", "BERRY"].indexOf(selectedOption) === -1) {
        throw new Error("Invalid input");
      }

      player.gainResources(gameState, {
        [selectedOption]: 1,
      });
      gameState.addGameLogFromCard(CardName.FORESIGHT, [
        player,
        ` gained ${selectedOption} for playing a Construction.`,
      ]);
    }
  },
};
