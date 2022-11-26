import expect from "expect.js";
import { initialDeck } from "./deck";
import { Card } from "./card";
import { defaultGameOptions } from "./gameOptions";
import { ExpansionType } from "./types";

describe("Deck", () => {
  it("should not return pearlbrook cards if not playing with pearlbrook", () => {
    const deck = initialDeck(defaultGameOptions({ pearlbrook: false }));
    const deckJSON = deck.toJSON(true /* includePrivate */);
    expect(
      deckJSON.cards.filter((cardName) => {
        return Card.fromName(cardName).expansion === ExpansionType.PEARLBROOK;
      })
    ).to.eql([]);
  });

  it("should return pearlbrook cards if playing with pearlbrook", () => {
    const deck = initialDeck(defaultGameOptions({ pearlbrook: true }));
    const deckJSON = deck.toJSON(true /* includePrivate */);
    expect(
      deckJSON.cards.filter((cardName) => {
        return Card.fromName(cardName).expansion === ExpansionType.PEARLBROOK;
      })
    ).to.not.eql([]);
  });

  it("should not return newleaf cards if not playing with newleaf", () => {
    const deck = initialDeck(defaultGameOptions({ newleaf: { cards: false } }));
    const deckJSON = deck.toJSON(true /* includePrivate */);
    expect(
      deckJSON.cards.filter((cardName) => {
        return Card.fromName(cardName).expansion === ExpansionType.NEWLEAF;
      })
    ).to.eql([]);
  });

  it("should return newleaf cards if playing with newleaf", () => {
    const deck = initialDeck(defaultGameOptions({ newleaf: { cards: true } }));
    const deckJSON = deck.toJSON(true /* includePrivate */);
    expect(
      deckJSON.cards.filter((cardName) => {
        return Card.fromName(cardName).expansion === ExpansionType.NEWLEAF;
      })
    ).to.not.eql([]);
  });
});
