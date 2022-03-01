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

export const fynn_nobletail: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.FYNN_NOBLETAIL,
  upgradeableCard: CardName.KING,
  cardType: CardType.PROSPERITY,
  cardDescription: toGameText([
    "2 POINTS for each basic Event you achieved.",
    "3 POINTS for each special Event you achieved.",
  ]),
  isConstruction: false,
  isUnique: false,
  baseVP: 5,
  numInDeck: 1,
  resourcesToGain: {},
  baseCost: {
    [ResourceType.BERRY]: 7,
  },
  canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
    // TODO: Implement this
    return null;
  },
  playInner: (gameState: GameState, gameInput: GameInput) => {
    // TODO: Implement this
  },
};
