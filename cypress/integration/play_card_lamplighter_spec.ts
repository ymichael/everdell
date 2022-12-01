import { GameJSON } from "../../src/model/jsonTypes";

describe("Play Lamplighter and select cards to draw", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:play-lamp-lighter-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow players to play cards", () => {
    const player1 = gameJSON.gameState.players[0];
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Play Card");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("City is empty");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLAY_CARD").click();
      cy.get("[data-cy='play-card-item:Lamplighter:HAND:']").click();
      cy.contains("Submit").click();
    });

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Lamplighter");
    });

    cy.get("#js-station").within(() => {
      cy.contains("Husband");
      cy.contains("Chip Sweep");
      cy.contains("Monk");
    });
    cy.get("#js-player-hand").within(() => {
      cy.contains("Husband").should("not.exist");
      cy.contains("Miner Mole").should("not.exist");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Lamplighter: Choose your first CARD");
      cy.get("[data-cy='select-card-with-source:Husband:STATION:1']").click();
      cy.contains("Submit").click();
    });

    cy.get("#js-player-hand").within(() => {
      cy.contains("Husband");
      cy.contains("Miner Mole").should("not.exist");
    });

    cy.get("#js-station").within(() => {
      cy.contains("Husband").should("not.exist");
      cy.contains("Chip Sweep");
      cy.contains("Monk");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Lamplighter: Choose your second CARD");
      cy.get("[data-cy='select-card-with-source:Miner Mole:MEADOW:1']").click();
      cy.contains("Submit").click();
    });

    cy.get("#js-player-hand").within(() => {
      cy.contains("Husband");
      cy.contains("Miner Mole");
    });

    cy.contains("Lamplighter: Michael drew Husband from the Station.");
    cy.contains("Lamplighter: Michael drew Miner Mole from the Meadow.");
    cy.contains("Waiting for Elynn");
  });
});
