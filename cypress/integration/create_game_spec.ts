describe("Create Game", () => {
  it("should be able to create a new game", () => {
    cy.visit("/");

    cy.contains("New Game").click();

    const name1 = "Michael";
    const name2 = "Elynn";

    cy.get("input[name='players.0.name']")
      .type(name1)
      .should("have.value", name1);

    cy.get("input[name='players.1.name']")
      .type(name2)
      .should("have.value", name2);

    cy.contains("Start Game").click();

    cy.url().should("include", "/game/");
    cy.contains(name1);
    cy.contains(name2);

    cy.contains(name1).click();
    cy.get("#js-game-river").should("not.exist");
    cy.contains("AMBASSADORS").should("not.exist");
    cy.contains("River").should("not.exist");
    cy.contains("Pearlbrook").should("not.exist");
  });

  it("should be able to create a new game w/pearlbrook", () => {
    cy.visit("/");

    cy.contains("New Game").click();
    const name1 = "Michael";
    const name2 = "Elynn";

    cy.get("input[name='players.0.name']")
      .type(name1)
      .should("have.value", name1);
    cy.get("input[name='players.1.name']")
      .type(name2)
      .should("have.value", name2);
    cy.get("input[name='pearlbrook']").click();
    cy.contains("Start Game").click();

    cy.url().should("include", "/game/");
    cy.contains(name1);
    cy.contains(name2);

    cy.contains(name1).click();

    cy.contains("AMBASSADORS");
    cy.contains("River");
    cy.contains("Pearlbrook");
  });
});

// Workaround --isolatedModules error.
export {};
