import expect from "expect.js";
import { Card } from "./card";
import { GameState } from "./gameState";
import { testInitialGameState } from "./testHelpers";
import {
  ResourceType,
  CardName,
  GameInputType,
  GameInputPlayCard,
  LocationName,
} from "./types";

const playCardInput = (
  card: CardName,
  clientOptionOverrides: any = {}
): GameInputPlayCard => {
  return {
    inputType: GameInputType.PLAY_CARD as const,
    clientOptions: {
      card,
      fromMeadow: false,
      ...clientOptionOverrides,
    },
  };
};

describe("Player", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = testInitialGameState();
  });

  describe("canAddToCity", () => {
    it("should be able to add cards to city if there is space", () => {
      const p = gameState.getActivePlayer();
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(true);

      p.addToCity(CardName.FARM);
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(true);
    });

    it("should not be able to add cards to city if full", () => {
      const p = gameState.getActivePlayer();
      // Max city size is 15
      for (let i = 0; i < 15; i++) {
        p.addToCity(CardName.FARM);
      }
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(false);
    });

    it("should be able to add wanderer even if city is full", () => {
      const p = gameState.getActivePlayer();
      for (let i = 0; i < 15; i++) {
        p.addToCity(CardName.FARM);
      }
      expect(p.canAddToCity(CardName.WANDERER, false /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.WANDERER, true /* strict */)).to.be(true);
    });

    it("should account for husband/wife pairs", () => {
      const p = gameState.getActivePlayer();

      for (let i = 0; i < 13; i++) {
        p.addToCity(CardName.FARM);
      }
      p.addToCity(CardName.HUSBAND);
      p.addToCity(CardName.WIFE);

      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(true);

      // Add another husband
      p.addToCity(CardName.HUSBAND);

      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.HUSBAND, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.HUSBAND, false /* strict */)).to.be(false);

      // We can add a WIFE though
      expect(p.canAddToCity(CardName.WIFE, true /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.WIFE, false /* strict */)).to.be(true);
    });

    it("should account for CRANE", () => {
      const p = gameState.getActivePlayer();

      for (let i = 0; i < 14; i++) {
        p.addToCity(CardName.FARM);
      }
      p.addToCity(CardName.CRANE);

      // constructions are okay if not strict
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(false);

      // not critters
      expect(p.canAddToCity(CardName.WIFE, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.WIFE, false /* strict */)).to.be(false);
    });

    it("should account for INNKEEPER", () => {
      const p = gameState.getActivePlayer();

      for (let i = 0; i < 14; i++) {
        p.addToCity(CardName.FARM);
      }
      p.addToCity(CardName.INNKEEPER);

      // critters are okay if not strict
      expect(p.canAddToCity(CardName.WIFE, false /* strict */)).to.be(true);
      expect(p.canAddToCity(CardName.WIFE, true /* strict */)).to.be(false);

      // not constructions
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(false);
    });

    it("should account for RUINS", () => {
      const p = gameState.getActivePlayer();
      for (let i = 0; i < 15; i++) {
        p.addToCity(CardName.FARM);
      }
      // city is full
      expect(p.canAddToCity(CardName.FARM, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.FARM, false /* strict */)).to.be(false);

      // ruins is okay if not strict
      expect(p.canAddToCity(CardName.RUINS, true /* strict */)).to.be(false);
      expect(p.canAddToCity(CardName.RUINS, false /* strict */)).to.be(true);
    });
  });

  describe("canAffordCard", () => {
    it("have the right resources", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.canAffordCard(CardName.FARM, false /* isMeadow */)).to.be(
        false
      );
      player.gainResources(Card.fromName(CardName.FARM).baseCost);
      expect(player.canAffordCard(CardName.FARM, false /* isMeadow */)).to.be(
        true
      );
    });

    it("unoccupied associated construction", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(
        player.canAffordCard(CardName.HUSBAND, false /* isMeadow */)
      ).to.be(false);
      player.addToCity(CardName.FARM);
      expect(
        player.canAffordCard(CardName.HUSBAND, false /* isMeadow */)
      ).to.be(true);
      // Occupy the farm
      player.useConstructionToPlayCritter(CardName.FARM);
      expect(
        player.canAffordCard(CardName.HUSBAND, false /* isMeadow */)
      ).to.be(false);
    });

    it("CRANE discount for constructions", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.canAffordCard(CardName.FARM, false /* isMeadow */)).to.be(
        false
      );
      player.addToCity(CardName.CRANE);
      expect(player.canAffordCard(CardName.FARM, false /* isMeadow */)).to.be(
        true
      );
      // Doesn't work for critters
      expect(player.canAffordCard(CardName.WIFE, false /* isMeadow */)).to.be(
        false
      );
    });

    it("INNKEEPER discount for critters", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.canAffordCard(CardName.WIFE, false /* isMeadow */)).to.be(
        false
      );
      player.addToCity(CardName.INNKEEPER);
      expect(player.canAffordCard(CardName.WIFE, false /* isMeadow */)).to.be(
        true
      );
      // Doesn't work for constructions
      expect(player.canAffordCard(CardName.FARM, false /* isMeadow */)).to.be(
        false
      );
    });

    it("QUEEN discount", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.canAffordCard(CardName.WIFE, false /* isMeadow */)).to.be(
        false
      );
      player.addToCity(CardName.QUEEN);
      expect(player.canAffordCard(CardName.WIFE, false /* isMeadow */)).to.be(
        true
      );
      // Doesn't work if VP is greater than 3
      expect(player.canAffordCard(CardName.KING, false /* isMeadow */)).to.be(
        false
      );
    });

    it("JUDGE discount", () => {
      const player = gameState.getActivePlayer();
      expect(player.getNumResources()).to.be(0);
      expect(player.canAffordCard(CardName.CRANE, false /* isMeadow */)).to.be(
        false
      );
      player.addToCity(CardName.JUDGE);
      expect(player.canAffordCard(CardName.CRANE, false /* isMeadow */)).to.be(
        false
      );
      player.gainResources({
        [ResourceType.BERRY]: 1,
      });
      expect(player.canAffordCard(CardName.CRANE, false /* isMeadow */)).to.be(
        true
      );

      // need resin & pebble
      expect(
        player.canAffordCard(CardName.RESIN_REFINERY, false /* isMeadow */)
      ).to.be(false);
      player.gainResources({
        [ResourceType.BERRY]: 1,
      });
      expect(
        player.canAffordCard(CardName.RESIN_REFINERY, false /* isMeadow */)
      ).to.be(false);
      player.gainResources({
        [ResourceType.PEBBLE]: 1,
      });
      expect(
        player.canAffordCard(CardName.RESIN_REFINERY, false /* isMeadow */)
      ).to.be(true);
    });
  });

  describe("validatePaymentOptions", () => {
    it("sanity checks", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.validatePaymentOptions(playCardInput(CardName.FARM))
      ).to.match(/invalid/i);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {},
          })
        )
      ).to.match(/invalid/i);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {},
            },
          })
        )
      ).to.match(/insufficient/);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {
                [ResourceType.TWIG]: 1,
                [ResourceType.RESIN]: 1,
              },
            },
          })
        )
      ).to.match(/Can't spend/);

      player.gainResources({
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
      });
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {
                [ResourceType.TWIG]: 1,
                [ResourceType.RESIN]: 1,
              },
            },
          })
        )
      ).to.match(/insufficient/);

      player.gainResources({
        [ResourceType.TWIG]: 1,
      });
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {
                [ResourceType.TWIG]: 2,
                [ResourceType.RESIN]: 1,
              },
            },
          })
        )
      ).to.be(null);
    });

    it("unoccupied associated construction", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: { resources: {} },
          })
        )
      ).to.match(/insufficient/i);

      // Doesn't work for constructions
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {},
              useAssociatedCard: true,
            },
          })
        )
      ).to.match(/cannot use associated card/i);

      // Error if don't have associated card
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.INNKEEPER, {
            paymentOptions: {
              resources: {},
              useAssociatedCard: true,
            },
          })
        )
      ).to.match(/cannot find associated card/i);

      player.addToCity(CardName.INN);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.INNKEEPER, {
            paymentOptions: {
              resources: {},
              useAssociatedCard: true,
            },
          })
        )
      ).to.be(null);

      // Try with king + evertree
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.KING, {
            paymentOptions: {
              resources: {},
              useAssociatedCard: true,
            },
          })
        )
      ).to.match(/cannot find associated card/i);
      player.addToCity(CardName.EVERTREE);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.KING, {
            paymentOptions: {
              resources: {},
              useAssociatedCard: true,
            },
          })
        )
      ).to.be(null);
    });

    it("cardToDungeon", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              cardToDungeon: CardName.WIFE,
              resources: {},
            },
          })
        )
      ).to.match(/unable to invoke dungeon/i);
      player.addToCity(CardName.WIFE);
      player.addToCity(CardName.DUNGEON);
      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {},
              cardToDungeon: CardName.WIFE,
            },
          })
        )
      ).to.be(null);

      const playedDungeon = player.getFirstPlayedCard(CardName.DUNGEON);
      playedDungeon.pairedCards!.push(CardName.WIFE);

      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {},
              cardToDungeon: CardName.WIFE,
            },
          })
        )
      ).to.match(/unable to invoke dungeon/i);

      player.addToCity(CardName.RANGER);

      expect(
        player.validatePaymentOptions(
          playCardInput(CardName.KING, {
            paymentOptions: {
              resources: {},
              cardToDungeon: CardName.WIFE,
            },
          })
        )
      ).to.match(/insufficient/);
    });

    describe("cardToUse", () => {
      it("invalid", () => {
        const player = gameState.getActivePlayer();
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.FARM,
                resources: {},
              },
            })
          )
        ).to.match(/unable to find farm/i);
      });

      it("INNKEEPER", () => {
        const player = gameState.getActivePlayer();
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {},
              },
            })
          )
        ).to.match(/innkeeper/i);

        player.addToCity(CardName.INNKEEPER);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {},
              },
            })
          )
        ).to.match(/innkeeper/i);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.HUSBAND, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {},
              },
            })
          )
        ).to.be(null);

        player.gainResources({
          [ResourceType.BERRY]: 1,
        });

        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.HUSBAND, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {
                  [ResourceType.BERRY]: 1,
                },
              },
            })
          )
        ).to.match(/overpay/i);
      });

      it("QUEEN", () => {
        const player = gameState.getActivePlayer();
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.QUEEN,
                resources: {},
              },
            })
          )
        ).to.match(/unable to find queen/i);

        player.addToCity(CardName.QUEEN);
        player.addToCity(CardName.CASTLE);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.QUEEN,
                resources: {},
              },
            })
          )
        ).to.be(null);

        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.KING, {
              paymentOptions: {
                cardToUse: CardName.QUEEN,
                resources: {},
              },
            })
          )
        ).to.match(/cannot use queen to play king/i);

        expect(() => {
          player.validatePaymentOptions(
            playCardInput(CardName.KING, {
              paymentOptions: {
                cardToUse: CardName.CASTLE,
                resources: {},
              },
            })
          );
        }).to.throwException(/unexpected/i);
      });

      it("CRANE", () => {
        const player = gameState.getActivePlayer();
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.CRANE,
                resources: {},
              },
            })
          )
        ).to.match(/unable to find crane/i);

        player.addToCity(CardName.CRANE);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.CRANE,
                resources: {},
              },
            })
          )
        ).to.be(null);

        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.WIFE, {
              paymentOptions: {
                cardToUse: CardName.CRANE,
                resources: {},
              },
            })
          )
        ).to.match(/unable to use crane to play wife/i);
      });

      it("INN", () => {
        const player = gameState.getActivePlayer();
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INN,
                resources: {},
              },
            })
          )
        ).to.match(/unable to find inn/i);

        player.addToCity(CardName.INN);
        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INN,
                resources: {},
              },
            })
          )
        ).to.match(/cannot use inn to play a non-meadow card/i);

        expect(
          player.validatePaymentOptions(
            playCardInput(CardName.FARM, {
              fromMeadow: true,
              paymentOptions: {
                cardToUse: CardName.INN,
                resources: {},
              },
            })
          )
        ).to.be(null);
      });
    });
  });

  describe("isPaidResourcesValid", () => {
    it("invalid resources", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid({}, { [ResourceType.BERRY]: 1 })
      ).to.be(false);
      expect(player.isPaidResourcesValid({}, { [ResourceType.TWIG]: 1 })).to.be(
        false
      );
      expect(
        player.isPaidResourcesValid({}, { [ResourceType.PEBBLE]: 1 })
      ).to.be(false);
      expect(
        player.isPaidResourcesValid({}, { [ResourceType.RESIN]: 1 })
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 2 }
        )
      ).to.be(false);
    });

    it("wrong resources", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 2, [ResourceType.TWIG]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.RESIN]: 2, [ResourceType.TWIG]: 1 },
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.PEBBLE]: 2, [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 2, [ResourceType.PEBBLE]: 1 },
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
    });

    it("overpay resources", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 3, [ResourceType.RESIN]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 },
          null,
          false /* errorIfOverpay */
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 3, [ResourceType.RESIN]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 },
          null
        )
      ).to.be(false);
    });

    it("BERRY discount", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 0 },
          { [ResourceType.BERRY]: 2 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 0 },
          { [ResourceType.BERRY]: 2 },
          ResourceType.BERRY
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 4 },
          ResourceType.BERRY
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 0 },
          { [ResourceType.BERRY]: 4 },
          ResourceType.BERRY
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 2 },
          ResourceType.BERRY
        )
      ).to.be(false);
    });

    it("ANY 3 discount", () => {
      const player = gameState.getActivePlayer();
      expect(
        player.isPaidResourcesValid(
          {},
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 }
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          {},
          { [ResourceType.TWIG]: 2, [ResourceType.RESIN]: 1 },
          "ANY 3"
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 1 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY 3"
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 0 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY 3"
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.PEBBLE]: 5 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY 3"
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 2 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY 3"
        )
      ).to.be(false);
    });
  });

  describe("getAvailableDestinationCards", () => {
    it("0 available destination cards if you have played 0 cards", () => {
      const player = gameState.getActivePlayer();
      const availableClosedDestinationCards = player.getAvailableClosedDestinationCards();

      expect(availableClosedDestinationCards.length).to.be(0);
    });
    it("getAvailableClosedDestinationCards only returns non-Open Destination Cards", () => {
      const player = gameState.getActivePlayer();
      let availableClosedDestinationCards = player.getAvailableClosedDestinationCards();

      expect(availableClosedDestinationCards.length).to.be(0);

      player.addToCity(CardName.INN);
      player.addToCity(CardName.LOOKOUT);
      player.addToCity(CardName.QUEEN);

      availableClosedDestinationCards = player.getAvailableClosedDestinationCards();

      expect(availableClosedDestinationCards.length).to.be(2);
    });
    it("getAvailableOpenDestinationCards only returns Open Destination Cards", () => {
      const player = gameState.getActivePlayer();
      let availableOpenDestinationCards = player.getAvailableOpenDestinationCards();

      expect(availableOpenDestinationCards.length).to.be(0);

      player.addToCity(CardName.INN);
      player.addToCity(CardName.POST_OFFICE);
      player.addToCity(CardName.LOOKOUT);

      availableOpenDestinationCards = player.getAvailableOpenDestinationCards();
      expect(player.getNumCardsInCity()).to.be(3);

      expect(availableOpenDestinationCards.length).to.be(2);
    });
  });

  describe("payForCard", () => {
    describe("useAssociatedCard", () => {
      it("should occupy associated card after using it", () => {
        // Use INN to play INNKEEPER
        const card = Card.fromName(CardName.INNKEEPER);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            useAssociatedCard: true,
          },
        });

        let player = gameState.getActivePlayer();
        player.addToCity(CardName.INN);
        expect(player.hasUnusedByCritterConstruction(CardName.INN)).to.be(true);
        player.cardsInHand = [card.name];

        expect(player.hasCardInCity(CardName.INN)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);
        expect(player.cardsInHand).to.not.eql([]);

        gameState = gameState.next(gameInput);
        player = gameState.getPlayer(player.playerId);

        expect(player.cardsInHand).to.eql([]);
        expect(player.hasUnusedByCritterConstruction(CardName.INN)).to.be(
          false
        );
        expect(player.hasCardInCity(CardName.INN)).to.be(true);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(true);

        // Back to the prev player
        gameState.nextPlayer();

        // Now INN is occupied, try to occupy it again
        player.cardsInHand = [card.name];
        expect(player.cardsInHand).to.not.eql([]);
        expect(card.canPlay(gameState, gameInput)).to.be(false);

        // Innkeeper is unique.
        expect(() => {
          gameState = gameState.next(gameInput);
        }).to.throwException(/cannot add innkeeper/i);

        // Destroy it
        player.removeCardFromCity(
          gameState,
          player.getFirstPlayedCard(CardName.INNKEEPER)
        );

        // Try again.
        expect(() => {
          gameState = gameState.next(gameInput);
        }).to.throwException(/cannot find associated card/i);
      });

      it("should occupy only ONE associated card after using it", () => {
        // Use FARM to play HUSBAND
        const card = Card.fromName(CardName.HUSBAND);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            useAssociatedCard: true,
          },
        });

        let player = gameState.getActivePlayer();
        player.cardsInHand = [card.name, card.name, card.name];

        // Add 2 farms
        player.addToCity(CardName.FARM);
        player.addToCity(CardName.FARM);

        expect(player.hasUnusedByCritterConstruction(CardName.FARM)).to.be(
          true
        );

        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);

        gameState = gameState.next(gameInput);
        player = gameState.getPlayer(player.playerId);
        expect(player.hasUnusedByCritterConstruction(CardName.FARM)).to.be(
          true
        );
        expect(player.hasCardInCity(CardName.HUSBAND)).to.be(true);
        expect(player.getPlayedCardInfos(CardName.HUSBAND).length).to.be(1);

        // Back to the prev player
        gameState.nextPlayer();

        gameState = gameState.next(gameInput);
        player = gameState.getPlayer(player.playerId);
        expect(player.hasUnusedByCritterConstruction(CardName.FARM)).to.be(
          false
        );
        expect(player.getPlayedCardInfos(CardName.HUSBAND).length).to.be(2);

        // Back to the prev player
        gameState.nextPlayer();

        expect(() => {
          gameState = gameState.next(gameInput);
        }).to.throwException(/cannot find associated card/i);
      });

      it("should occupy only specific card over the EVERTREE is one exists", () => {
        // Use FARM OR EVERTREE to play HUSBAND
        const card = Card.fromName(CardName.HUSBAND);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            useAssociatedCard: true,
          },
        });

        let player = gameState.getActivePlayer();
        player.cardsInHand = [card.name, card.name, card.name];

        // Add 2 farms
        player.addToCity(CardName.FARM);
        player.addToCity(CardName.EVERTREE);

        expect(player.hasUnusedByCritterConstruction(CardName.FARM)).to.be(
          true
        );
        expect(player.hasUnusedByCritterConstruction(CardName.EVERTREE)).to.be(
          true
        );

        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);

        gameState = gameState.next(gameInput);
        player = gameState.getPlayer(player.playerId);
        expect(player.hasUnusedByCritterConstruction(CardName.FARM)).to.be(
          false
        );
        expect(player.hasUnusedByCritterConstruction(CardName.EVERTREE)).to.be(
          true
        );
        expect(player.hasCardInCity(CardName.HUSBAND)).to.be(true);
        expect(player.getPlayedCardInfos(CardName.HUSBAND).length).to.be(1);

        // Back to the prev player
        gameState.nextPlayer();

        // use evertree this time.
        gameState = gameState.next(gameInput);
        player = gameState.getPlayer(player.playerId);
        expect(player.hasUnusedByCritterConstruction(CardName.FARM)).to.be(
          false
        );
        expect(player.hasUnusedByCritterConstruction(CardName.EVERTREE)).to.be(
          false
        );
        expect(player.getPlayedCardInfos(CardName.HUSBAND).length).to.be(2);

        // Back to the prev player
        gameState.nextPlayer();

        expect(() => {
          gameState = gameState.next(gameInput);
        }).to.throwException(/cannot find associated card/i);
      });
    });

    describe("cardToUse", () => {
      it("should remove CRANE from city after using it", () => {
        // Use crane to play farm
        const card = Card.fromName(CardName.FARM);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            cardToUse: CardName.CRANE,
          },
        });
        let player = gameState.getActivePlayer();

        player.addToCity(CardName.CRANE);
        player.cardsInHand = [card.name];
        expect(player.hasCardInCity(CardName.CRANE)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);
        expect(player.cardsInHand).to.not.eql([]);
        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);

        expect(player.cardsInHand).to.eql([]);
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(player.hasCardInCity(CardName.CRANE)).to.be(false);
      });

      it("should remove INNKEEPER from city after using it", () => {
        // Use innkeeper to play wife
        const card = Card.fromName(CardName.WIFE);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            cardToUse: CardName.INNKEEPER,
          },
        });
        let player = gameState.getActivePlayer();

        player.addToCity(CardName.INNKEEPER);
        player.cardsInHand = [card.name];
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);
        expect(player.cardsInHand).to.not.eql([]);
        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);

        expect(player.cardsInHand).to.eql([]);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(true);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(false);
      });

      it("should place worker on QUEEN after using it", () => {
        // Use QUEEN to play wife
        const card = Card.fromName(CardName.WIFE);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            cardToUse: CardName.QUEEN,
          },
        });
        let player = gameState.getActivePlayer();

        player.addToCity(CardName.QUEEN);
        player.cardsInHand = [card.name];

        expect(card.canPlay(gameState, gameInput)).to.be(true);
        expect(player.cardsInHand).to.not.eql([]);
        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getFirstPlayedCard(CardName.QUEEN)).to.eql({
          cardName: CardName.QUEEN,
          cardOwnerId: player.playerId,
          workers: [],
        });
        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);

        expect(player.cardsInHand).to.eql([]);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(true);
        expect(player.getFirstPlayedCard(CardName.QUEEN)).to.eql({
          cardName: CardName.QUEEN,
          cardOwnerId: player.playerId,
          workers: [player.playerId],
        });
        expect(player.numAvailableWorkers).to.be(1);

        nextGameState.nextPlayer();
        player.cardsInHand = [card.name];
        expect(() => {
          nextGameState.next(gameInput);
        }).to.throwException(/cannot place worker on card/i);
      });
    });

    describe("cardToDungeon", () => {
      it("should add the cardToDungeon to the dungeon", () => {
        // Dungeon wife to play farm
        const card = Card.fromName(CardName.FARM);
        const gameInput = playCardInput(card.name, {
          paymentOptions: {
            resources: {},
            cardToDungeon: CardName.WIFE,
          },
        });

        let player = gameState.getActivePlayer();
        player.cardsInHand = [card.name];

        player.addToCity(CardName.DUNGEON);
        player.addToCity(CardName.WIFE);

        expect(player.getFirstPlayedCard(CardName.DUNGEON)).to.eql({
          cardName: CardName.DUNGEON,
          cardOwnerId: player.playerId,
          pairedCards: [],
          usedForCritter: false,
        });

        expect(player.hasCardInCity(CardName.FARM)).to.be(false);
        expect(card.canPlay(gameState, gameInput)).to.be(true);

        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);
        expect(player.cardsInHand).to.eql([]);
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(false);
        expect(player.hasCardInCity(CardName.DUNGEON)).to.be(true);
        expect(player.getFirstPlayedCard(CardName.DUNGEON)).to.eql({
          cardName: CardName.DUNGEON,
          cardOwnerId: player.playerId,
          pairedCards: [CardName.WIFE],
          usedForCritter: false,
        });
      });
    });
  });

  describe("recallWorkers", () => {
    it("error is still have workers", () => {
      const player = gameState.getActivePlayer();
      expect(player.numAvailableWorkers).to.be(2);
      expect(() => {
        player.recallWorkers(gameState);
      }).to.throwException(/still have available workers/i);
    });

    it("remove workers from other player's cards", () => {
      const player1 = gameState.getActivePlayer();
      const player2 = gameState.players[1];

      expect(player1.numAvailableWorkers).to.be(2);

      // Player 1 has a worker on player 2's INN
      player2.addToCity(CardName.INN);
      player1.placeWorkerOnCard(
        gameState,
        player2.getFirstPlayedCard(CardName.INN)
      );

      // No more space
      expect(
        player1.canPlaceWorkerOnCard(player2.getFirstPlayedCard(CardName.INN))
      ).to.be(false);

      gameState.locationsMap[LocationName.BASIC_ONE_STONE]!.push(
        player1.playerId
      );
      player1.placeWorkerOnLocation(LocationName.BASIC_ONE_STONE);
      expect(player1.numAvailableWorkers).to.be(0);

      player1.recallWorkers(gameState);
      expect(player1.numAvailableWorkers).to.be(2);
      expect(gameState.locationsMap[LocationName.BASIC_ONE_STONE]).to.eql([]);
    });

    it("keeps workers on MONASTERY & CEMETARY", () => {
      const player = gameState.getActivePlayer();

      expect(player.numAvailableWorkers).to.be(2);
      player.nextSeason();
      expect(player.numAvailableWorkers).to.be(3);

      // Player has 1 worker on lookout, 1 worker on monastery
      player.addToCity(CardName.LOOKOUT);
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.LOOKOUT)
      );

      player.addToCity(CardName.MONASTERY);
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.MONASTERY)
      );

      player.addToCity(CardName.CEMETARY);
      player.placeWorkerOnCard(
        gameState,
        player.getFirstPlayedCard(CardName.CEMETARY)
      );

      player.addToCity(CardName.FARM);
      player.addToCity(CardName.FARM);

      player.forEachPlayedCard(({ cardName, workers = [] }) => {
        if (
          cardName === CardName.LOOKOUT ||
          cardName === CardName.CEMETARY ||
          cardName === CardName.MONASTERY
        ) {
          expect(workers).to.eql([player.playerId]);
        } else {
          expect(workers).to.eql([]);
        }
      });

      player.recallWorkers(gameState);
      expect(player.numAvailableWorkers).to.be(1);

      player.forEachPlayedCard(({ cardName, workers = [] }) => {
        if (cardName === CardName.CEMETARY || cardName === CardName.MONASTERY) {
          expect(workers).to.eql([player.playerId]);
        } else {
          expect(workers).to.eql([]);
        }
      });
    });
  });

  describe("placing workers on storehouse", () => {
    it("Storehouse is not a destination card, but can have a worker placed on it", () => {
      const player = gameState.getActivePlayer();
      player.addToCity(CardName.STOREHOUSE);
      player.addToCity(CardName.INN);

      const closedDestinations = player.getAvailableClosedDestinationCards();
      expect(closedDestinations).to.eql([
        player.getFirstPlayedCard(CardName.STOREHOUSE),
      ]);

      const allDestinations = player.getAllAvailableDestinationCards();
      expect(allDestinations.length).to.eql(2);
    });
  });

  describe("getPoints", () => {
    it("calculate points for player with no events", () => {
      const player = gameState.getActivePlayer();
      player.addToCityMulti([CardName.FARM, CardName.INN]);

      const points = player.getPoints(gameState);
      expect(points).to.be(3);
    });

    it("includes point tokens", () => {
      const player = gameState.getActivePlayer();
      player.addToCityMulti([CardName.FARM, CardName.INN]);
      player.gainResources({
        [ResourceType.VP]: 5,
      });
      expect(player.getPoints(gameState)).to.be(8);
    });

    it("includes point tokens on cards", () => {
      const player = gameState.getActivePlayer();
      player.addToCityMulti([CardName.CLOCK_TOWER]);
      expect(player.getPoints(gameState)).to.be(3);
    });
  });
});
