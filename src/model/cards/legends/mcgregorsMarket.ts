import { Card } from "../../card";
import { GameState } from "../../gameState";
import { GainMoreThan1AnyResource } from "../../gameStatePlayHelpers";
import { toGameText } from "../../gameText";
import {
  CardName,
  CardType,
  ExpansionType,
  GameInput,
  ResourceType,
} from "../../types";

export const mcgregorsMarket: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.MCGREGORS_MARKET,
  associatedCard: null,
  upgradeableCard: CardName.FARM,
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
  playInner: (gameState: GameState, gameInput: GameInput) => {
    const gainAnyHelper = new GainMoreThan1AnyResource({
      cardContext: CardName.MCGREGORS_MARKET,
    });
    if (gainAnyHelper.matchesGameInput(gameInput)) {
      gainAnyHelper.play(gameState, gameInput);
    }
  },
};
