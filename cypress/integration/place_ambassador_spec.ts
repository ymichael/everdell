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
    cy.visit(`/game/${gameJSON.gameId}?playerSecret=${player1.playerSecret}`);
    cy.contains("Place Ambassador");

    cy.contains("River");
    cy.scrollTo("bottom");
    cy.get("#js-game-river").within(() => {
      cy.get("[data-cy='river-destination-spot:TWO_TRAVELER']").within(() => {
        cy.contains(
          "Visit to gain 1 PEARL and reveal hidden River Destination."
        );
      });
    });

    cy.get("[data-cy='player-status:Michael']").within(() => {
      cy.contains("AMBASSADORS1");
    });

    cy.get("#js-game-input-box-form").within(() => {
      cy.get("#js-game-input-type-PLACE_AMBASSADOR").click();

      // Make sure clicking on different options work.
      cy.get("[data-cy='place-ambassador-item-spot:THREE_PRODUCTION']").click();
      cy.get("[data-cy='place-ambassador-item-spot:TWO_TRAVELER']").click();
      cy.get("[data-cy='place-ambassador-item-card:Ferry']").click();

      // Should tell you that you can reveal this to gain 1 PEARL
      cy.get("[data-cy='place-ambassador-item-spot:TWO_TRAVELER']").within(
        () => {
          cy.contains(
            "Visit to gain 1 PEARL and reveal hidden River Destination."
          );
          cy.contains("Great Hall").should("not.exist");
        }
      );

      // Should NOT tell you that you can reveal this to gain 1 PEARL
      cy.get("[data-cy='place-ambassador-item-spot:TWO_GOVERNANCE']").within(
        () => {
          cy.contains(
            "Visit to gain 1 PEARL and reveal hidden River Destination."
          ).should("not.exist");
          cy.contains("Omicron the Elder");
        }
      );

      cy.get("[data-cy='place-ambassador-item-spot:TWO_TRAVELER']").click();
      cy.contains("Submit").click();
    });

    cy.contains(
      "River Destination Spot:2 TRAVELER: Michael visited River Destination Spot:2 TRAVELER and revealed Great Hall."
    );
    cy.get("#js-game-river").within(() => {
      cy.get("[data-cy='river-destination-spot:TWO_TRAVELER']").within(() => {
        cy.contains("Great Hall");
        cy.contains("Ambassadors: Michael");
      });
    });

    cy.get("[data-cy='player-status:Michael']").within(() => {
      cy.contains("AMBASSADORS0");
    });

    cy.get("#js-game-river").within(() => {
      cy.contains("Visit to gain 1 PEARL and reveal hidden River Destination.");
      cy.get("[data-cy='river-destination-hidden']").then((ret) => {
        expect(ret.length).to.equal(2);
      });
    });

    cy.contains("River Destination Spot:2 TRAVELER: Michael gained 1 PEARL.");
    cy.contains("Waiting for Elynn");
  });
});
