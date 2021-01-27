/// <reference types="cypress" />
// ***********************************************************
// https://on.cypress.io/plugins-guide
// ***********************************************************
/**
 * @type {Cypress.PluginConfig}
 */
module.exports = (on, config) => {
  on("task", {
    "db:createTestGame1": async () => {
      const { createGame } = require("../../src/model/game");
      const game = await createGame(["Michael", "Elynn"]);
      return game.toJSON(true);
    },
  });
};
