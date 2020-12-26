import { CardName } from "./types";
import { CardStack } from "./cardStack";

const baseCardsToCount: Partial<Record<CardName, number>> = {
  [CardName.ARCHITECT]: 2,
  [CardName.BARD]: 2,
  [CardName.BARGE_TOAD]: 3,
  [CardName.CASTLE]: 2,
  [CardName.CEMETARY]: 2,
  [CardName.CHAPEL]: 2,
  [CardName.CHIP_SWEEP]: 3,
  [CardName.CLOCK_TOWER]: 3,
  [CardName.COURTHOUSE]: 2,
  [CardName.CRANE]: 3,
  [CardName.DOCTOR]: 2,
  [CardName.DUNGEON]: 2,
  [CardName.EVERTREE]: 2,
  [CardName.FAIRGROUNDS]: 3,
  [CardName.FARM]: 8,
  [CardName.FOOL]: 2,
  [CardName.GENERAL_STORE]: 3,
  [CardName.HISTORIAN]: 3,
  [CardName.HUSBAND]: 4,
  [CardName.INN]: 3,
  [CardName.INNKEEPER]: 3,
  [CardName.JUDGE]: 2,
  [CardName.KING]: 2,
  [CardName.LOOKOUT]: 2,
  [CardName.MINE]: 3,
  [CardName.MINER_MOLE]: 3,
  [CardName.MONASTERY]: 2,
  [CardName.MONK]: 2,
  [CardName.PALACE]: 2,
  [CardName.PEDDLER]: 3,
  [CardName.POST_OFFICE]: 3,
  [CardName.POSTAL_PIGEON]: 3,
  [CardName.QUEEN]: 2,
  [CardName.RANGER]: 2,
  [CardName.RESIN_REFINERY]: 3,
  [CardName.RUINS]: 3,
  [CardName.SCHOOL]: 2,
  [CardName.SHEPHERD]: 2,
  [CardName.SHOPKEEPER]: 3,
  [CardName.STOREHOUSE]: 3,
  [CardName.TEACHER]: 3,
  [CardName.THEATRE]: 2,
  [CardName.TWIG_BARGE]: 3,
  [CardName.UNDERTAKER]: 2,
  [CardName.UNIVERSITY]: 2,
  [CardName.WANDERER]: 3,
  [CardName.WIFE]: 4,
  [CardName.WOODCARVER]: 3,
};

export const initialShuffledDeck = (): CardStack => {
  const cardStack = new CardStack({ cards: [] });
  ((Object.entries(baseCardsToCount) as unknown) as [
    CardName,
    number
  ][]).forEach(([cardName, count]) => {
    for (let i = 0; i < count; i++) {
      cardStack.addToStack(cardName);
    }
  });
  cardStack.shuffle();
  return cardStack;
};
