import { GameJSON } from "../../src/model/jsonTypes";

describe("Visit Knoll", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:visit-knoll-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow players to visit the knoll", () => {
    const player1 = gameJSON.gameState.players[0];
    const player2 = gameJSON.gameState.players[1];

    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player2.playerSecret}`);
    cy.contains("Waiting for Michael");

    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Visit Location").click();
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("[data-cy='place-worker-item:KNOLL']").click();
      cy.contains("Submit").click();
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Knoll: Select 3 CARD to discard from the Meadow / Station");
      cy.get("[data-cy='select-card-with-source:Bard:MEADOW:1']").click();
      cy.get(
        "[data-cy='select-card-with-source:Courthouse:STATION:0']"
      ).click();
      cy.get("[data-cy='select-card-with-source:Crane:STATION:1']").click();
      cy.contains("Submit").click();
    });

    cy.get("#js-player-hand").within(() => {
      cy.contains("Doctor").should("not.exist");
      cy.contains("Architect").should("not.exist");
      cy.contains("Castle").should("not.exist");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Knoll: Select 3 CARD to keep from the Meadow / Station");
      cy.get("[data-cy='select-card-with-source:Doctor:STATION:2']").click();
      cy.get("[data-cy='select-card-with-source:Architect:MEADOW:0']").click();
      cy.get("[data-cy='select-card-with-source:Castle:MEADOW:2']").click();
      cy.contains("Submit").click();
    });

    cy.get("#js-player-hand").within(() => {
      cy.contains("Doctor");
      cy.contains("Architect");
      cy.contains("Castle");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Knoll: Select 1 Train Car Tile");
      cy.get("[data-cy='select-train-car-tile:ONE_PEBBLE:1']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Waiting for Elynn");
  });
});
