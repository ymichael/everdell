import { GameJSON } from "../../src/model/jsonTypes";

describe("Play Ranger", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:play-ranger-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow player to play ranger", () => {
    const player1 = gameJSON.gameState.players[0];
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Play Card");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Farm");
      cy.contains("Ranger").should("not.exist");
    });

    cy.get("#js-player-hand").within(() => {
      cy.contains("Ranger");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLAY_CARD").click();
      cy.get("[data-cy='play-card-item:Ranger:HAND:']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Michael played Ranger from their hand.");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Ranger");
    });

    cy.get("#js-player-hand").within(() => {
      cy.contains("Ranger").should("not.exist");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Ranger: Select a deployed worker to move");
      cy.get("[data-cy='select-worker-placement-item:ONE_STONE']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Ranger: Place your worker");

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("[data-cy='select-worker-placement-item:4 PRODUCTION']").click();
      cy.contains("Submit").click();
    });

    cy.contains(
      "Ranger: Michael moved deployed worker on Location:PEBBLE to Event:4 PRODUCTION."
    );
    cy.contains("Michael claimed the Event:4 PRODUCTION event");
    cy.get("#js-game-events").within(() => {
      cy.get("[data-cy='event:4 PRODUCTION']").within(() => {
        cy.contains("Claimed: Michael");
      });
    });
    cy.contains("Waiting for Elynn");
  });
});
