import { GameJSON } from "../../src/model/jsonTypes";

let gameJSON: GameJSON;

beforeEach(async () => {
  gameJSON = await ((cy.task(
    "db:prepare-for-season-spring-full-hand"
  ) as unknown) as Promise<GameJSON>);
});

describe("Select cards from meadow", () => {
  it("SPRING: player should not draw/discard from meadow if they have a full hand", () => {
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
    cy.contains("Michael did not select any cards from the Meadow.");

    cy.get("#js-player-hand").within(() => {
      cy.contains("Queen").should("not.exist");
    });

    cy.get("#js-meadow-cards").within(() => {
      cy.contains("King").should("not.exist");
      cy.contains("Queen");
    });
  });
});
