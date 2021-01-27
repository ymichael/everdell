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
  });
};
