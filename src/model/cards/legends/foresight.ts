import { Card } from "../../card";
import { GameState } from "../../gameState";
import { toGameText } from "../../gameText";
import {
  CardName,
  CardType,
  ExpansionType,
  GameInput,
  ResourceType,
} from "../../types";

export const foresight: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.FORESIGHT,
  upgradeableCard: CardName.HISTORIAN,
  cardType: CardType.TRAVELER,
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
  canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
    // TODO: Implement this
    return null;
  },
  playInner: (gameState: GameState, gameInput: GameInput) => {
    // TODO: Implement this
  },
};
