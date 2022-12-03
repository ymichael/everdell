import { GameJSON } from "../../src/model/jsonTypes";

describe("Select cards from meadow", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:prepare-for-season-spring-pick-one"
    ) as unknown) as Promise<GameJSON>);
  });

  it("SPRING: player should only pick and keep 1 card if at max hand size - 1", () => {
    const player1 = gameJSON.gameState.players[0];

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.get("#js-meadow-cards").within(() => {
      cy.contains("Queen");
      cy.contains("King").should("not.exist");
    });

    cy.contains("Prepare for Season");
    cy.contains("Submit").click();

    cy.contains("Michael took the prepare for season action.");
    cy.contains("Michael recalled their workers.");

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Select 1 CARD from the Meadow");
      cy.get("[data-cy='select-card-item:Queen']").click();
      cy.contains("1 Selected").click();
    });

    cy.contains("Michael selected Queen from the Meadow.");

    cy.get("#js-player-hand").within(() => {
      cy.contains("Queen");
    });

    cy.get("#js-meadow-cards").within(() => {
      cy.contains("King");
      cy.contains("Queen").should("not.exist");
    });
  });
});
