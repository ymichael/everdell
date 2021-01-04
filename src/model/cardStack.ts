import { CardName } from "./types";
import { CardStackJSON } from "./jsonTypes";
import shuffle from "lodash/shuffle";
import cloneDeep from "lodash/cloneDeep";

/**
 * Model a stack of cards
 */
export class CardStack {
  private name: string;
  private cards: CardName[];

  constructor({ name, cards }: { name: string; cards: CardName[] }) {
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

  drawInner(): CardName {
    if (this.isEmpty) {
      throw new Error(`Unable to draw card from ${this.name}`);
    }
    return this.cards.pop() as CardName;
  }

  addToStack(cardName: CardName): void {
    this.cards.push(cardName);
  }

  toJSON(includePrivate: boolean): CardStackJSON {
    return cloneDeep({
      name: this.name,
      numCards: this.cards.length,
      cards: [],
      ...(includePrivate ? { cards: this.cards } : {}),
    });
  }

  static fromJSON(cardStackJSON: CardStackJSON): CardStack {
    return new CardStack(cardStackJSON);
  }
}

export const discardPile = (): CardStack => {
  return new CardStack({ name: "Discard", cards: [] });
};
