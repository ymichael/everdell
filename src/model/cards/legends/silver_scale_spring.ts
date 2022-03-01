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

export const silver_scale_spring: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.OLEANDERS_OPERA_HOUSE,
  associatedCard: CardName.PEDDLER,
  upgradeableCard: CardName.RUINS,
  cardType: CardType.TRAVELER,
  isConstruction: true,
  isUnique: false,
  baseVP: 2,
  numInDeck: 1,
  cardDescription: toGameText([
    "Play this card under a ",
    { type: "em", text: "Construction" },
    " in your city.",
    "Gain that ",
    { type: "em", text: "Construction" },
    "'s resources and draw 2 CARD",
  ]),
  baseCost: {
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
