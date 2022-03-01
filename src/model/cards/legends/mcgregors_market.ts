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

export const mcgregors_market: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.MCGREGORS_MARKET,
  associatedCard: null,
  cardType: CardType.PRODUCTION,
  isConstruction: true,
  isUnique: false,
  baseVP: 5,
  numInDeck: 1,
  cardDescription: toGameText("Gain 2 ANY."),
  baseCost: {
    [ResourceType.TWIG]: 2,
    [ResourceType.RESIN]: 2,
    [ResourceType.PEBBLE]: 1,
  },
  canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
    // TODO: Implement this
    return null;
  },
  playInner: (gameState: GameState, gameInput: GameInput) => {
    // TODO: Implement this
  },
};
