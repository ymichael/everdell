import { GameJSON } from "../../src/model/jsonTypes";

describe("Place Ambassador", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:place-ambassador-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow player to place ambassador", () => {
    const player1 = gameJSON.gameState.players[0];

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Place Ambassador");

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLACE_AMBASSADOR").click();

      // Make sure clicking on different options work.
      cy.get("[data-cy='place-ambassador-item-spot:SHOAL']").click();
      cy.get("[data-cy='place-ambassador-item-spot:THREE_PRODUCTION']").click();
      cy.get("[data-cy='place-ambassador-item-spot:TWO_TRAVELER']").click();
      cy.get("[data-cy='place-ambassador-item-card:Ferry']").click();

      cy.get("[data-cy='place-ambassador-item-spot:TWO_TRAVELER']").click();
      cy.contains("Submit").click();
    });

    cy.contains("2 : Michael visited 2 and revealed");
    cy.contains("2 : Michael gained 1 ");
    cy.contains("Waiting for Elynn");
  });
});
