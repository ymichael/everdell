import { GameJSON } from "../../src/model/jsonTypes";

let gameJSON: GameJSON;

beforeEach(async () => {
  gameJSON = await ((cy.task(
    "db:reserve-card-game"
  ) as unknown) as Promise<GameJSON>);
});

describe("Reserve card", () => {
  it("should allow players to reserve card", () => {
    const player1 = gameJSON.gameState.players[0];
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Reserve Meadow/Station Card");

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("City is empty");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-RESERVE_CARD").click();
      cy.get("[data-cy='select-card-with-source:Husband:STATION:1']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Michael reserved Husband from the Station.");
  });
});
