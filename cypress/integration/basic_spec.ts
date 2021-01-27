describe("Basic", () => {
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
  });
});

// Workaround --isolatedModules error.
export {}
