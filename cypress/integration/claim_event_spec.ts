import { GameJSON } from "../../src/model/jsonTypes";

describe("Claim Event", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:claim-event-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow players to claim event", () => {
    const player1 = gameJSON.gameState.players[0];

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Claim Event");

    // Should be able to claim event
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-CLAIM_EVENT").click();

      // Make sure clicking on different options work.
      cy.get("[data-cy='claim-event-item:4 PRODUCTION']").click();
      cy.get("[data-cy='claim-event-item:3 TRAVELER']").click();
      cy.get("[data-cy='claim-event-item:4 PRODUCTION']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Michael claimed the Event:4 PRODUCTION event.");
    cy.contains("Waiting for Elynn");

    cy.get("#js-game-events").within(() => {
      cy.get("[data-cy='event:4 PRODUCTION']").within(() => {
        cy.contains("Claimed: Michael");
      });
    });
  });
});
