import { GameJSON } from "../../src/model/jsonTypes";

describe("Visit Inn Destination & Play card from Meadow", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:visit-inn-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow players to play cards", () => {
    const player1 = gameJSON.gameState.players[0];

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Visit Destination Card");

    // Should be able to visit destination
    cy.get("#js-game-input-type-VISIT_DESTINATION_CARD").click();

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Inn");
      cy.contains("Workers on card: 0");
    });

    // Visit Inn
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("[data-cy='visit-destination-card-item:Inn']").click();
      cy.contains("Submit").click();
    });

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Inn");
      cy.contains("Workers on card: 1");
    });

    cy.contains("Michael place a worker on Inn");

    // Play Farm
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("[data-cy='select-card-item:Farm']").click();
      cy.contains("1 Selected").click();
    });

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Farm");
    });

    cy.get("#js-meadow-cards").within(() => {
      cy.contains("Doctor");
    });
  });
});
