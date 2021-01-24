import expect from "expect.js";
import {
  CardName,
  ResourceType,
  RiverDestinationName,
  RiverDestinationType,
  RiverDestinationSpot,
  GameInputType,
} from "./types";
import {
  RiverDestination,
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

  it("should recieve a PEARL for revealing a river destination", () => {
    player.addToCity(CardName.JUDGE);
    player.addToCity(CardName.SHOPKEEPER);

    const spot = RiverDestinationSpot.TWO_GOVERNANCE;
    gameState.riverDestinationMap!.spots[spot]!.name =
      RiverDestinationName.GUS_THE_GARDENER;
    expect(gameState.riverDestinationMap!.spots[spot]!.revealed).to.be(false);

    expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
    [player, gameState] = multiStepGameInputTest(gameState, [
      {
        inputType: GameInputType.VISIT_RIVER_DESTINATION,
        clientOptions: {
          riverDestinationSpot: spot,
        },
      },
    ]);

    expect(
      gameState.riverDestinationMap!.spots[RiverDestinationSpot.TWO_GOVERNANCE]!
        .revealed
    ).to.be(true);
    expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);
  });

  describe(RiverDestinationName.GUS_THE_GARDENER, () => {
    beforeEach(() => {
      const spot = RiverDestinationSpot.TWO_TRAVELER;
      gameState.riverDestinationMap!.spots[spot]!.name =
        RiverDestinationName.GUS_THE_GARDENER;
      gameState.riverDestinationMap!.spots[spot]!.revealed = true;
      player.addToCity(CardName.WANDERER);
      player.addToCity(CardName.RANGER);
    });

    it("should do nothing if player doesn't have 3 PRODUCTION cards", () => {
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.VISIT_RIVER_DESTINATION,
          clientOptions: {
            riverDestinationSpot: RiverDestinationSpot.TWO_TRAVELER,
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
          inputType: GameInputType.VISIT_RIVER_DESTINATION,
          clientOptions: {
            riverDestinationSpot: RiverDestinationSpot.TWO_TRAVELER,
          },
        },
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.VISIT_RIVER_DESTINATION,
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
          inputType: GameInputType.VISIT_RIVER_DESTINATION,
          clientOptions: {
            riverDestinationSpot: RiverDestinationSpot.TWO_TRAVELER,
          },
        },
        {
          inputType: GameInputType.SELECT_CARDS,
          prevInputType: GameInputType.VISIT_RIVER_DESTINATION,
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
      const spot = RiverDestinationSpot.TWO_TRAVELER;
      gameState.riverDestinationMap!.spots[spot]!.name =
        RiverDestinationName.BALLROOM;
      gameState.riverDestinationMap!.spots[spot]!.revealed = true;
      player.addToCity(CardName.WANDERER);
      player.addToCity(CardName.RANGER);
    });

    it("should do nothing if player doesn't have VP", () => {
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
      player.gainResources({ [ResourceType.RESIN]: 1 });
      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.VISIT_RIVER_DESTINATION,
          clientOptions: {
            riverDestinationSpot: RiverDestinationSpot.TWO_TRAVELER,
          },
        },
      ]);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
    });

    it("should do nothing if player doesn't have RESIN", () => {
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      player.gainResources({ [ResourceType.VP]: 1 });
      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.VISIT_RIVER_DESTINATION,
          clientOptions: {
            riverDestinationSpot: RiverDestinationSpot.TWO_TRAVELER,
          },
        },
      ]);
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
    });

    it("should ask the player to choose spend RESIN & VP", () => {
      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      player.gainResources({ [ResourceType.VP]: 1, [ResourceType.RESIN]: 1 });
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
      expect(player.cardsInHand.length).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.VISIT_RIVER_DESTINATION,
          clientOptions: {
            riverDestinationSpot: RiverDestinationSpot.TWO_TRAVELER,
          },
        },
        {
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: GameInputType.VISIT_RIVER_DESTINATION,
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
      player.gainResources({ [ResourceType.VP]: 1, [ResourceType.RESIN]: 1 });
      expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
      expect(player.cardsInHand.length).to.be(0);

      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.VISIT_RIVER_DESTINATION,
          clientOptions: {
            riverDestinationSpot: RiverDestinationSpot.TWO_TRAVELER,
          },
        },
        {
          inputType: GameInputType.SELECT_OPTION_GENERIC,
          prevInputType: GameInputType.VISIT_RIVER_DESTINATION,
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
            inputType: GameInputType.VISIT_RIVER_DESTINATION,
            clientOptions: {
              riverDestinationSpot: RiverDestinationSpot.SHOAL,
            },
          },
        ]);
      }).to.throwException(/not enough resources/i);

      player.gainResources({ [ResourceType.BERRY]: 2 });
      expect(() => {
        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_RIVER_DESTINATION,
            clientOptions: {
              riverDestinationSpot: RiverDestinationSpot.SHOAL,
            },
          },
        ]);
      }).to.throwException(/not enough cards/i);
    });

    it("should ask the player to spend resources and discard cards", () => {
      player.gainResources({ [ResourceType.BERRY]: 2 });
      player.cardsInHand.push(CardName.FARM);
      player.cardsInHand.push(CardName.FARM);

      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      [player, gameState] = multiStepGameInputTest(gameState, [
        {
          inputType: GameInputType.VISIT_RIVER_DESTINATION,
          clientOptions: {
            riverDestinationSpot: RiverDestinationSpot.SHOAL,
          },
        },
        {
          inputType: GameInputType.SELECT_RESOURCES,
          prevInputType: GameInputType.VISIT_RIVER_DESTINATION,
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
      player.gainResources({ [ResourceType.BERRY]: 2 });
      player.cardsInHand.push(CardName.FARM);
      player.cardsInHand.push(CardName.FARM);

      expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      [player, gameState] = multiStepGameInputTest(
        gameState,
        [
          {
            inputType: GameInputType.VISIT_RIVER_DESTINATION,
            clientOptions: {
              riverDestinationSpot: RiverDestinationSpot.SHOAL,
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
