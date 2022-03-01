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

export const poe: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.POE,
  associatedCard: CardName.TEACHER,
  cardType: CardType.PRODUCTION,
  cardDescription: toGameText(
    "Discard any number of CARD, then draw up to your hand limit."
  ),
  isConstruction: false,
  isUnique: false,
  baseVP: 4,
  numInDeck: 1,
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
