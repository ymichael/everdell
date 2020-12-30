import expect from "expect.js";
import { Card } from "./card";
import { GameState } from "./gameState";
import { testInitialGameState } from "./testHelpers";
import { sumResources } from "./gameStatePlayHelpers";
import {
  ResourceType,
  CardName,
  GameInputPlayCard,
  GameInputType,
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

  describe("canAffordCard", () => {
    it("have the right resources", () => {
      const player = gameState.getActivePlayer();
      expect(sumResources(player.resources)).to.be(0);
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
      expect(sumResources(player.resources)).to.be(0);
      expect(
        player.canAffordCard(CardName.HUSBAND, false /* isMeadow */)
      ).to.be(false);
      player.addToCity(CardName.FARM);
      expect(
        player.canAffordCard(CardName.HUSBAND, false /* isMeadow */)
      ).to.be(true);
      // Occupy the farm
      player.occupyConstruction(CardName.FARM);
      expect(
        player.canAffordCard(CardName.HUSBAND, false /* isMeadow */)
      ).to.be(false);
    });

    it("CRANE discount for constructions", () => {
      const player = gameState.getActivePlayer();
      expect(sumResources(player.resources)).to.be(0);
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
      expect(sumResources(player.resources)).to.be(0);
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
      expect(sumResources(player.resources)).to.be(0);
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
      expect(sumResources(player.resources)).to.be(0);
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

  describe("isPaymentOptionsValid", () => {
    it("sanity checks", () => {
      const player = gameState.getActivePlayer();
      expect(() => {
        player.isPaymentOptionsValid(playCardInput(CardName.FARM));
      }).to.throwException(/invalid/i);
      expect(() => {
        player.isPaymentOptionsValid(
          playCardInput(CardName.FARM, {
            paymentOptions: {},
          })
        );
      }).to.throwException(/invalid/i);
      expect(
        player.isPaymentOptionsValid(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {},
            },
          })
        )
      ).to.be(false);
      expect(() => {
        player.isPaymentOptionsValid(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {
                [ResourceType.TWIG]: 1,
                [ResourceType.RESIN]: 1,
              },
            },
          })
        );
      }).to.throwException(/Can't spend/);

      player.gainResources({
        [ResourceType.TWIG]: 1,
        [ResourceType.RESIN]: 1,
      });
      expect(
        player.isPaymentOptionsValid(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {
                [ResourceType.TWIG]: 1,
                [ResourceType.RESIN]: 1,
              },
            },
          })
        )
      ).to.be(false);

      player.gainResources({
        [ResourceType.TWIG]: 1,
      });
      expect(
        player.isPaymentOptionsValid(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {
                [ResourceType.TWIG]: 2,
                [ResourceType.RESIN]: 1,
              },
            },
          })
        )
      ).to.be(true);
    });

    it("cardToDungeon", () => {
      const player = gameState.getActivePlayer();
      expect(() => {
        player.isPaymentOptionsValid(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              cardToDungeon: CardName.WIFE,
              resources: {},
            },
          })
        );
      }).to.throwException(/cannot use dungeon/i);
      player.addToCity(CardName.WIFE);
      player.addToCity(CardName.DUNGEON);
      expect(
        player.isPaymentOptionsValid(
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {},
              cardToDungeon: CardName.WIFE,
            },
          })
        )
      ).to.be(true);
      expect(
        player.isPaymentOptionsValid(
          playCardInput(CardName.KING, {
            paymentOptions: {
              resources: {},
              cardToDungeon: CardName.WIFE,
            },
          })
        )
      ).to.be(false);
    });

    describe("cardToUse", () => {
      it("invalid", () => {
        const player = gameState.getActivePlayer();
        expect(() => {
          player.isPaymentOptionsValid(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.FARM,
                resources: {},
              },
            })
          );
        }).to.throwException(/cannot use/i);
      });

      it("INNKEEPER", () => {
        const player = gameState.getActivePlayer();
        expect(() => {
          player.isPaymentOptionsValid(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {},
              },
            })
          );
        }).to.throwException(/cannot use innkeeper/i);

        player.addToCity(CardName.INNKEEPER);
        expect(() => {
          player.isPaymentOptionsValid(
            playCardInput(CardName.FARM, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {},
              },
            })
          );
        }).to.throwException(/cannot use innkeeper/i);
        expect(
          player.isPaymentOptionsValid(
            playCardInput(CardName.HUSBAND, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {},
              },
            })
          )
        ).to.be(true);

        player.gainResources({
          [ResourceType.BERRY]: 1,
        });

        expect(() => {
          player.isPaymentOptionsValid(
            playCardInput(CardName.HUSBAND, {
              paymentOptions: {
                cardToUse: CardName.INNKEEPER,
                resources: {
                  [ResourceType.BERRY]: 1,
                },
              },
            })
          );
        }).to.throwException(/overpay/i);
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
      expect(() => {
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 3, [ResourceType.RESIN]: 1 },
          { [ResourceType.BERRY]: 2, [ResourceType.RESIN]: 1 },
          null
        );
      }).to.throwException(/overpay/);
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
      expect(() => {
        player.isPaidResourcesValid(
          { [ResourceType.BERRY]: 1 },
          { [ResourceType.BERRY]: 2 },
          ResourceType.BERRY
        );
      }).to.throwException(/overpay/);
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
      expect(() => {
        player.isPaidResourcesValid(
          { [ResourceType.TWIG]: 2 },
          { [ResourceType.TWIG]: 3, [ResourceType.RESIN]: 1 },
          "ANY"
        );
      }).to.throwException(/overpay/);
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

      player.playedCards[CardName.INN] = [{}];
      player.playedCards[CardName.LOOKOUT] = [{}];
      player.playedCards[CardName.QUEEN] = [{}];

      availableClosedDestinationCards = player.getAvailableClosedDestinationCards();

      expect(availableClosedDestinationCards.length).to.be(2);
    });
    it("getAvailableOpenDestinationCards only returns Open Destination Cards", () => {
      const player = gameState.getActivePlayer();
      let availableOpenDestinationCards = player.getAvailableOpenDestinationCards();

      expect(availableOpenDestinationCards.length).to.be(0);

      player.playedCards[CardName.INN] = [{}];
      player.playedCards[CardName.POST_OFFICE] = [{}];
      player.playedCards[CardName.LOOKOUT] = [{}];

      availableOpenDestinationCards = player.getAvailableOpenDestinationCards();
      expect(Object.keys(player.playedCards).length).to.be(3);

      expect(availableOpenDestinationCards.length).to.be(2);
    });
  });

  describe("payForCard", () => {
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
        expect(player.hasPlayedCard(CardName.CRANE)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);
        expect(player.cardsInHand).to.not.eql([]);
        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);

        expect(player.cardsInHand).to.eql([]);
        expect(player.hasPlayedCard(CardName.FARM)).to.be(true);
        expect(player.hasPlayedCard(CardName.CRANE)).to.be(false);
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
        expect(player.hasPlayedCard(CardName.INNKEEPER)).to.be(true);
        expect(card.canPlay(gameState, gameInput)).to.be(true);
        expect(player.cardsInHand).to.not.eql([]);
        const nextGameState = gameState.next(gameInput);
        player = nextGameState.getPlayer(player.playerId);

        expect(player.cardsInHand).to.eql([]);
        expect(player.hasPlayedCard(CardName.WIFE)).to.be(true);
        expect(player.hasPlayedCard(CardName.INNKEEPER)).to.be(false);
      });
    });
  });
});
