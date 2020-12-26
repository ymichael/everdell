import { ResourceType, CardCost, CardType, CardName } from "./types";

export class Card {
  readonly name: CardName;
  readonly baseCost: CardCost;
  readonly baseVP: number;
  readonly cardType: CardType;
  readonly isUnique: boolean;
  readonly isCritter: boolean;
  readonly isConstruction: boolean;
  readonly associatedCard: CardName;

  constructor({
    name,
    baseCost,
    baseVP,
    cardType,
    isUnique,
    isConstruction,
    associatedCard,
  }: {
    name: CardName;
    baseCost: CardCost;
    baseVP: number;
    cardType: CardType;
    isUnique: boolean;
    isConstruction: boolean;
    associatedCard: CardName;
  }) {
    this.name = name;
    this.baseCost = baseCost;
    this.baseVP = baseVP;
    this.cardType = cardType;
    this.isUnique = isUnique;
    this.isCritter = !isConstruction;
    this.isConstruction = isConstruction;
    this.associatedCard = associatedCard;
  }

  static fromName(name: CardName): Card {
    return CARD_REGISTRY[name];
  }
}

const CARD_REGISTRY: Record<string /* TODO replace with CardName */, Card> = {
  [CardName.POSTAL_PIGEON]: new Card({
    name: CardName.POSTAL_PIGEON,
    cardType: CardType.TRAVELER,
    baseCost: {
      [ResourceType.BERRY]: 2,
    },
    baseVP: 0,
    isUnique: false,
    isConstruction: false,
    associatedCard: CardName.POST_OFFICE,
  }),
};
