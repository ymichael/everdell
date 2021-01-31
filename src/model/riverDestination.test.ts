import expect from "expect.js";
import {
  CardName,
  ResourceType,
  RiverDestinationName,
  RiverDestinationType,
  RiverDestinationSpotName,
  GameInputType,
} from "./types";
import {
  RiverDestination,
  RiverDestinationMap,
  initialRiverDestinationMap,
} from "./riverDestination";
import { GameState } from "./gameState";
import { Player } from "./player";
import { testInitialGameState, multiStepGameInputTest } from "./testHelpers";

describe("RiverDestinationMap", () => {
  let gameState: GameState;
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
    player = gameState.getActivePlayer();
  });

  describe("initialRiverDestinationMap", () => {
    it("should return 2 random CITIZEN and 2 random LOCATION river destinations", () => {
      const riverMap = initialRiverDestinationMap();
      const typeToCount = {
        [RiverDestinationType.SHOAL]: 0,
        [RiverDestinationType.LOCATION]: 0,
        [RiverDestinationType.CITIZEN]: 0,
      };

      expect(riverMap.spots.SHOAL.name).to.be(RiverDestinationName.SHOAL);

      Object.values(riverMap.spots).forEach(
        ({ name, revealed, ambassadors }) => {
          if (!name) {
            throw new Error(`Unexpected name: ${name}`);
          }
          const riverDestination = RiverDestination.fromName(name);
          typeToCount[riverDestination.type] += 1;
          if (name === RiverDestinationName.SHOAL) {
            expect(revealed).to.be(true);
          } else {
            expect(revealed).to.be(false);
          }
          expect(ambassadors).to.eql([]);
        }
      );

      expect(typeToCount).to.eql({
        [RiverDestinationType.SHOAL]: 1,
        [RiverDestinationType.LOCATION]: 2,
        [RiverDestinationType.CITIZEN]: 2,
      });
    });
  });

  describe("RiverDestinationMap", () => {
    describe("canVisitSpotCheck", () => {
      describe(RiverDestinationSpotName.THREE_PRODUCTION, () => {
        const name = RiverDestinationSpotName.THREE_PRODUCTION;
        it("should only allow players with 3 PRODUCTION", () => {
          const map = gameState.riverDestinationMap as RiverDestinationMap;
          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.FARM);
          player.addToCity(gameState, CardName.FARM);
          player.addToCity(gameState, CardName.UNIVERSITY);
          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.FARM);
          expect(map.canVisitSpotCheck(gameState, name)).to.be(null);
        });

        it("should account for MESSENGER", () => {
          const map = gameState.riverDestinationMap as RiverDestinationMap;
          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.FARM);
          player.addToCity(gameState, CardName.FARM);
          player.addToCity(gameState, CardName.MESSENGER);

          player.updatePlayedCard(
            gameState,
            player.getFirstPlayedCard(CardName.FARM),
            { shareSpaceWith: CardName.MESSENGER }
          );
          player.updatePlayedCard(
            gameState,
            player.getFirstPlayedCard(CardName.MESSENGER),
            { shareSpaceWith: CardName.FARM }
          );
          expect(map.canVisitSpotCheck(gameState, name)).to.be(null);
        });
      });
      describe(RiverDestinationSpotName.TWO_DESTINATION, () => {
        const name = RiverDestinationSpotName.TWO_DESTINATION;

        it("should only allow players with 2 DESTINATION", () => {
          const map = gameState.riverDestinationMap as RiverDestinationMap;

          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.RANGER);
          player.addToCity(gameState, CardName.FARM);
          player.addToCity(gameState, CardName.UNIVERSITY);
          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.QUEEN);
          expect(map.canVisitSpotCheck(gameState, name)).to.be(null);
        });

        it("should account for MESSENGER", () => {
          const map = gameState.riverDestinationMap as RiverDestinationMap;
          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.UNIVERSITY);
          player.addToCity(gameState, CardName.MESSENGER);

          player.updatePlayedCard(
            gameState,
            player.getFirstPlayedCard(CardName.UNIVERSITY),
            { shareSpaceWith: CardName.MESSENGER }
          );
          player.updatePlayedCard(
            gameState,
            player.getFirstPlayedCard(CardName.MESSENGER),
            { shareSpaceWith: CardName.UNIVERSITY }
          );
          expect(map.canVisitSpotCheck(gameState, name)).to.be(null);
        });
      });
      describe(RiverDestinationSpotName.TWO_GOVERNANCE, () => {
        const name = RiverDestinationSpotName.TWO_GOVERNANCE;

        it("should only allow players with 2 GOVERNANCE", () => {
          const map = gameState.riverDestinationMap as RiverDestinationMap;

          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.RANGER);
          player.addToCity(gameState, CardName.JUDGE);
          player.addToCity(gameState, CardName.UNIVERSITY);
          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.SHOPKEEPER);
          expect(map.canVisitSpotCheck(gameState, name)).to.be(null);
        });

        it("should account for MESSENGER", () => {
          const map = gameState.riverDestinationMap as RiverDestinationMap;
          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.COURTHOUSE);
          player.addToCity(gameState, CardName.MESSENGER);

          player.updatePlayedCard(
            gameState,
            player.getFirstPlayedCard(CardName.COURTHOUSE),
            { shareSpaceWith: CardName.MESSENGER }
          );
          player.updatePlayedCard(
            gameState,
            player.getFirstPlayedCard(CardName.MESSENGER),
            { shareSpaceWith: CardName.COURTHOUSE }
          );
          expect(map.canVisitSpotCheck(gameState, name)).to.be(null);
        });
      });

      describe(RiverDestinationSpotName.TWO_TRAVELER, () => {
        const name = RiverDestinationSpotName.TWO_TRAVELER;

        it("should only allow players with 2 TRAVELER", () => {
          const map = gameState.riverDestinationMap as RiverDestinationMap;

          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.RANGER);
          player.addToCity(gameState, CardName.FARM);
          player.addToCity(gameState, CardName.UNIVERSITY);
          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.WANDERER);
          expect(map.canVisitSpotCheck(gameState, name)).to.be(null);
        });

        it("should account for MESSENGER", () => {
          const map = gameState.riverDestinationMap as RiverDestinationMap;
          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.FARM);
          player.addToCity(gameState, CardName.RANGER);
          player.addToCity(gameState, CardName.MESSENGER);

          player.updatePlayedCard(
            gameState,
            player.getFirstPlayedCard(CardName.FARM),
            { shareSpaceWith: CardName.MESSENGER }
          );
          player.updatePlayedCard(
            gameState,
            player.getFirstPlayedCard(CardName.MESSENGER),
            { shareSpaceWith: CardName.FARM }
          );
          expect(map.canVisitSpotCheck(gameState, name)).to.match(/must have/i);

          player.addToCity(gameState, CardName.WANDERER);
          expect(map.canVisitSpotCheck(gameState, name)).to.be(null);
        });
      });
    });

    describe("toJSON/fromJSON", () => {
      it("should hide unrevealed destinations if includePrivate is false", () => {
        const riverMap = initialRiverDestinationMap();

        let riverMapJSON = riverMap.toJSON(false);
        expect(riverMapJSON.spots.SHOAL.name).to.not.be(null);

        expect(riverMapJSON.spots.THREE_PRODUCTION.name).to.be(null);
        expect(riverMapJSON.spots.TWO_DESTINATION.name).to.be(null);
        expect(riverMapJSON.spots.TWO_TRAVELER.name).to.be(null);
        expect(riverMapJSON.spots.TWO_GOVERNANCE.name).to.be(null);

        riverMapJSON = riverMap.toJSON(true);
        expect(riverMapJSON.spots.SHOAL.name).to.not.be(null);

        expect(riverMapJSON.spots.THREE_PRODUCTION.name).to.not.be(null);
        expect(riverMapJSON.spots.TWO_DESTINATION.name).to.not.be(null);
        expect(riverMapJSON.spots.TWO_TRAVELER.name).to.not.be(null);
        expect(riverMapJSON.spots.TWO_GOVERNANCE.name).to.not.be(null);
      });

      it("should not hide revealed destinations", () => {
        const riverMap = initialRiverDestinationMap();
        riverMap.spots.THREE_PRODUCTION.revealed = true;

        const riverMapJSON = riverMap.toJSON(false);
        expect(riverMapJSON.spots.SHOAL.name).to.not.be(null);
        expect(riverMapJSON.spots.THREE_PRODUCTION.name).to.not.be(null);

        expect(riverMapJSON.spots.TWO_DESTINATION.name).to.be(null);
        expect(riverMapJSON.spots.TWO_TRAVELER.name).to.be(null);
        expect(riverMapJSON.spots.TWO_GOVERNANCE.name).to.be(null);
      });
    });
  });

  it("should receive a PEARL for revealing a river destination", () => {
    player.addToCity(gameState, CardName.JUDGE);
    player.addToCity(gameState, CardName.SHOPKEEPER);

    const spot = RiverDestinationSpotName.TWO_GOVERNANCE;
    gameState.riverDestinationMap!.spots[spot]!.name =
      RiverDestinationName.GUS_THE_GARDENER;
    expect(gameState.riverDestinationMap!.spots[spot]!.revealed).to.be(false);

    expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
    [player, gameState] = multiStepGameInputTest(gameState, [
      {
        inputType: GameInputType.PLACE_AMBASSADOR,
        clientOptions: {
          loc: { type: "spot", spot: spot },
        },
      },
    ]);

    expect(
      gameState.riverDestinationMap!.spots[
        RiverDestinationSpotName.TWO_GOVERNANCE
      ]!.revealed
    ).to.be(true);
    expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);
  });

  describe(RiverDestinationName.GUS_THE_GARDENER, () => {
    beforeEach(() => {
      const spot = RiverDestinationSpotName.TWO_TRAVELER;
      gameState.riverDestinationMap!.spots[spot]!.name =
        RiverDestinationName.GUS_THE_GARDENER;
      gameState.riverDestinationMap!.spots[spot]!.revealed = true;
      player.addToCity(gameState, CardName.WANDERER);
      player.addToCity(gameState, CardName.RANGER);
    });

    it("should do nothing if player doesn't have 3 PRODUCTION cards", () => {
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PLACE_AMBASSADOR,
          clientOptions: {
            loc: { type: "spot", spot: RiverDestinationSpotName.TWO_TRAVELER },
          },
        },
      ]);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
    });

    it("should allow player to NOT discard 3 PRODUCTION cards", () => {
      player.cardsInHand.push(CardName.FARM);
      player.cardsInHand.push(CardName.FARM);
      player.cardsInHand.push(CardName.QUEEN);
      player.cardsInHand.push(CardName.JUDGE);
      player.cardsInHand.push(CardName.MINE);

      expect(player.hasUnusedAmbassador()).to.be(true);
      expect(player.cardsInHand).to.not.eql([]);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PLACE_AMBASSADOR,
          clientOptions: {
            loc: { type: "spot", spot: RiverDestinationSpotName.TWO_TRAVELER },
          },
        },
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.PLACE_AMBASSADOR,
          cardOptions: [CardName.FARM, CardName.FARM, CardName.MINE],
          maxToSelect: 3,
          minToSelect: 0,
          riverDestinationContext: RiverDestinationName.GUS_THE_GARDENER,
          clientOptions: {
            selectedCards: [],
          },
        },
      ]);

      expect(player.hasUnusedAmbassador()).to.be(false);
      expect(player.cardsInHand).to.eql([
        CardName.FARM,
        CardName.FARM,
        CardName.QUEEN,
        CardName.JUDGE,
        CardName.MINE,
      ]);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
    });

    it("should allow player to discard 3 PRODUCTION cards", () => {
      player.cardsInHand.push(CardName.FARM);
      player.cardsInHand.push(CardName.FARM);
      player.cardsInHand.push(CardName.QUEEN);
      player.cardsInHand.push(CardName.JUDGE);
      player.cardsInHand.push(CardName.MINE);

      expect(player.hasUnusedAmbassador()).to.be(true);
      expect(player.cardsInHand).to.not.eql([]);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PLACE_AMBASSADOR,
          clientOptions: {
            loc: { type: "spot", spot: RiverDestinationSpotName.TWO_TRAVELER },
          },
        },
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.PLACE_AMBASSADOR,
          cardOptions: [CardName.FARM, CardName.FARM, CardName.MINE],
          maxToSelect: 3,
          minToSelect: 0,
          riverDestinationContext: RiverDestinationName.GUS_THE_GARDENER,
          clientOptions: {
            selectedCards: [CardName.FARM, CardName.FARM, CardName.MINE],
          },
        },
      ]);

      expect(player.hasUnusedAmbassador()).to.be(false);
      expect(player.cardsInHand).to.eql([CardName.QUEEN, CardName.JUDGE]);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
    });
  });

  describe(RiverDestinationName.BALLROOM, () => {
    beforeEach(() => {
      const spot = RiverDestinationSpotName.TWO_TRAVELER;
      gameState.riverDestinationMap!.spots[spot]!.name =
        RiverDestinationName.BALLROOM;
      gameState.riverDestinationMap!.spots[spot]!.revealed = true;
      player.addToCity(gameState, CardName.WANDERER);
      player.addToCity(gameState, CardName.RANGER);
    });

    it("should do nothing if player doesn't have VP", () => {
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
      player.gainResources(gameState, { [ResourceType.RESIN]: 1 });
      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PLACE_AMBASSADOR,
          clientOptions: {
            loc: { type: "spot", spot: RiverDestinationSpotName.TWO_TRAVELER },
          },
        },
      ]);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
    });

    it("should do nothing if player doesn't have RESIN", () => {
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      player.gainResources(gameState, { [ResourceType.VP]: 1 });
      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PLACE_AMBASSADOR,
          clientOptions: {
            loc: { type: "spot", spot: RiverDestinationSpotName.TWO_TRAVELER },
          },
        },
      ]);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
    });

    it("should ask the player to choose spend RESIN & VP", () => {
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      player.gainResources(gameState, {
        [ResourceType.VP]: 1,
        [ResourceType.RESIN]: 1,
      });
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
      expect(player.cardsInHand.length).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PLACE_AMBASSADOR,
          clientOptions: {
            loc: { type: "spot", spot: RiverDestinationSpotName.TWO_TRAVELER },
          },
        },
        {
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: GameInputType.PLACE_AMBASSADOR,
          riverDestinationContext: RiverDestinationName.BALLROOM,
          options: ["Ok", "Decline"],
          clientOptions: { selectedOption: "Ok" },
        },
      ]);
      expect(player.cardsInHand.length).to.be(3);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
    });

    it("allow the player to choose NOT to spend RESIN & VP", () => {
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      player.gainResources(gameState, {
        [ResourceType.VP]: 1,
        [ResourceType.RESIN]: 1,
      });
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
      expect(player.cardsInHand.length).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PLACE_AMBASSADOR,
          clientOptions: {
            loc: { type: "spot", spot: RiverDestinationSpotName.TWO_TRAVELER },
          },
        },
        {
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: GameInputType.PLACE_AMBASSADOR,
          riverDestinationContext: RiverDestinationName.BALLROOM,
          options: ["Ok", "Decline"],
          clientOptions: { selectedOption: "Decline" },
        },
      ]);
      expect(player.cardsInHand.length).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
    });
  });

  describe(RiverDestinationName.SHOAL, () => {
    it("should not allow player to visit if insufficient resources / cards", () => {
      expect(() => {
        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.PLACE_AMBASSADOR,
            clientOptions: {
              loc: { type: "spot", spot: RiverDestinationSpotName.SHOAL },
            },
          },
        ]);
      }).to.throwException(/not enough resources/i);

      player.gainResources(gameState, { [ResourceType.BERRY]: 2 });
      expect(() => {
        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.PLACE_AMBASSADOR,
            clientOptions: {
              loc: { type: "spot", spot: RiverDestinationSpotName.SHOAL },
            },
          },
        ]);
      }).to.throwException(/not enough cards/i);

      player.addCardToHand(gameState, CardName.HUSBAND);
      player.addCardToHand(gameState, CardName.WIFE);
      player.spendResources({ [ResourceType.BERRY]: 2 });

      expect(() => {
        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.PLACE_AMBASSADOR,
            clientOptions: {
              loc: { type: "spot", spot: RiverDestinationSpotName.SHOAL },
            },
          },
        ]);
      }).to.throwException(/not enough resources/i);
    });

    it("should ask the player to spend resources and discard cards", () => {
      player.gainResources(gameState, { [ResourceType.BERRY]: 2 });
      player.cardsInHand.push(CardName.FARM);
      player.cardsInHand.push(CardName.FARM);

      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.PLACE_AMBASSADOR,
          clientOptions: {
            loc: { type: "spot", spot: RiverDestinationSpotName.SHOAL },
          },
        },
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.PLACE_AMBASSADOR,
          riverDestinationContext: RiverDestinationName.SHOAL,
          toSpend: true,
          minResources: 2,
          maxResources: 2,
          clientOptions: { resources: { [ResourceType.BERRY]: 2 } },
        },
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.SELECT_RESOURCES,
          riverDestinationContext: RiverDestinationName.SHOAL,
          cardOptions: [CardName.FARM, CardName.FARM],
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: { selectedCards: [CardName.FARM, CardName.FARM] },
        },
      ]);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.cardsInHand.length).to.be(0);
    });

    it("should auto advance if possible", () => {
      player.gainResources(gameState, { [ResourceType.BERRY]: 2 });
      player.cardsInHand.push(CardName.FARM);
      player.cardsInHand.push(CardName.FARM);

      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      [player, gameState] = multiStepGameInputTest(
        gameState,
        [
          {
            inputType: GameInputType.PLACE_AMBASSADOR,
            clientOptions: {
              loc: { type: "spot", spot: RiverDestinationSpotName.SHOAL },
            },
          },
        ],
        { autoAdvance: true }
      );
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      expect(player.cardsInHand.length).to.be(0);
    });
  });
});
