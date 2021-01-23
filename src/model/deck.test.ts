import expect from "expect.js";
import { initialDeck } from "./deck";
import { Card } from "./card";
import { ExpansionType } from "./types";

describe("Deck", () => {
  it("should not return pearlbrook cards if not playing with pearlbrook", () => {
    const deck = initialDeck({ pearlbrook: false });
    const deckJSON = deck.toJSON(true /* includePrivate */);
    expect(
      deckJSON.cards.filter((cardName) => {
        return Card.fromName(cardName).expansion === ExpansionType.PEARLBROOK;
      })
    ).to.eql([]);
  });

  it("should return pearlbrook cards if playing with pearlbrook", () => {
    const deck = initialDeck({ pearlbrook: true });
    const deckJSON = deck.toJSON(true /* includePrivate */);
    expect(
      deckJSON.cards.filter((cardName) => {
        return Card.fromName(cardName).expansion === ExpansionType.PEARLBROOK;
      })
    ).to.not.eql([]);
  });
});
