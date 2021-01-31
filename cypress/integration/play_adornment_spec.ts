import { GameJSON } from "../../src/model/jsonTypes";

describe("Play Adornment", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:play-adornment-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow player to play adornment", () => {
    const player1 = gameJSON.gameState.players[0];

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Play Adornment");

    // Should be able to claim event
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLAY_ADORNMENT").click();

      // Make sure clicking on different options work.
      cy.get("[data-cy='play-adornment-item:Spyglass']").click();
      cy.get("[data-cy='play-adornment-item:Bell']").click();
      cy.get("[data-cy='play-adornment-item:Spyglass']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Michael played Spyglass.");

    // Select resource to gain
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-SELECT_OPTION_GENERIC").click();
      cy.get("[data-cy='option-generic-item:BERRY']").click();
      cy.contains("Submit").click();
    });

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Spyglass");
    });

    cy.contains("Spyglass: Michael gained 1 BERRY, 1 CARD and 1 PEARL.");
    cy.contains("Waiting for Elynn");
  });
});
