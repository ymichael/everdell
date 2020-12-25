import { ResourceType, CardCost, CardType, ICard } from "./types";

export const allCards: ICard[] = [
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
