import { CardName, GameOptions, ExpansionType } from "./types";
import { Card } from "./card";
import { CardStack } from "./cardStack";

export const initialDeck = (opt: GameOptions): CardStack<CardName> => {
  const cardStack = new CardStack<CardName>({ name: "Deck", cards: [] });

  const addCardToDeck = (card: Card) => {
    for (let i = 0; i < card.numInDeck; i++) {
      cardStack.addToStack(card.name);
    }
  };

  Object.values(CardName).forEach((cardName) => {
    const card = Card.fromName(cardName);
    switch (card.expansion) {
      case ExpansionType.BELLFAIRE:
      case ExpansionType.SPIRECREST:
      case ExpansionType.MISTWOOD:
        // TODO: Support other expansions
        break;

      case ExpansionType.NEWLEAF:
        if (opt.newleaf?.cards) {
          addCardToDeck(card);
        }
        break;

      case ExpansionType.PEARLBROOK:
        if (opt.pearlbrook) {
          addCardToDeck(card);
        }
        break;
      default:
        addCardToDeck(card);
    }
  });

  return cardStack;
};
