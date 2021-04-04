import { GameJSON } from "../../src/model/jsonTypes";

describe("Select cards from meadow", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:prepare-for-season-spring"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow player to choose 2 cards from the meadow", () => {
    const player1 = gameJSON.gameState.players[0];
    const player2 = gameJSON.gameState.players[1];

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Prepare for Season");
    cy.contains("Submit").click();

    cy.contains("Michael took the prepare for season action.");
    cy.contains("Michael recalled their workers.");

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("[data-cy='select-card-item:Mine']").click();
      cy.get("[data-cy='select-card-item:Queen']").click();
      cy.contains("2 Selected").click();
    });

    cy.contains("Choose which card to keep");

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("[data-cy='select-card-item:Queen']").click();
      cy.contains("1 Selected").click();
    });

    cy.contains("Michael selected Mine & Queen from the Meadow.");

    cy.get("#js-player-hand").within(() => {
      cy.contains("Queen");
    });
  });
});
