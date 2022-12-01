import { GameJSON } from "../../src/model/jsonTypes";

describe("Play reserved card", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:play-reserved-card-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow players to play reserved card", () => {
    const player1 = gameJSON.gameState.players[0];
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Play Card");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("City is empty");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLAY_CARD").click();
      cy.get("[data-cy='play-card-item:Husband:RESERVED:']").click();
      cy.get("[data-cy='resource-value-input:BERRY']").type("2");
      cy.contains("Submit").click();
    });

    cy.contains("Michael played Husband.");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Husband");
    });
  });
});
