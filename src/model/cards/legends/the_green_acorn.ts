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

export const the_green_acorn: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.THE_GREEN_ACORN,
  associatedCard: CardName.INNKEEPER,
  cardType: CardType.DESTINATION,
  isConstruction: true,
  isUnique: false,
  baseVP: 4,
  numInDeck: 1,
  cardDescription: toGameText([
    "Play a ",
    { type: "em", text: "Critter" },
    " or ",
    { type: "em", text: "Construction" },
    "for 4 fewer ANY",
  ]),
  baseCost: {
    [ResourceType.TWIG]: 3,
    [ResourceType.RESIN]: 3,
  },
  canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
    // TODO: Implement this
    return null;
  },
  playInner: (gameState: GameState, gameInput: GameInput) => {
    // TODO: Implement this
  },
};
