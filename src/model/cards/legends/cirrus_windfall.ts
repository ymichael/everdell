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

export const cirrus_windfall: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.CIRRUS_WINDFALL,
  upgradeableCard: CardName.POSTAL_PIGEON,
  cardType: CardType.TRAVELER,
  cardDescription: toGameText(
    "You may play 1 CARD worth up to 3 POINT for free."
  ),
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
