import { GameJSON } from "../../src/model/jsonTypes";

describe("Select Played Adornment", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:select-played-adornment-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow player to select a played adornment", () => {
    const player1 = gameJSON.gameState.players[0];

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Play Adornment");

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLAY_ADORNMENT").click();
      cy.get("[data-cy='play-adornment-item:Mirror']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Michael played Mirror.");

    // Select resource to gain
    cy.contains("Mirror: Copy the ability of an Adornment");

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-SELECT_PLAYED_ADORNMENT").click();

      cy.get("[data-cy='play-adornment-item:Bell']").click();
      cy.get("[data-cy='play-adornment-item:Key to the City']").click();
      cy.get("[data-cy='play-adornment-item:Bell']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Mirror: Michael copied Bell.");
    cy.contains("Bell: Michael gained 3 BERRY & 4 CARD.");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Mirror");
    });

    cy.contains("Waiting for Elynn");
  });
});
