import { GameJSON } from "../../src/model/jsonTypes";

describe("Place Ambassador", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:place-ambassador-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow player to place ambassador", () => {
    const player1 = gameJSON.gameState.players[0];

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Place Ambassador");

    cy.contains("River");
    cy.get("#js-game-river").within(() => {
      cy.get("[data-cy='river-destination-spot:TWO_TRAVELER']").within(() => {
        cy.contains("Visit to gain 1 and reveal hidden River Destination.");
      });
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLACE_AMBASSADOR").click();

      // Make sure clicking on different options work.
      cy.get("[data-cy='place-ambassador-item-spot:SHOAL']").click();
      cy.get("[data-cy='place-ambassador-item-spot:THREE_PRODUCTION']").click();
      cy.get("[data-cy='place-ambassador-item-spot:TWO_TRAVELER']").click();
      cy.get("[data-cy='place-ambassador-item-card:Ferry']").click();

      cy.get("[data-cy='place-ambassador-item-spot:TWO_TRAVELER']").click();
      cy.contains("Submit").click();
    });

    cy.contains("2 : Michael visited 2 and revealed");
    cy.get("#js-game-river").within(() => {
      cy.get("[data-cy='river-destination-spot:TWO_TRAVELER']").within(() => {
        cy.contains("Great Hall");
        cy.contains("Ambassadors: Michael");
      });
    });

    cy.get("#js-game-river").within(() => {
      cy.contains("Visit to gain 1 and reveal hidden River Destination.");
      cy.get("[data-cy='river-destination-hidden']").then((ret) => {
        expect(ret.length).to.equal(2);
      });
    });

    cy.contains("2 : Michael gained 1 ");
    cy.contains("Waiting for Elynn");
  });
});
