import expect from "expect.js";
import { Card } from "./card";
import { GameState } from "./gameState";
import { testInitialGameState } from "./testHelpers";
import { sumResources } from "./gameStatePlayHelpers";
import {
  ResourceType,
  CardName,
  GameInputType,
  GameInputPlayCard,
  LocationName,
} from "./types";

const playCardInput = (
  card: CardName,
  overrides: any = {}
): GameInputPlayCard => {
  return {
    inputType: GameInputType.PLAY_CARD as const,
    card,
    fromMeadow: false,
    ...overrides,
  };
};

describe("Player", () => {
  let gameState: GameState;

  beforeEach(() => {
    gameState = testInitialGameState();
  });

  describe("canAddToCity", () => {
    it("should be able to add cards to city if there is space", () => {
      const player = gameState.getActivePlayer();
      expect(player.canAddToCity(CardName.FARM)).to.be(true);

      player.addToCity(CardName.FARM);
      expect(player.canAddToCity(CardName.FARM)).to.be(true);
    });

    it("should not be able to add cards to city if there is no space", () => {
      const player = gameState.getActivePlayer();

      // max city size is 15, minus some special rules for husband/wife and wanderer
      player.addToCityMulti([
        CardName.FARM,
        CardName.WIFE,
        CardName.SCHOOL,
        CardName.FOOL,
        CardName.POSTAL_PIGEON,
        CardName.POSTAL_PIGEON,
        CardName.POST_OFFICE,
        CardName.INN,
        CardName.MINER_MOLE,
        CardName.MINE,
        CardName.RESIN_REFINERY,
        CardName.TWIG_BARGE,
        CardName.FARM,
        CardName.BARGE_TOAD,
        CardName.FARM,
      ]);
      expect(player.canAddToCity(CardName.FARM)).to.be(false);
    });

    it("should be able to add wanderer to city even if city is already full", () => {
      const player = gameState.getActivePlayer();

      // max city size is 15, minus some special rules for husband/wife and wanderer
      player.addToCityMulti([
        CardName.FARM,
        CardName.WIFE,
        CardName.SCHOOL,
        CardName.FOOL,
        CardName.POSTAL_PIGEON,
        CardName.POSTAL_PIGEON,
        CardName.POST_OFFICE,
        CardName.INN,
        CardName.MINER_MOLE,
        CardName.MINE,
        CardName.RESIN_REFINERY,
        CardName.TWIG_BARGE,
        CardName.FARM,
        CardName.BARGE_TOAD,
        CardName.FARM,
      ]);
      expect(player.canAddToCity(CardName.WANDERER)).to.be(true);
    });

    it("should allow player to add another card if there's a husband/wife pair that can share a spot", () => {
      const player = gameState.getActivePlayer();

      // max city size is 15, minus some special rules for husband/wife and wanderer
      player.addToCityMulti([
        CardName.HUSBAND,
        CardName.WIFE,
        CardName.SCHOOL,
        CardName.FOOL,
        CardName.POSTAL_PIGEON,
        CardName.POSTAL_PIGEON,
        CardName.POST_OFFICE,
        CardName.INN,
        CardName.MINER_MOLE,
        CardName.MINE,
        CardName.RESIN_REFINERY,
        CardName.TWIG_BARGE,
        CardName.FARM,
        CardName.BARGE_TOAD,
        CardName.FARM,
      ]);
      expect(player.canAddToCity(CardName.FARM)).to.be(true);
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
      ).to.match(/dungeon/i);
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

      // TODO
      xit("QUEEN", () => {
        throw new Error("Not Implemented yet");
      });
      xit("CRANE", () => {
        throw new Error("Not Implemented yet");
      });
      xit("INN", () => {
        throw new Error("Not Implemented yet");
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

    it("ANY discount", () => {
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
          "ANY"
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 1 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY"
        )
      ).to.be(true);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 0 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY"
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.PEBBLE]: 5 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY"
        )
      ).to.be(false);
      expect(
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 2 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY"
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
          player.getPlayedCardInfos(CardName.INNKEEPER)[0]
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
      expect(player1.canPlaceWorkerOnCard(CardName.INN, player2)).to.be(false);

      // Player 1 has a worker on player 2's INN
      player2.addToCity(CardName.INN);
      expect(player1.canPlaceWorkerOnCard(CardName.INN, player2)).to.be(true);
      player1.placeWorkerOnCard(CardName.INN, player2);

      // No more space
      expect(player1.canPlaceWorkerOnCard(CardName.INN, player2)).to.be(false);

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
      player.placeWorkerOnCard(CardName.LOOKOUT);

      player.addToCity(CardName.MONASTERY);
      player.placeWorkerOnCard(CardName.MONASTERY);

      player.addToCity(CardName.CEMETARY);
      player.placeWorkerOnCard(CardName.CEMETARY);

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
      expect(closedDestinations).to.eql([CardName.STOREHOUSE]);

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
