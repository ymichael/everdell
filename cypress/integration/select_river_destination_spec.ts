import { GameJSON } from "../../src/model/jsonTypes";

describe("Select River Destination to copy", () => {
  let gameJSON: GameJSON;

  beforeEach(async () => {
    gameJSON = await ((cy.task(
      "db:select-river-destination-game"
    ) as unknown) as Promise<GameJSON>);
  });

  it("should allow player to select a river destination when visiting FERRY", () => {
    const player1 = gameJSON.gameState.players[0];

    // Take player 1's turn.
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Place Ambassador");

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLACE_AMBASSADOR").click();

      // Make sure clicking on different options work.
      cy.get("[data-cy='place-ambassador-item-spot:SHOAL']").click();
      cy.get("[data-cy='place-ambassador-item-spot:THREE_PRODUCTION']").click();
      cy.get("[data-cy='place-ambassador-item-spot:TWO_TRAVELER']").click();
      cy.get("[data-cy='place-ambassador-item-card:Ferry']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Ferry: Copy any revealed River Destination");
    cy.get("#js-game-input-box-form").within(() => {
      cy.get("[data-cy='river-destination-item:Watermill']").click();
      cy.get("[data-cy='river-destination-item:Snout the Explorer']").click();

      cy.get("[data-cy='river-destination-item:Watermill']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Ferry: Michael copied Watermill.");
    cy.contains("Watermill: Spend 1 and 1 to draw 2 and gain 1 ");

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-SELECT_OPTION_GENERIC").click();
      cy.get("[data-cy='option-generic-item:Ok']").click();
      cy.get("[data-cy='option-generic-item:Decline']").click();
      cy.get("[data-cy='option-generic-item:Ok']").click();
      cy.contains("Submit").click();
    });

    cy.contains("Watermill: Michael spent ");
    cy.contains("Waiting for Elynn");
  });
});
