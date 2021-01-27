import { GameJSON } from "../../src/model/jsonTypes";

describe("Play Card", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:play-card-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow players to play cards", () => {
    const player1 = gameJSON.gameState.players[0];
    const player2 = gameJSON.gameState.players[1];

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Play Card");

    // Should be able to place worker / play card.
    cy.get("#js-game-input-type-PLACE_WORKER").click();
    cy.get("#js-game-input-type-PLAY_CARD").click();

    // Play MINE
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("[data-cy='play-card-item:Mine']").click();
    });
    cy.contains("Submit").click();

    cy.contains("Michael played Mine");
    cy.contains("Mine: Michael gained 1");
    cy.contains("Waiting for Elynn");
  });
});
