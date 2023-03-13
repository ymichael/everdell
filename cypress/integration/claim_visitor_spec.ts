import { GameJSON } from "../../src/model/jsonTypes";

let gameJSON: GameJSON;

beforeEach(async () => {
  gameJSON = await ((cy.task(
    "db:claim-visitor-game"
  ) as unknown) as Promise<GameJSON>);
});

describe("Claim Visitor", () => {
  it("should allow players to claim a visitor", () => {
    const player1 = gameJSON.gameState.players[0];

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Visit Location").click();
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("[data-cy='place-worker-item:STATION']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Select Visitor to discard");
    cy.contains("Michael placed a worker on Location:Station.");
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("[data-cy='select-visitor-item:Dim Dustlight']").click();
      cy.get("[data-cy='select-visitor-item:Bim Little']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Location:Station: Michael discarded Bim Little.");
    cy.contains("Select Visitor to keep");
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("[data-cy='select-visitor-item:Bim Little']").should("not.exist");
      cy.get("[data-cy='select-visitor-item:Dim Dustlight']").click();
      cy.get("[data-cy='select-visitor-item:Frin Stickly']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Waiting for Elynn");
    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Frin Stickly");
    });
  });
});
