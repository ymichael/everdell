import { CardName } from "./types";

// maybe more this into a utils file.
// https://stackoverflow.com/a/12646864
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

/**
 * Model a stack of cards
 */
export class CardStack {
  private cards: CardName[];

  constructor({ cards }: { cards: CardName[] }) {
    this.cards = cards;
  }

  shuffle(): void {
    shuffleArray(this.cards);
  }

  get isEmpty(): boolean {
    return this.cards.length === 0;
  }

  draw(): CardName {
    if (this.isEmpty) {
      throw new Error("unable to draw card from empty deck");
    }
    return this.cards.pop() as CardName;
  }

  addToStack(cardName: CardName): void {
    this.cards.push(cardName);
  }

  toJSON(includePrivate: boolean): object {
    return {
      numCards: this.cards.length,
      ...(includePrivate ? { cards: [...this.cards] } : {}),
    };
  }

  static fromJSON(cardStackJSON: any): CardStack {
    return new CardStack(cardStackJSON);
  }
}

export const emptyCardStack = (): CardStack => {
  return new CardStack({ cards: [] });
};
