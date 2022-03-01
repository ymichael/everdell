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

export const bridge_of_the_sky: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.BRIDGE_OF_THE_SKY,
  associatedCard: CardName.ARCHITECT,
  upgradeableCard: CardName.CRANE,
  cardType: CardType.GOVERNANCE,
  cardDescription: toGameText([
    "You may play 1 ",
    { type: "em", text: "Construction" },
    "for -3 ANY, then place it on top of this card.",
    "PLUS is equal to the POINT value of the ",
    { type: "em", text: "Construction" },
    "on top of this card.",
  ]),
  isConstruction: true,
  isUnique: false,
  baseVP: 0,
  numInDeck: 1,
  resourcesToGain: {},
  baseCost: {
    [ResourceType.PEBBLE]: 2,
  },
  playInner: (gameState: GameState, gameInput: GameInput) => {
    // TODO: Implement this
  },
};
