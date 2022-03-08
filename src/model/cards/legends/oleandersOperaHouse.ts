import { Card, getPointsPerRarityLabel } from "../../card";
import { toGameText } from "../../gameText";
import { CardName, CardType, ExpansionType, ResourceType } from "../../types";

export const oleandersOperaHouse: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.OLEANDERS_OPERA_HOUSE,
  associatedCard: CardName.BARD,
  upgradeableCard: CardName.THEATRE,
  cardType: CardType.PROSPERITY,
  isConstruction: true,
  isUnique: false,
  baseVP: 4,
  numInDeck: 1,
  cardDescription: toGameText([
    { type: "points", value: 2 },
    " for each ",
    { type: "em", text: "Unique Critter" },
    " in your city.",
  ]),
  baseCost: {
    [ResourceType.TWIG]: 3,
    [ResourceType.RESIN]: 2,
    [ResourceType.PEBBLE]: 2,
  },
  pointsInner: getPointsPerRarityLabel({
    isCritter: true,
    isUnique: true,
    pointsEach: 2,
  }),
};
