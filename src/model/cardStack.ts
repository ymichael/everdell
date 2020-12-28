import { CardName } from "./types";
import shuffle from "lodash/shuffle";
import cloneDeep from "lodash/cloneDeep";

/**
 * Model a stack of cards
 */
export class CardStack {
  private cards: CardName[];

  constructor({ cards }: { cards: CardName[] }) {
    this.cards = cards;
  }

  shuffle(): void {
    this.cards = shuffle(this.cards);
  }

  get isEmpty(): boolean {
    return this.cards.length === 0;
  }

  drawInner(): CardName {
    if (this.isEmpty) {
      throw new Error("unable to draw card from empty deck");
    }
    return this.cards.pop() as CardName;
  }

  addToStack(cardName: CardName): void {
    this.cards.push(cardName);
  }

  toJSON(includePrivate: boolean): object {
    return cloneDeep({
      numCards: this.cards.length,
      ...(includePrivate ? { cards: this.cards } : {}),
    });
  }

  static fromJSON(cardStackJSON: any): CardStack {
    return new CardStack(cardStackJSON);
  }
}

export const emptyCardStack = (): CardStack => {
  return new CardStack({ cards: [] });
};
