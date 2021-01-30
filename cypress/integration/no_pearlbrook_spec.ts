import { GameJSON } from "../../src/model/jsonTypes";

describe("No Pearlbrook Expansion", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:no-pearlbrook-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should not have any pearlbrook references", () => {
    const player1 = gameJSON.gameState.players[0];
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);

    cy.get("#js-game-river").should("not.exist");
    cy.contains("AMBASSADORS").should("not.exist");
    cy.contains("River").should("not.exist");
    cy.contains("Pearlbrook").should("not.exist");
  });
});

// Workaround --isolatedModules error.
export {};
