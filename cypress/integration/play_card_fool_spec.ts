import { GameJSON } from "../../src/model/jsonTypes";

describe("Play Fool", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:play-fool-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow player to play fool on another player card", () => {
    const player1 = gameJSON.gameState.players[0];
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Play Card");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("City is empty");
    });

    cy.get("#js-player-hand").within(() => {
      cy.contains("Fool");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLAY_CARD").click();
      cy.get("[data-cy='play-card-item:Fool:HAND:']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Michael played Fool.");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Fool").should("not.exist");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Fool: Select player to play Fool");
      cy.get("[data-cy='select-player-item:Elynn']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Fool: Michael added the Fool to Elynn's city.");

    cy.get("#js-player-hand").within(() => {
      cy.contains("Fool").should("not.exist");
    });

    cy.contains("Waiting for Elynn");
  });
});
