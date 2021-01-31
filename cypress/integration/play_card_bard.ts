import { GameJSON } from "../../src/model/jsonTypes";

describe("Play Bard and discard some cards", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:play-bard-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow players to play cards", () => {
    const player1 = gameJSON.gameState.players[0];
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Play Card");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("City is empty");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLAY_CARD").click();
      cy.get("[data-cy='play-card-item:Bard']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Michael played Bard.");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Bard");
    });

    cy.get("#js-player-hand").within(() => {
      cy.contains("Mine");
      cy.contains("Ranger");
      cy.contains("Queen");
      cy.contains("King");
      cy.contains("Farm");
      cy.contains("Wanderer");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Bard: Discard up to 5");
      cy.get("[data-cy='select-card-item:Mine']").click();
      cy.get("[data-cy='select-card-item:Ranger']").click();
      cy.get("[data-cy='select-card-item:Queen']").click();
      cy.get("[data-cy='select-card-item:King']").click();
      cy.contains("4 Selected").click();
    });

    cy.contains("Bard: Michael discarded 4");

    cy.get("#js-player-hand").within(() => {
      cy.contains("Mine").should("not.exist");
      cy.contains("Ranger").should("not.exist");
      cy.contains("Queen").should("not.exist");
      cy.contains("King").should("not.exist");
      cy.contains("Farm");
      cy.contains("Wanderer");
    });

    cy.contains("Waiting for Elynn");
  });
});
