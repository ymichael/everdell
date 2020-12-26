import { ResourceType, CardCost, CardType, CardName } from "./types";

export const allCards = [
  {
    name: "Postal Pigeon",
    cardType: CardType.TRAVELER,
    rawCost: {
      [ResourceType.BERRY]: 2,
    },
    isUnique: false,
    isCritter: true,
    isConstruction: false,
    associatedCard: "Post Office",
    getPointTotal: () => 0,
  },
];
