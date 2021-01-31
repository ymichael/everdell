import { CardName } from "./types";
import { CardStackJSON } from "./jsonTypes";
import shuffle from "lodash/shuffle";
import cloneDeep from "lodash/cloneDeep";

/**
 * Model a stack of cards
 */
export class CardStack<T> {
  private name: string;
  private cards: T[];

  constructor({ name, cards }: { name: string; cards: T[] }) {
    this.name = name;
    this.cards = cards;
  }

  shuffle(): void {
    this.cards = shuffle(this.cards);
  }

  get isEmpty(): boolean {
    return this.length === 0;
  }

  get length(): number {
    return this.cards.length;
  }

  drawInner(): T {
    if (this.isEmpty) {
      throw new Error(`Unable to draw card from ${this.name}`);
    }
    return this.cards.pop() as T;
  }

  addToStack(cardName: T): void {
    this.cards.push(cardName);
  }

  toJSON(includePrivate: boolean): CardStackJSON<T> {
    return cloneDeep({
      name: this.name,
      numCards: this.cards.length,
      cards: [],
      ...(includePrivate ? { cards: this.cards } : {}),
    });
  }

  static fromJSON<T>(cardStackJSON: CardStackJSON<T>): CardStack<T> {
    return new CardStack(cardStackJSON);
  }
}

export const discardPile = (): CardStack<CardName> => {
  return new CardStack({ name: "Discard", cards: [] });
};
