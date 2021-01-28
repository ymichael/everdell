/// <reference types="cypress" />
// ***********************************************************
// https://on.cypress.io/plugins-guide
// ***********************************************************
/**
 * @type {Cypress.PluginConfig}
 */
import { CardName } from "../../src/model/types";
import { Card } from "../../src/model/card";
import { createGameFromGameState } from "../../src/model/game";
import { testInitialGameState } from "../../src/model/testHelpers";

module.exports = (on, config) => {
  on("task", {
    "db:basic-game": async () => {
      const gameState = testInitialGameState({
        playerNames: ["Michael", "Elynn"],
      });
      const game = await createGameFromGameState(gameState);
      return game.toJSON(true);
    },
    "db:play-card-game": async () => {
      const gameState = testInitialGameState({
        playerNames: ["Michael", "Elynn"],
      });

      const card = Card.fromName(CardName.MINE);
      gameState.players.forEach((player) => {
        player.cardsInHand.push(card.name);
        player.gainResources(gameState, card.baseCost);
      });

      const game = await createGameFromGameState(gameState);
      return game.toJSON(true);
    },
    "db:claim-event-game": async () => {
      const gameState = testInitialGameState({
        playerNames: ["Michael", "Elynn"],
      });
      const player = gameState.getActivePlayer();
      player.addToCity(gameState, CardName.MINE);
      player.addToCity(gameState, CardName.MINE);
      player.addToCity(gameState, CardName.FARM);
      player.addToCity(gameState, CardName.FARM);
      const game = await createGameFromGameState(gameState);
      return game.toJSON(true);
    },
    "db:visit-destination-game": async () => {
      const gameState = testInitialGameState({
        playerNames: ["Michael", "Elynn"],
      });

      gameState.meadowCards.push(
        CardName.KING,
        CardName.QUEEN,
        CardName.POSTAL_PIGEON,
        CardName.POSTAL_PIGEON,
        CardName.FARM,
        CardName.HUSBAND,
        CardName.CHAPEL,
        CardName.MONK
      );

      // To reveal after we play a card from the Meadow
      gameState.deck.addToStack(CardName.DOCTOR);

      const player = gameState.getActivePlayer();
      player.addToCity(gameState, CardName.INN);
      const game = await createGameFromGameState(gameState);
      return game.toJSON(true);
    },
  });
};
