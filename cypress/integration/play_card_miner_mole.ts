import { GameJSON } from "../../src/model/jsonTypes";

describe("Play Miner Mole and select played card", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:play-miner-mole-game"
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
      cy.get("[data-cy='play-card-item:Miner Mole']").click();
      cy.contains("Submit").click();
    });

    cy.get("[data-cy='player-city:Michael']").within(() => {
      cy.contains("Miner Mole");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.contains("Miner Mole: Select 1 to activate");
      cy.get("[data-cy='played-card-item:General Store']").click();
      cy.contains("1 Selected").click();
    });
    cy.contains("Michael played Miner Mole");
    cy.contains(
      "Miner Mole: Michael activated General Store from Elynn's city."
    );
    cy.contains("Waiting for Elynn");
  });
});
