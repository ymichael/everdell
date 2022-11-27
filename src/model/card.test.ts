import expect from "expect.js";
import { Card } from "./card";
import { Location } from "./location";
import { GameState } from "./gameState";
import { Player } from "./player";
import {
  testInitialGameState,
  multiStepGameInputTest,
  playCardInput,
} from "./testHelpers";
import {
  CardType,
  EventName,
  LocationType,
  ResourceType,
  GameInputType,
  CardName,
  Season,
  LocationName,
  RiverDestinationName,
  RiverDestinationSpotName,
  PlayerStatus,
  GameInput,
} from "./types";

describe("Card", () => {
  let gameState: GameState;
  let player: Player;

  beforeEach(() => {
    gameState = testInitialGameState();
    player = gameState.getActivePlayer();
  });

  describe("fromName", () => {
    it("should return the expect Card instances", () => {
      Object.values(CardName).forEach((card) => {
        expect(Card.fromName(card as CardName).name).to.be(card);
      });
    });
  });

  describe("Card destinations", () => {
    it("Inn should be marked as an open destination", () => {
      const card = Card.fromName(CardName.INN);
      expect(card.cardType).to.be(CardType.DESTINATION);

      const isOpenDestination = card.isOpenDestination;
      expect(isOpenDestination).to.be(true);
    });

    it("Queen should be marked as a destination, but not open", () => {
      const card = Card.fromName(CardName.QUEEN);
      expect(card.cardType).to.be(CardType.DESTINATION);

      const isOpenDestination = card.isOpenDestination;
      expect(isOpenDestination).to.be(false);
    });

    it("Storehouse is not a destination card, but can have a worker placed on it", () => {
      let card = Card.fromName(CardName.STOREHOUSE);
      expect(card.cardType).to.be(CardType.PRODUCTION);
      expect(
        card.getNumWorkerSpotsForPlayer(gameState.getActivePlayer())
      ).to.be(1);

      card = Card.fromName(CardName.POST_OFFICE);
      expect(card.cardType).to.be(CardType.DESTINATION);
      expect(
        card.getNumWorkerSpotsForPlayer(gameState.getActivePlayer())
      ).to.be(1);

      card = Card.fromName(CardName.FARM);
      expect(
        card.getNumWorkerSpotsForPlayer(gameState.getActivePlayer())
      ).to.be(0);
    });
  });

  describe("Card Specific", () => {
    describe(CardName.ARCHITECT, () => {
      it("should be worth 1 VP per unused RESIN/PEBBLE", () => {
        const card = Card.fromName(CardName.ARCHITECT);
        expect(card.getPoints(player, gameState)).to.be(2);

        player.gainResources(gameState, { [ResourceType.PEBBLE]: 1 });
        expect(card.getPoints(player, gameState)).to.be(3);

        player.gainResources(gameState, { [ResourceType.RESIN]: 2 });
        expect(card.getPoints(player, gameState)).to.be(5);
      });

      it("should be worth 1 VP per unused RESIN/PEBBLE up to 6 MAX", () => {
        const card = Card.fromName(CardName.ARCHITECT);
        expect(card.getPoints(player, gameState)).to.be(2);

        player.gainResources(gameState, { [ResourceType.PEBBLE]: 10 });
        player.gainResources(gameState, { [ResourceType.RESIN]: 10 });
        expect(card.getPoints(player, gameState)).to.be(2 + 6);
      });
    });

    describe(CardName.BARD, () => {
      it("should not prompt is user has no cards to discard", () => {
        const card = Card.fromName(CardName.BARD);

        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(card.name)],
          { autoAdvance: true }
        );

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.cardsInHand).to.eql([]);
      });

      it("should gain vp corresponding to no. of discarded cards", () => {
        const card = Card.fromName(CardName.BARD);

        player.addCardToHand(gameState, CardName.BARD);
        player.addCardToHand(gameState, CardName.FARM);
        player.addCardToHand(gameState, CardName.RUINS);
        player.gainResources(gameState, card.baseCost);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            clientOptions: {
              cardsToDiscard: [CardName.FARM, CardName.RUINS],
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(2);
        expect(player.cardsInHand).to.eql([]);
      });

      it("should not allow more than 5 discarded cards", () => {
        const card = Card.fromName(CardName.BARD);
        const gameInput = playCardInput(card.name);

        player.cardsInHand = [
          CardName.BARD,
          CardName.FARM,
          CardName.RUINS,
          CardName.FARM,
          CardName.RUINS,
          CardName.FARM,
          CardName.RUINS,
        ];
        player.gainResources(gameState, card.baseCost);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        expect(() => {
          [player, gameState] = multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            {
              clientOptions: {
                cardsToDiscard: [
                  CardName.BARD,
                  CardName.FARM,
                  CardName.RUINS,
                  CardName.FARM,
                  CardName.RUINS,
                  CardName.FARM,
                ],
              },
            },
          ]);
        }).to.throwException(/too many cards/);

        expect(() => {
          [player, gameState] = multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            {
              clientOptions: {
                cardsToDiscard: [CardName.QUEEN],
              },
            },
          ]);
        }).to.throwException(/unable to discard/i);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
      });
    });

    describe(CardName.BARGE_TOAD, () => {
      it("should gain 0 TWIG if no FARM in city", () => {
        const card = Card.fromName(CardName.BARGE_TOAD);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);

        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      });

      it("should gain 2 TWIG if one FARM in city", () => {
        const card = Card.fromName(CardName.BARGE_TOAD);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        player.addToCity(gameState, CardName.FARM);

        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
      });

      it("should gain 2 TWIG per FARM in city", () => {
        const card = Card.fromName(CardName.BARGE_TOAD);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.FARM);

        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(8);
      });
    });

    describe(CardName.CASTLE, () => {
      it("should be worth 1 VP per common construction", () => {
        const card = Card.fromName(CardName.CASTLE);
        player.addToCity(gameState, card.name);
        expect(card.getPoints(player, gameState)).to.be(4);

        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.FARM);
        expect(card.getPoints(player, gameState)).to.be(4 + 3);
      });

      it("does not count unique constructions / critters", () => {
        const card = Card.fromName(CardName.CASTLE);
        player.addToCity(gameState, card.name);
        expect(card.getPoints(player, gameState)).to.be(4);

        player.addToCity(gameState, CardName.EVERTREE);
        player.addToCity(gameState, CardName.PALACE);
        player.addToCity(gameState, CardName.DUNGEON);
        expect(card.getPoints(player, gameState)).to.be(4);

        player.addToCity(gameState, CardName.WIFE);
        player.addToCity(gameState, CardName.RANGER);
        player.addToCity(gameState, CardName.QUEEN);
        expect(card.getPoints(player, gameState)).to.be(4);
      });
    });

    describe(CardName.CEMETARY, () => {
      it("allow player to play one revealed card from deck", () => {
        player.addToCity(gameState, CardName.CEMETARY);

        // Add some cards to make sure we only give player valid options.
        player.addToCity(gameState, CardName.UNIVERSITY);
        player.addToCity(gameState, CardName.KING);
        player.addToCity(gameState, CardName.FARM);

        // Add some cards to the discard pile.
        gameState.discardPile.addToStack(CardName.FARM);
        gameState.discardPile.addToStack(CardName.FARM);
        gameState.discardPile.addToStack(CardName.FARM);
        gameState.discardPile.addToStack(CardName.FARM);

        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.QUEEN);
        gameState.deck.addToStack(CardName.FARM);
        gameState.deck.addToStack(CardName.UNIVERSITY);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.QUEEN)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.CEMETARY),
            },
          },
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            options: ["Deck", "Discard Pile"],
            cardContext: CardName.CEMETARY,
            clientOptions: {
              selectedOption: "Deck",
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.SELECT_OPTION_GENERIC,
            cardContext: CardName.CEMETARY,
            cardOptions: [CardName.FARM, CardName.QUEEN],
            cardOptionsUnfiltered: [
              CardName.UNIVERSITY,
              CardName.FARM,
              CardName.QUEEN,
              CardName.KING,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.QUEEN],
            },
          },
        ]);

        expect(player.hasCardInCity(CardName.QUEEN)).to.be(true);
      });

      it("allow player to play FOOL even if they already have one in their city", () => {
        player.addToCity(gameState, CardName.CEMETARY);

        let targetPlayer = gameState.players[1];

        // Add some cards to make sure we only give player valid options.
        player.addToCity(gameState, CardName.UNIVERSITY);
        player.addToCity(gameState, CardName.KING);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.FOOL);

        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.QUEEN);
        gameState.deck.addToStack(CardName.FOOL);
        gameState.deck.addToStack(CardName.UNIVERSITY);

        expect(player.numAvailableWorkers).to.be(2);
        expect(gameState.discardPile.length).to.be(0);
        expect(player.hasCardInCity(CardName.FOOL)).to.be(true);
        expect(targetPlayer.hasCardInCity(CardName.FOOL)).to.be(false);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.CEMETARY),
              },
            },
            {
              inputType: GameInputType.SELECT_CARDS,
              prevInputType: GameInputType.SELECT_OPTION_GENERIC,
              cardContext: CardName.CEMETARY,
              cardOptions: [CardName.FOOL, CardName.QUEEN],
              cardOptionsUnfiltered: [
                CardName.UNIVERSITY,
                CardName.FOOL,
                CardName.QUEEN,
                CardName.KING,
              ],
              maxToSelect: 1,
              minToSelect: 1,
              clientOptions: {
                selectedCards: [CardName.FOOL],
              },
            },
          ],
          { autoAdvance: true }
        );

        targetPlayer = gameState.getPlayer(targetPlayer.playerId);
        expect(player.hasCardInCity(CardName.FOOL)).to.be(true);
        expect(targetPlayer.hasCardInCity(CardName.FOOL)).to.be(true);
      });

      it("skip card selection if none are playable", () => {
        player.addToCity(gameState, CardName.CEMETARY);

        // Add some cards to make sure we only give player valid options.
        player.addToCity(gameState, CardName.UNIVERSITY);
        player.addToCity(gameState, CardName.KING);

        // Add some cards to the discard pile.
        gameState.discardPile.addToStack(CardName.FARM);
        gameState.discardPile.addToStack(CardName.FARM);
        gameState.discardPile.addToStack(CardName.FARM);
        gameState.discardPile.addToStack(CardName.FARM);

        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.KING);

        expect(player.numAvailableWorkers).to.be(2);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.CEMETARY),
            },
          },
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            options: ["Deck", "Discard Pile"],
            cardContext: CardName.CEMETARY,
            clientOptions: {
              selectedOption: "Deck",
            },
          },
        ]);
      });

      it("should auto advance if there aren't any cards in the discard pile", () => {
        player.addToCity(gameState, CardName.CEMETARY);

        expect(gameState.discardPile.length).to.be(0);
        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.QUEEN)).to.be(false);

        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.QUEEN);
        gameState.deck.addToStack(CardName.FARM);
        gameState.deck.addToStack(CardName.UNIVERSITY);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.QUEEN)).to.be(false);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.CEMETARY),
              },
            },
            {
              inputType: GameInputType.SELECT_CARDS,
              prevInputType: GameInputType.SELECT_OPTION_GENERIC,
              cardContext: CardName.CEMETARY,
              cardOptions: [
                CardName.UNIVERSITY,
                CardName.FARM,
                CardName.QUEEN,
                CardName.KING,
              ],
              cardOptionsUnfiltered: [
                CardName.UNIVERSITY,
                CardName.FARM,
                CardName.QUEEN,
                CardName.KING,
              ],
              maxToSelect: 1,
              minToSelect: 1,
              clientOptions: {
                selectedCards: [CardName.QUEEN],
              },
            },
          ],
          { autoAdvance: true }
        );

        expect(player.hasCardInCity(CardName.QUEEN)).to.be(true);
      });

      it("should not allow discard pile as an option if there aren't any cards there", () => {
        player.addToCity(gameState, CardName.CEMETARY);

        expect(gameState.discardPile.length).to.be(0);
        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.QUEEN)).to.be(false);

        expect(() => {
          multiStepGameInputTest(gameState, [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.CEMETARY),
              },
            },
            {
              inputType: GameInputType.SELECT_OPTION_GENERIC,
              prevInputType: GameInputType.VISIT_DESTINATION_CARD,
              options: ["Deck"],
              cardContext: CardName.CEMETARY,
              clientOptions: {
                selectedOption: "Discard Pile",
              },
            },
          ]);
        }).to.throwException(/Please select one of the options/i);
      });

      it("should choose top 4 cards from discard", () => {
        player.addToCity(gameState, CardName.CEMETARY);

        // Add some cards to make sure we only give player valid options.
        player.addToCity(gameState, CardName.UNIVERSITY);
        player.addToCity(gameState, CardName.KING);
        player.addToCity(gameState, CardName.FARM);

        // Add some cards to the discard pile. Adding 5th card to ensure we pick
        // the top 4 cards
        gameState.discardPile.addToStack(CardName.HUSBAND);
        gameState.discardPile.addToStack(CardName.WIFE);
        gameState.discardPile.addToStack(CardName.DUNGEON);
        gameState.discardPile.addToStack(CardName.RANGER);
        gameState.discardPile.addToStack(CardName.FARM);

        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.QUEEN);
        gameState.deck.addToStack(CardName.FARM);
        gameState.deck.addToStack(CardName.UNIVERSITY);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.QUEEN)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.CEMETARY),
            },
          },
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            options: ["Deck", "Discard Pile"],
            cardContext: CardName.CEMETARY,
            clientOptions: {
              selectedOption: "Discard Pile",
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.SELECT_OPTION_GENERIC,
            cardContext: CardName.CEMETARY,
            cardOptions: [
              CardName.FARM,
              CardName.RANGER,
              CardName.DUNGEON,
              CardName.WIFE,
            ],
            cardOptionsUnfiltered: [
              CardName.FARM,
              CardName.RANGER,
              CardName.DUNGEON,
              CardName.WIFE,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.WIFE],
            },
          },
        ]);

        expect(player.hasCardInCity(CardName.WIFE)).to.be(true);
      });
    });

    describe(CardName.CHAPEL, () => {
      it("when player visits, should add a VP and give 2 cards per VP on Chapel", () => {
        let player = gameState.getActivePlayer();
        const card = Card.fromName(CardName.CHAPEL);

        player.addToCity(gameState, CardName.CHAPEL);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getFirstPlayedCard(CardName.CHAPEL)).to.eql({
          cardName: CardName.CHAPEL,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          workers: [],
          resources: { [ResourceType.VP]: 0 },
        });

        let chapelInfo = player.getFirstPlayedCard(CardName.CHAPEL);
        let chapelResources = chapelInfo.resources || { [ResourceType.VP]: 0 };
        let numVP = chapelResources[ResourceType.VP] || 0;
        expect(numVP).to.be(0);
        expect(player.numCardsInHand).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.CHAPEL),
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.numCardsInHand).to.be(2);

        chapelInfo = player.getFirstPlayedCard(CardName.CHAPEL);
        chapelResources = chapelInfo.resources || { [ResourceType.VP]: 0 };
        numVP = chapelResources[ResourceType.VP] || 0;
        expect(numVP).to.be(1);
      });

      it("should give additional cards when Chapel has already has VP on it", () => {
        let player = gameState.getActivePlayer();
        const card = Card.fromName(CardName.CHAPEL);

        player.addToCity(gameState, CardName.CHAPEL);
        let chapelInfo = player.getFirstPlayedCard(CardName.CHAPEL);
        let chapelResources = chapelInfo.resources || { [ResourceType.VP]: 0 };
        chapelResources[ResourceType.VP] = 1;

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getFirstPlayedCard(CardName.CHAPEL)).to.eql({
          cardName: CardName.CHAPEL,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          workers: [],
          resources: { [ResourceType.VP]: 1 },
        });

        let numVP = chapelResources[ResourceType.VP] || 0;
        expect(numVP).to.be(1);
        expect(player.numCardsInHand).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.CHAPEL),
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.numCardsInHand).to.be(4);

        chapelInfo = player.getFirstPlayedCard(CardName.CHAPEL);
        chapelResources = chapelInfo.resources || { [ResourceType.VP]: 0 };
        numVP = chapelResources[ResourceType.VP] || 0;
        expect(numVP).to.be(2);
      });
    });

    describe(CardName.CHIP_SWEEP, () => {
      it("should do nothing if only the CHIP_SWEEP is played", () => {
        const card = Card.fromName(CardName.CHIP_SWEEP);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);
        expect(player.hasCardInCity(card.name)).to.be(false);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);

        expect(player.hasCardInCity(card.name)).to.be(true);
      });

      it("should allow the player to select a card to play", () => {
        const card = Card.fromName(CardName.CHIP_SWEEP);

        player.addToCity(gameState, CardName.MINE);
        player.addToCity(gameState, CardName.FARM);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.CHIP_SWEEP,
            maxToSelect: 1,
            minToSelect: 1,
            cardOptions: [
              ...player.getPlayedCardForCardName(CardName.MINE),
              ...player.getPlayedCardForCardName(CardName.FARM),
            ],
            clientOptions: {
              selectedCards: player.getPlayedCardForCardName(CardName.MINE),
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
      });

      it("should not allow the player to copy their HUSBAND (if they are missing a WIFE AND FARM)", () => {
        const card = Card.fromName(CardName.CHIP_SWEEP);

        player.addToCity(gameState, CardName.HUSBAND);
        player.addToCity(gameState, CardName.FARM);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);
        expect(player.hasCardInCity(card.name)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.CHIP_SWEEP,
            maxToSelect: 1,
            minToSelect: 1,
            cardOptions: [...player.getPlayedCardForCardName(CardName.FARM)],
            clientOptions: {
              selectedCards: player.getPlayedCardForCardName(CardName.FARM),
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });
    });

    describe(CardName.CLOCK_TOWER, () => {
      it("should not prompt user to activate CLOCK_TOWER if no applicable workers", () => {
        player.addToCity(gameState, CardName.CLOCK_TOWER);
        expect(player.currentSeason).to.be(Season.WINTER);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        // Use up all workers
        gameState.locationsMap[LocationName.HAVEN] = [
          player.playerId,
          player.playerId,
        ];

        player.placeWorkerOnLocation(LocationName.HAVEN);
        player.placeWorkerOnLocation(LocationName.HAVEN);

        [player, gameState] = multiStepGameInputTest(gameState, [
          { inputType: GameInputType.PREPARE_FOR_SEASON },
        ]);

        expect(player.getFirstPlayedCard(CardName.CLOCK_TOWER)).to.eql({
          cardName: CardName.CLOCK_TOWER,
          cardOwnerId: player.playerId,
          resources: {
            [ResourceType.VP]: 3,
          },
          usedForCritter: false,
        });
      });

      it("should prompt user to activate CLOCK_TOWER before recalling workers", () => {
        player.addToCity(gameState, CardName.CLOCK_TOWER);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.MINE);
        player.addToCity(gameState, CardName.MINE);
        expect(player.currentSeason).to.be(Season.WINTER);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        // Use up all workers
        gameState.locationsMap[LocationName.FOREST_TWO_WILD] = [
          player.playerId,
        ];
        gameState.locationsMap[LocationName.BASIC_ONE_BERRY]!.push(
          player.playerId
        );
        player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
        player.placeWorkerOnLocation(LocationName.FOREST_TWO_WILD);

        const [playerNoActivate, gameStateNoActivate] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.PREPARE_FOR_SEASON,
            },
            {
              cardContext: CardName.CLOCK_TOWER,
              inputType: GameInputType.SELECT_WORKER_PLACEMENT,
              mustSelectOne: false,
              options: [
                {
                  location: LocationName.BASIC_ONE_BERRY,
                },
                {
                  location: LocationName.FOREST_TWO_WILD,
                },
              ],
              clientOptions: {
                selectedOption: null,
              },
              prevInputType: GameInputType.PREPARE_FOR_SEASON,
            },
          ]
        );
        expect(
          playerNoActivate.getNumResourcesByType(ResourceType.BERRY)
        ).to.be(2);
        expect(
          playerNoActivate.getNumResourcesByType(ResourceType.PEBBLE)
        ).to.be(2);
        expect(playerNoActivate.numAvailableWorkers).to.be(3);
        expect(
          playerNoActivate.getPlayedCardForCardName(CardName.CLOCK_TOWER)?.[0]
        ).to.eql({
          cardName: CardName.CLOCK_TOWER,
          cardOwnerId: playerNoActivate.playerId,
          resources: {
            [ResourceType.VP]: 3,
          },
          usedForCritter: false,
        });

        const [
          playerWithActivate,
          gameStateWithActivate,
        ] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.PREPARE_FOR_SEASON,
          },
          {
            cardContext: CardName.CLOCK_TOWER,
            inputType: GameInputType.SELECT_WORKER_PLACEMENT,
            mustSelectOne: false,
            options: [
              {
                location: LocationName.BASIC_ONE_BERRY,
              },
              {
                location: LocationName.FOREST_TWO_WILD,
              },
            ],
            clientOptions: {
              selectedOption: {
                location: LocationName.FOREST_TWO_WILD,
              },
            },
            prevInputType: GameInputType.PREPARE_FOR_SEASON,
          },
          {
            inputType: GameInputType.SELECT_RESOURCES,
            toSpend: false,
            prevInputType: GameInputType.PLACE_WORKER,
            locationContext: LocationName.FOREST_TWO_WILD,
            maxResources: 2,
            minResources: 2,
            clientOptions: {
              resources: {
                [ResourceType.BERRY]: 2,
              },
            },
          },
        ]);
        expect(
          playerWithActivate.getNumResourcesByType(ResourceType.BERRY)
        ).to.be(4);
        expect(
          playerWithActivate.getNumResourcesByType(ResourceType.PEBBLE)
        ).to.be(2);
        expect(playerWithActivate.numAvailableWorkers).to.be(3);
        expect(
          playerWithActivate.getPlayedCardForCardName(CardName.CLOCK_TOWER)?.[0]
        ).to.eql({
          cardName: CardName.CLOCK_TOWER,
          cardOwnerId: playerWithActivate.playerId,
          resources: {
            [ResourceType.VP]: 2,
          },
          usedForCritter: false,
        });
      });

      it("should work with multiple multi-step productions", () => {
        player.addToCity(gameState, CardName.CLOCK_TOWER);
        player.addToCity(gameState, CardName.TEACHER);
        player.addToCity(gameState, CardName.CHIP_SWEEP);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.HUSBAND);
        player.addToCity(gameState, CardName.WIFE);
        expect(player.currentSeason).to.be(Season.WINTER);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        // Stack the deck with Teachers
        gameState.replenishMeadow();
        gameState.deck.addToStack(CardName.TEACHER);
        gameState.deck.addToStack(CardName.SHOPKEEPER);

        // Use up all workers
        gameState.locationsMap[LocationName.BASIC_ONE_BERRY]!.push(
          player.playerId,
          player.playerId
        );
        player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);
        player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);

        let intermediateGameState = gameState.next({
          inputType: GameInputType.PREPARE_FOR_SEASON,
        });

        const clockTowerInput = {
          cardContext: CardName.CLOCK_TOWER,
          inputType: GameInputType.SELECT_WORKER_PLACEMENT as const,
          prevInputType: GameInputType.PREPARE_FOR_SEASON,
          mustSelectOne: false,
          options: [
            {
              location: LocationName.BASIC_ONE_BERRY,
            },
            {
              location: LocationName.BASIC_ONE_BERRY,
            },
          ],
          clientOptions: {
            selectedOption: {
              location: LocationName.BASIC_ONE_BERRY,
            },
          },
        };

        const husbandInput = {
          inputType: GameInputType.SELECT_OPTION_GENERIC as const,
          prevInputType: GameInputType.SELECT_WORKER_PLACEMENT,
          cardContext: CardName.HUSBAND,
          options: [
            ResourceType.BERRY,
            ResourceType.TWIG,
            ResourceType.RESIN,
            ResourceType.PEBBLE,
          ],
          clientOptions: {
            selectedOption: ResourceType.BERRY,
          },
        };

        const chipSweepInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.SELECT_WORKER_PLACEMENT,
          cardContext: CardName.CHIP_SWEEP,
          maxToSelect: 1,
          minToSelect: 1,
          cardOptions: [
            ...player.getPlayedCardForCardName(CardName.TEACHER),
            ...player.getPlayedCardForCardName(CardName.FARM),
            ...player.getPlayedCardForCardName(CardName.HUSBAND),
          ],
          clientOptions: {
            selectedCards: player.getPlayedCardForCardName(CardName.FARM),
          },
        };

        const teacherInput = {
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.SELECT_WORKER_PLACEMENT,
          cardContext: CardName.TEACHER,
          cardOptions: [CardName.SHOPKEEPER, CardName.TEACHER],
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [CardName.TEACHER],
          },
        };

        const teacherSelectPlayerInput = {
          inputType: GameInputType.SELECT_PLAYER as const,
          prevInputType: GameInputType.SELECT_CARDS,
          prevInput: teacherInput,
          cardContext: CardName.TEACHER,
          playerOptions: [gameState.players[1].playerId],
          mustSelectOne: true,
          clientOptions: {
            selectedPlayer: gameState.players[1].playerId,
          },
        };
        intermediateGameState = intermediateGameState.next(clockTowerInput);
        intermediateGameState = intermediateGameState.next(husbandInput);
        intermediateGameState = intermediateGameState.next(chipSweepInput);
        intermediateGameState = intermediateGameState.next(
          teacherInput,
          false /* autoAdvance */
        );
        intermediateGameState = intermediateGameState.next(
          teacherSelectPlayerInput,
          false /* autoAdvance */
        );

        player = intermediateGameState.getPlayer(player.playerId);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(4);
        expect(player.numAvailableWorkers).to.be(3);
        expect(player.cardsInHand).to.eql([CardName.TEACHER]);
        expect(
          player.getPlayedCardForCardName(CardName.CLOCK_TOWER)?.[0]
        ).to.eql({
          cardName: CardName.CLOCK_TOWER,
          cardOwnerId: player.playerId,
          resources: {
            [ResourceType.VP]: 2,
          },
          usedForCritter: false,
        });
      });
    });

    describe(CardName.COURTHOUSE, () => {
      it("should do nothing is player plays a critter", () => {
        player.addToCity(gameState, CardName.COURTHOUSE);

        const cardToPlay = Card.fromName(CardName.HUSBAND);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);
        multiStepGameInputTest(gameState, [playCardInput(cardToPlay.name)]);
      });

      it("should ask to gain a non berry resource after a construction is played", () => {
        player.addToCity(gameState, CardName.COURTHOUSE);

        const cardToPlay = Card.fromName(CardName.FARM);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.COURTHOUSE,
            options: ["TWIG", "RESIN", "PEBBLE"],
            clientOptions: {
              selectedOption: "PEBBLE",
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });
    });

    describe(CardName.CRANE, () => {
      it("should make constructions 3 cheaper", () => {
        player.addToCity(gameState, CardName.CRANE);
        player.addCardToHand(gameState, CardName.FARM);

        expect(() => {
          multiStepGameInputTest(gameState, [playCardInput(CardName.FARM)]);
        }).to.throwException(/can't spend/i);

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(CardName.FARM, {
              paymentOptions: {
                resources: {
                  [ResourceType.TWIG]: 0,
                  [ResourceType.RESIN]: 0,
                },
              },
            }),
          ]);
        }).to.throwException(/insufficient/i);

        expect(player.hasCardInCity(CardName.CRANE)).to.be(true);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(CardName.FARM, {
            paymentOptions: {
              cardToUse: CardName.CRANE,
              resources: {
                [ResourceType.TWIG]: 0,
                [ResourceType.RESIN]: 0,
              },
            },
          }),
        ]);

        expect(player.hasCardInCity(CardName.CRANE)).to.be(false);
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
      });

      it("cannot be used for critters", () => {
        player.addToCity(gameState, CardName.CRANE);
        player.addCardToHand(gameState, CardName.WIFE);

        expect(() => {
          multiStepGameInputTest(gameState, [playCardInput(CardName.WIFE)]);
        }).to.throwException(/can't spend/i);

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(CardName.WIFE, {
              paymentOptions: {
                resources: { [ResourceType.BERRY]: 0 },
              },
            }),
          ]);
        }).to.throwException(/insufficient/i);

        expect(player.hasCardInCity(CardName.CRANE)).to.be(true);

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(CardName.WIFE, {
              paymentOptions: {
                cardToUse: CardName.CRANE,
                resources: { [ResourceType.BERRY]: 0 },
              },
            }),
          ]);
        }).to.throwException(/not a construction/i);
      });
    });

    describe(CardName.DOCTOR, () => {
      it("should not prompt player if they don't have any berries", () => {
        const card = Card.fromName(CardName.DOCTOR);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);
        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(card.name)],
          {
            autoAdvance: true,
          }
        );

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      });

      it("should allow player to pay up to 3 berries for vp", () => {
        const card = Card.fromName(CardName.DOCTOR);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        // Make sure we can spend for vp
        player.gainResources(gameState, { [ResourceType.BERRY]: 3 });
        player.addCardToHand(gameState, card.name);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_RESOURCES,
            clientOptions: {
              resources: {
                [ResourceType.BERRY]: 3,
              },
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(3);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      });
    });

    describe(CardName.DUNGEON, () => {
      it("should allow players to play a card even if city is full", () => {
        const card = Card.fromName(CardName.DUNGEON);
        player.addToCity(gameState, card.name);
        player.addCardToHand(gameState, CardName.FARM);
        for (let i = 0; i < 14; i++) {
          player.addToCity(gameState, CardName.HUSBAND);
        }
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {
                [ResourceType.TWIG]: 0,
                [ResourceType.RESIN]: 0,
              },
              cardToDungeon: CardName.HUSBAND,
            },
          }),
        ]);
      });

      it("should NOT allow players to use DUNGEON with WANDERER if city is full", () => {
        const card = Card.fromName(CardName.DUNGEON);
        player.addToCity(gameState, card.name);
        player.addCardToHand(gameState, CardName.FARM);
        for (let i = 0; i < 14; i++) {
          player.addToCity(gameState, CardName.HUSBAND);
        }
        player.addToCity(gameState, CardName.WANDERER);
        expect(() => {
          [player, gameState] = multiStepGameInputTest(gameState, [
            playCardInput(CardName.FARM, {
              paymentOptions: {
                resources: {
                  [ResourceType.TWIG]: 0,
                  [ResourceType.RESIN]: 0,
                },
                cardToDungeon: CardName.WANDERER,
              },
            }),
          ]);
        }).to.throwException(/unable to add Farm/i);
      });

      it("should allow player to use DUNGEON with RANGER if first spot", () => {
        const card = Card.fromName(CardName.DUNGEON);
        player.addToCity(gameState, card.name);
        player.addToCity(gameState, CardName.RANGER);
        player.addCardToHand(gameState, CardName.FARM);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(CardName.FARM, {
            paymentOptions: {
              resources: {
                [ResourceType.TWIG]: 0,
                [ResourceType.RESIN]: 0,
              },
              cardToDungeon: CardName.RANGER,
            },
          }),
        ]);

        expect(player.hasCardInCity(CardName.RANGER)).to.be(false);
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          cardOwnerId: player.playerId,
          pairedCards: [CardName.RANGER],
          usedForCritter: false,
        });
      });

      it("should NOT allow player to use DUNGEON with RANGER if second spot", () => {
        const card = Card.fromName(CardName.DUNGEON);
        player.addToCity(gameState, card.name);
        player.updatePlayedCard(
          gameState,
          player.getFirstPlayedCard(card.name),
          {
            pairedCards: [CardName.WIFE],
          }
        );

        player.addToCity(gameState, CardName.RANGER);
        player.addToCity(gameState, CardName.BARGE_TOAD);
        player.addCardToHand(gameState, CardName.FARM);
        expect(() => {
          [player, gameState] = multiStepGameInputTest(gameState, [
            playCardInput(CardName.FARM, {
              paymentOptions: {
                resources: {
                  [ResourceType.TWIG]: 0,
                  [ResourceType.RESIN]: 0,
                },
                cardToDungeon: CardName.RANGER,
              },
            }),
          ]);
        }).to.throwException(/Cannot use Ranger in second spot of the Dungeon/);
      });

      it("should NOT allow player to use 2nd spot in DUNGEON if only critter in city is RANGER", () => {
        const card = Card.fromName(CardName.DUNGEON);
        player.addToCity(gameState, card.name);
        player.updatePlayedCard(
          gameState,
          player.getFirstPlayedCard(card.name),
          {
            pairedCards: [CardName.WIFE],
          }
        );

        player.addToCity(gameState, CardName.RANGER);
        player.addCardToHand(gameState, CardName.FARM);
        expect(() => {
          [player, gameState] = multiStepGameInputTest(gameState, [
            playCardInput(CardName.FARM, {
              paymentOptions: {
                resources: {
                  [ResourceType.TWIG]: 0,
                  [ResourceType.RESIN]: 0,
                },
                cardToDungeon: CardName.RANGER,
              },
            }),
          ]);
        }).to.throwException(/Unable to invoke Dungeon/);
      });

      it("should NOT allow player to use DUNGEON more than twice", () => {
        const card = Card.fromName(CardName.DUNGEON);
        player.addToCity(gameState, card.name);
        player.addToCity(gameState, CardName.RANGER);
        player.addToCity(gameState, CardName.BARGE_TOAD);
        player.updatePlayedCard(
          gameState,
          player.getFirstPlayedCard(card.name),
          {
            pairedCards: [CardName.WIFE, CardName.HUSBAND],
          }
        );

        player.addCardToHand(gameState, CardName.FARM);
        expect(() => {
          [player, gameState] = multiStepGameInputTest(gameState, [
            playCardInput(CardName.FARM, {
              paymentOptions: {
                resources: {
                  [ResourceType.TWIG]: 0,
                  [ResourceType.RESIN]: 0,
                },
                cardToDungeon: CardName.BARGE_TOAD,
              },
            }),
          ]);
        }).to.throwException(/Unable to invoke Dungeon/);
      });
    });

    describe(CardName.EVERTREE, () => {
      it("should be worth 1 extra point per purple card", () => {
        player.addToCity(gameState, CardName.EVERTREE);
        const card = Card.fromName(CardName.EVERTREE);
        expect(card.getPoints(player, gameState)).to.be(5 + 1);

        player.addToCity(gameState, CardName.WIFE);
        expect(card.getPoints(player, gameState)).to.be(5 + 2);

        player.addToCity(gameState, CardName.PALACE);
        expect(card.getPoints(player, gameState)).to.be(5 + 3);

        player.addToCity(gameState, CardName.UNIVERSITY);
        expect(card.getPoints(player, gameState)).to.be(5 + 3);
      });
    });

    describe(CardName.FAIRGROUNDS, () => {
      it("draws player 2 CARD when played", () => {
        const card = Card.fromName(CardName.FAIRGROUNDS);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        expect(player.numCardsInHand).to.be(1);
        expect(player.hasCardInCity(card.name)).to.be(false);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);
        expect(player.numCardsInHand).to.be(2);
        expect(player.hasCardInCity(card.name)).to.be(true);
      });
    });

    describe(CardName.FARM, () => {
      it("should have card to play it", () => {
        const card = Card.fromName(CardName.FARM);
        const gameInput = playCardInput(card.name);
        player.gainResources(gameState, card.baseCost);

        expect(card.canPlay(gameState, gameInput)).to.be(false);
        player.addCardToHand(gameState, card.name);
        expect(card.canPlay(gameState, gameInput)).to.be(true);
      });

      it("should remove card from hand after playing it", () => {
        const card = Card.fromName(CardName.FARM);
        const gameInput = playCardInput(card.name);
        player.gainResources(gameState, card.baseCost);

        expect(card.canPlay(gameState, gameInput)).to.be(false);
        player.addCardToHand(gameState, card.name);
        expect(card.canPlay(gameState, gameInput)).to.be(true);

        expect(player.cardsInHand).to.not.eql([]);
        [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);
        expect(player.cardsInHand).to.eql([]);
      });

      it("should spend resources after playing it", () => {
        const card = Card.fromName(CardName.FARM);
        const gameInput = playCardInput(card.name);

        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
        player.gainResources(gameState, card.baseCost);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);

        player.addCardToHand(gameState, card.name);
        expect(card.canPlay(gameState, gameInput)).to.be(true);

        [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);

        expect(player.cardsInHand).to.eql([]);
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      });

      it("should gain 1 berry when played", () => {
        const card = Card.fromName(CardName.FARM);
        const gameInput = playCardInput(card.name);

        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });
    });

    describe(CardName.FOOL, () => {
      it("should allow the player to select player to target", () => {
        const targetPlayerId = gameState.players[1].playerId;
        const card = Card.fromName(CardName.FOOL);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.FOOL,
            mustSelectOne: true,
            playerOptions: [targetPlayerId],
            clientOptions: {
              selectedPlayer: targetPlayerId,
            },
          },
        ]);

        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(
          gameState.getPlayer(targetPlayerId).hasCardInCity(card.name)
        ).to.be(true);
      });

      it("should auto advance player selection if only 1 option", () => {
        const targetPlayerId = gameState.players[1].playerId;
        const card = Card.fromName(CardName.FOOL);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(card.name)],
          { autoAdvance: true }
        );

        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(
          gameState.getPlayer(targetPlayerId).hasCardInCity(card.name)
        ).to.be(true);
      });

      it("should not allow the player to select player with no available city spaces", () => {
        gameState = testInitialGameState({ numPlayers: 3 });
        const player = gameState.getActivePlayer();
        const targetPlayerId = gameState.players[1].playerId;
        const targetPlayer = gameState.getPlayer(targetPlayerId);
        const player3 = gameState.players[2].playerId;
        const card = Card.fromName(CardName.FOOL);

        targetPlayer.addToCityMulti(gameState, [
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
        ]);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        gameState = gameState.next(
          playCardInput(card.name),
          false /* autoAdvance */
        );

        expect(() => {
          gameState.next({
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.FOOL,
            mustSelectOne: true,
            playerOptions: [targetPlayerId, player3],
            clientOptions: {
              selectedPlayer: targetPlayerId,
            },
          });
        }).to.throwException(/invalid/i);
      });

      it("should not allow the player to select player who already has a FOOL in city", () => {
        gameState = testInitialGameState({ numPlayers: 3 });
        const player = gameState.getActivePlayer();
        const targetPlayerId = gameState.players[1].playerId;
        const targetPlayer = gameState.getPlayer(targetPlayerId);
        const player3 = gameState.players[2].playerId;
        const card = Card.fromName(CardName.FOOL);

        targetPlayer.addToCity(gameState, card.name);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        gameState = gameState.next(
          playCardInput(card.name),
          false /* autoAdvance */
        );

        expect(() => {
          gameState.next({
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.FOOL,
            mustSelectOne: true,
            playerOptions: [targetPlayerId, player3],
            clientOptions: {
              selectedPlayer: targetPlayerId,
            },
          });
        }).to.throwException(/invalid/i);
      });
    });

    describe(CardName.GENERAL_STORE, () => {
      it("should gain 1 berry when played (w/o farm)", () => {
        const card = Card.fromName(CardName.GENERAL_STORE);
        const gameInput = playCardInput(card.name);

        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });

      it("should gain 2 berries when played (w farm)", () => {
        const card = Card.fromName(CardName.GENERAL_STORE);
        const gameInput = playCardInput(card.name);

        player.addToCity(gameState, CardName.FARM);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      });
    });

    describe(CardName.HISTORIAN, () => {
      it("should draw a card if player plays a construction", () => {
        player.addToCity(gameState, CardName.HISTORIAN);

        const cardToPlay = Card.fromName(CardName.MINE);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        gameState.deck.addToStack(CardName.KING);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
        ]);

        expect(player.cardsInHand).to.eql([CardName.KING]);
      });

      it("should draw a card if player plays a critter", () => {
        player.addToCity(gameState, CardName.HISTORIAN);

        const cardToPlay = Card.fromName(CardName.SHOPKEEPER);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        gameState.deck.addToStack(CardName.KING);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
        ]);

        expect(player.cardsInHand).to.eql([CardName.KING]);
      });

      it("should not draw a card when the player plays the historian", () => {
        const cardToPlay = Card.fromName(CardName.HISTORIAN);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
        ]);
        expect(player.cardsInHand).to.eql([]);
      });
    });

    describe(CardName.HUSBAND, () => {
      it("should do nothing if there's no available wife", () => {
        const card = Card.fromName(CardName.HUSBAND);
        // Add husband & wife to city
        player.addToCity(gameState, CardName.WIFE);
        player.addToCity(gameState, CardName.HUSBAND);

        player.addCardToHand(gameState, CardName.HUSBAND);
        player.gainResources(gameState, card.baseCost);
        multiStepGameInputTest(gameState, [playCardInput(card.name)]);
      });

      it("should gain a wild resource if there's a available wife and farm in city", () => {
        const card = Card.fromName(CardName.HUSBAND);

        player.addCardToHand(gameState, CardName.HUSBAND);
        player.addToCity(gameState, CardName.WIFE);
        player.addToCity(gameState, CardName.FARM);
        player.gainResources(gameState, card.baseCost);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.HUSBAND,
            options: [
              ResourceType.BERRY,
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.PEBBLE,
            ],
            clientOptions: {
              selectedOption: ResourceType.BERRY,
            },
          },
        ]);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });
    });

    describe(CardName.INN, () => {
      it("should allow player buy card from meadow without spending resources if cost is <= 3", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK,
        ];
        gameState = testInitialGameState({ meadowCards: cards });
        gameState.deck.addToStack(CardName.WIFE);

        const idx = gameState.meadowCards.indexOf(CardName.WIFE);
        expect(idx).to.be(-1);
        expect(gameState.meadowCards.length).to.be(8);

        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.INN);

        player.addToCity(gameState, CardName.INN);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getFirstPlayedCard(CardName.INN)).to.eql({
          cardName: CardName.INN,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          workers: [],
        });
        expect(player.hasCardInCity(CardName.QUEEN)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.INN),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.INN,
            cardOptions: [
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.MONK,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.FARM],
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

        // Meadow should be replenished
        expect(gameState.meadowCards.length).to.be(8);
        const wifeInMeadow = gameState.meadowCards.indexOf(CardName.WIFE) >= 0;
        expect(wifeInMeadow).to.be(true);
      });

      it("should allow player buy card from meadow if cost is > 3", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK,
        ];
        gameState = testInitialGameState({ meadowCards: cards });
        gameState.deck.addToStack(CardName.RANGER);

        const idx = gameState.meadowCards.indexOf(CardName.RANGER);
        expect(idx).to.be(-1);

        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.INN);

        // Make sure we can play this card
        player.gainResources(gameState, { [ResourceType.BERRY]: 4 });
        player.addToCity(gameState, CardName.INN);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.QUEEN)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(4);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.INN),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.INN,
            cardOptions: [
              CardName.KING,
              CardName.QUEEN,
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.MONK,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.QUEEN],
            },
          },
          {
            inputType: GameInputType.SELECT_PAYMENT_FOR_CARD,
            prevInputType: GameInputType.SELECT_CARDS,
            cardContext: card.name,
            card: CardName.QUEEN,
            clientOptions: {
              card: CardName.QUEEN,
              paymentOptions: {
                resources: {
                  [ResourceType.BERRY]: 2,
                },
                cardToUse: CardName.INN,
              },
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.hasCardInCity(CardName.QUEEN)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);

        const rangerInMeadow =
          gameState.meadowCards.indexOf(CardName.RANGER) >= 0;
        expect(rangerInMeadow).to.be(true);
      });

      it("should not allow player to buy unplayable card from meadow", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK,
        ];

        gameState = testInitialGameState({ meadowCards: cards });
        const player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.INN);

        // Make sure we can play this card
        player.gainResources(gameState, { [ResourceType.BERRY]: 4 });
        player.addToCity(gameState, CardName.INN);
        // Already have QUEEN & KING in city.
        player.addToCity(gameState, CardName.QUEEN);
        player.addToCity(gameState, CardName.KING);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(4);

        expect(() => {
          multiStepGameInputTest(gameState, [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.INN),
              },
            },
            {
              inputType: GameInputType.SELECT_CARDS,
              prevInputType: GameInputType.VISIT_DESTINATION_CARD,
              cardContext: CardName.INN,
              cardOptions: [
                CardName.POSTAL_PIGEON,
                CardName.POSTAL_PIGEON,
                CardName.FARM,
                CardName.HUSBAND,
                CardName.MONK,
              ],
              maxToSelect: 1,
              minToSelect: 1,
              clientOptions: {
                selectedCards: [CardName.QUEEN],
              },
            },
          ]);
        }).to.throwException(/Selected card is not a valid option/i);
      });

      it("should allow player buy card using another player's inn", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK,
        ];
        gameState = testInitialGameState({ meadowCards: cards });
        gameState.deck.addToStack(CardName.DOCTOR);

        const idx = gameState.meadowCards.indexOf(CardName.DOCTOR);
        expect(idx).to.be(-1);

        let player = gameState.getActivePlayer();
        let player2 = gameState.players[1];

        const card = Card.fromName(CardName.INN);

        player2.addToCity(gameState, CardName.INN);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.QUEEN)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player2.getFirstPlayedCard(CardName.INN),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.INN,
            cardOptions: [
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.MONK,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.FARM],
            },
          },
        ]);

        player2 = gameState.getPlayer(player2.playerId);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
        expect(player2.getNumResourcesByType(ResourceType.VP)).to.be(1);

        const doctorInMeadow =
          gameState.meadowCards.indexOf(CardName.DOCTOR) >= 0;
        expect(doctorInMeadow).to.be(true);
      });

      it("should not allow player buy card in hand but not in meadow", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK,
        ];
        gameState = testInitialGameState({ meadowCards: cards });
        const player = gameState.getActivePlayer();

        // Make sure we can play this card
        player.addCardToHand(gameState, CardName.WIFE);
        player.addToCity(gameState, CardName.INN);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(false);

        gameState = gameState.next({
          inputType: GameInputType.VISIT_DESTINATION_CARD,
          clientOptions: {
            playedCard: player.getFirstPlayedCard(CardName.INN),
          },
        });

        expect(() => {
          gameState.next({
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.INN,
            cardOptions: [
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.MONK,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.WIFE],
            },
          });
        }).to.throwException(/Selected card is not a valid option/i);
      });

      it("should allow player to buy card that exists in hand and meadow", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.WIFE,
        ];
        gameState = testInitialGameState({ meadowCards: cards });
        let player = gameState.getActivePlayer();
        gameState.deck.addToStack(CardName.LOOKOUT);

        const idx = gameState.meadowCards.indexOf(CardName.LOOKOUT);
        expect(idx).to.be(-1);

        player.addToCity(gameState, CardName.INN);
        player.addCardToHand(gameState, CardName.WIFE);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.INN),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.INN,
            cardOptions: [
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.WIFE,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.WIFE],
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(true);

        const hasWifeInHand = player.cardsInHand.indexOf(CardName.WIFE) >= 0;
        expect(hasWifeInHand).to.be(true);

        const wifeInMeadow = gameState.meadowCards.indexOf(CardName.WIFE) >= 0;
        expect(wifeInMeadow).to.be(false);

        const lookoutInMeadow =
          gameState.meadowCards.indexOf(CardName.LOOKOUT) >= 0;
        expect(lookoutInMeadow).to.be(true);
      });

      it("should allow player to use both their inns", () => {
        const cards = [
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
        ];

        gameState = testInitialGameState({ meadowCards: cards });
        gameState.deck.addToStack(CardName.QUEEN);
        gameState.deck.addToStack(CardName.QUEEN);
        expect(gameState.meadowCards.length).to.be(8);

        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.INN);
        player.addToCity(gameState, CardName.INN);
        player.addToCity(gameState, CardName.INN);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getFirstPlayedCard(CardName.INN)).to.eql({
          cardName: CardName.INN,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          workers: [],
        });
        expect(player.hasCardInCity(CardName.FARM)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.INN),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.INN,
            cardOptions: [
              CardName.FARM,
              CardName.FARM,
              CardName.FARM,
              CardName.FARM,
              CardName.FARM,
              CardName.FARM,
              CardName.FARM,
              CardName.FARM,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.FARM],
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.getPlayedCardForCardName(CardName.FARM).length).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

        // Back to the same player's turn
        gameState.nextPlayer();

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getPlayedCardForCardName(CardName.INN)[1],
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.INN,
            cardOptions: [
              CardName.FARM,
              CardName.FARM,
              CardName.FARM,
              CardName.FARM,
              CardName.FARM,
              CardName.FARM,
              CardName.FARM,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.FARM],
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(0);
        expect(player.getPlayedCardForCardName(CardName.FARM).length).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      });
    });

    describe(CardName.INNKEEPER, () => {
      it("can be used to play a critter for 3 BERRY less", () => {
        const card = Card.fromName(CardName.WIFE);
        player.addToCity(gameState, CardName.INNKEEPER);
        player.addCardToHand(gameState, card.name);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(true);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name, {
            paymentOptions: {
              resources: { [ResourceType.BERRY]: 0 },
              cardToUse: CardName.INNKEEPER,
            },
          }),
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(false);
      });

      it("can be used to play a critter even if city is full", () => {
        const card = Card.fromName(CardName.WIFE);
        player.addToCity(gameState, CardName.INNKEEPER);
        player.addCardToHand(gameState, card.name);

        for (let i = 0; i < 14; i++) {
          player.addToCity(gameState, CardName.FARM);
        }

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumOccupiedSpacesInCity()).to.be(15);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(true);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name, {
            paymentOptions: {
              resources: { [ResourceType.BERRY]: 0 },
              cardToUse: CardName.INNKEEPER,
            },
          }),
        ]);

        expect(player.getNumOccupiedSpacesInCity()).to.be(15);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(false);
      });

      it("can be used to play a critter that cost more then 3 BERRY", () => {
        const card = Card.fromName(CardName.QUEEN);
        player.addToCity(gameState, CardName.INNKEEPER);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, { [ResourceType.BERRY]: 2 });

        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(true);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name, {
            paymentOptions: {
              resources: { [ResourceType.BERRY]: 2 },
              cardToUse: CardName.INNKEEPER,
            },
          }),
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(false);
      });

      it("cannot be used to play a construction", () => {
        const card = Card.fromName(CardName.FARM);
        player.addToCity(gameState, CardName.INNKEEPER);
        player.addCardToHand(gameState, card.name);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);

        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.INNKEEPER)).to.be(true);

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(card.name, {
              paymentOptions: {
                resources: {
                  [ResourceType.TWIG]: 0,
                  [ResourceType.RESIN]: 0,
                },
                cardToUse: CardName.INNKEEPER,
              },
            }),
          ]);
        }).to.throwException(/not a critter/i);
      });
    });

    xdescribe(CardName.JUDGE, () => {
      it("should have tests", () => {});
    });

    describe(CardName.KING, () => {
      it("should calculate the points correctly", () => {
        const card = Card.fromName(CardName.KING);
        expect(card.getPoints(player, gameState)).to.be(4);

        player.placeWorkerOnEvent(EventName.BASIC_FOUR_PRODUCTION);
        expect(card.getPoints(player, gameState)).to.be(4 + 1);

        player.placeWorkerOnEvent(EventName.SPECIAL_GRADUATION_OF_SCHOLARS);
        expect(card.getPoints(player, gameState)).to.be(4 + 1 + 2);
      });
    });

    describe(CardName.LOOKOUT, () => {
      it("should allow player to copy a basic location", () => {
        let player1 = gameState.getActivePlayer();
        player1.addToCity(gameState, CardName.LOOKOUT);

        expect(player1.numAvailableWorkers).to.be(2);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        // All cards player can't play
        gameState.clearMeadow();
        expect(gameState.meadowCards).to.eql([]);
        gameState.meadowCards.push(CardName.LOOKOUT);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player1.getFirstPlayedCard(CardName.LOOKOUT),
            },
          },
          {
            inputType: GameInputType.SELECT_LOCATION,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.LOOKOUT,
            locationOptions: gameState
              .getPlayableLocations({
                checkCanPlaceWorker: false,
              })
              .filter((name) => {
                const location = Location.fromName(name);
                return (
                  location.type === LocationType.BASIC ||
                  location.type === LocationType.FOREST
                );
              }),
            clientOptions: {
              selectedLocation: LocationName.BASIC_ONE_BERRY,
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);

        expect(player1.numAvailableWorkers).to.be(1);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });

      it("should allow player to copy a forest location", () => {
        gameState.locationsMap[LocationName.FOREST_TWO_BERRY_ONE_CARD] = [];
        let player1 = gameState.getActivePlayer();
        player1.addToCity(gameState, CardName.LOOKOUT);

        expect(player1.numAvailableWorkers).to.be(2);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player1.cardsInHand.length).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player1.getFirstPlayedCard(CardName.LOOKOUT),
            },
          },
          {
            inputType: GameInputType.SELECT_LOCATION,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.LOOKOUT,
            locationOptions: gameState
              .getPlayableLocations({
                checkCanPlaceWorker: false,
              })
              .filter((name) => {
                const location = Location.fromName(name);
                return (
                  location.type === LocationType.BASIC ||
                  location.type === LocationType.FOREST
                );
              }),
            clientOptions: {
              selectedLocation: LocationName.FOREST_TWO_BERRY_ONE_CARD,
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);

        expect(player1.numAvailableWorkers).to.be(1);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
        expect(player1.cardsInHand.length).to.be(1);
      });

      it("should only allow player to copy a playable forest location", () => {
        // simulate player not being able to visit this location:
        gameState.locationsMap[
          LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
        ] = [];
        gameState.locationsMap[
          LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD
        ] = [];

        const player1 = gameState.getActivePlayer();

        // Use first worker
        gameState.locationsMap[LocationName.BASIC_TWO_CARDS_AND_ONE_VP] = [
          player1.playerId,
        ];
        player1.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);

        player1.addToCity(gameState, CardName.LOOKOUT);

        expect(player1.numAvailableWorkers).to.be(1);
        expect(player1.cardsInHand.length).to.be(0);

        expect(() => {
          multiStepGameInputTest(gameState, [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player1.getFirstPlayedCard(CardName.LOOKOUT),
              },
            },
            {
              inputType: GameInputType.SELECT_LOCATION,
              prevInputType: GameInputType.VISIT_DESTINATION_CARD,
              cardContext: CardName.LOOKOUT,
              locationOptions: gameState
                .getPlayableLocations({
                  checkCanPlaceWorker: false,
                })
                .filter((name) => {
                  const location = Location.fromName(name);
                  return (
                    location.type === LocationType.BASIC ||
                    location.type === LocationType.FOREST
                  );
                }),
              clientOptions: {
                selectedLocation:
                  LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS,
              },
            },
          ]);
        }).to.throwException(/invalid location selected/i);
      });

      it("should allow player to copy FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD", () => {
        gameState.locationsMap[
          LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD
        ] = [];
        let player1 = gameState.getActivePlayer();
        player1.addToCity(gameState, CardName.LOOKOUT);
        player1.cardsInHand = [
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
        ];
        gameState.locationsMap[LocationName.BASIC_TWO_CARDS_AND_ONE_VP] = [
          player1.playerId,
        ];
        player1.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);

        expect(player1.numAvailableWorkers).to.be(1);
        expect(player1.cardsInHand.length).to.be(4);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player1.getFirstPlayedCard(CardName.LOOKOUT),
            },
          },
          {
            inputType: GameInputType.SELECT_LOCATION,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.LOOKOUT,
            locationOptions: gameState
              .getPlayableLocations({
                checkCanPlaceWorker: false,
              })
              .filter((name) => {
                const location = Location.fromName(name);
                return (
                  location.type === LocationType.BASIC ||
                  location.type === LocationType.FOREST
                );
              }),
            clientOptions: {
              selectedLocation:
                LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD,
            },
          },
          {
            inputType: GameInputType.DISCARD_CARDS,
            prevInputType: GameInputType.PLACE_WORKER,
            locationContext:
              LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD,
            minCards: 0,
            maxCards: 8,
            clientOptions: {
              cardsToDiscard: [
                CardName.FARM,
                CardName.FARM,
                CardName.FARM,
                CardName.FARM,
              ],
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);

        expect(player1.numAvailableWorkers).to.be(0);
        expect(player1.cardsInHand.length).to.be(8);
      });

      it("should allow player to copy location with a worker on it", () => {
        gameState.locationsMap[LocationName.FOREST_TWO_BERRY_ONE_CARD] = [];
        let player1 = gameState.getActivePlayer();
        player1.addToCity(gameState, CardName.LOOKOUT);

        expect(player1.numAvailableWorkers).to.be(2);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player1.cardsInHand.length).to.be(0);

        // note: placeWorkerOnLocation doesn't gain the placement bonus
        player1.placeWorkerOnLocation(LocationName.FOREST_TWO_BERRY_ONE_CARD);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player1.getFirstPlayedCard(CardName.LOOKOUT),
            },
          },
          {
            inputType: GameInputType.SELECT_LOCATION,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.LOOKOUT,
            locationOptions: gameState
              .getPlayableLocations({
                checkCanPlaceWorker: false,
              })
              .filter((name) => {
                const location = Location.fromName(name);
                return (
                  location.type === LocationType.BASIC ||
                  location.type === LocationType.FOREST
                );
              }),
            clientOptions: {
              selectedLocation: LocationName.FOREST_TWO_BERRY_ONE_CARD,
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);

        expect(player1.numAvailableWorkers).to.be(0);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
        expect(player1.cardsInHand.length).to.be(1);
      });

      it("should allow player to copy a location with their worker on it (in a 4 player game)", () => {
        gameState = testInitialGameState({ numPlayers: 4 });
        gameState.locationsMap[LocationName.FOREST_TWO_BERRY_ONE_CARD] = [];

        let player1 = gameState.getActivePlayer();
        player1.addToCity(gameState, CardName.LOOKOUT);

        expect(player1.numAvailableWorkers).to.be(2);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player1.cardsInHand.length).to.be(0);

        // note: placeWorkerOnLocation doesn't gain the placement bonus
        player1.placeWorkerOnLocation(LocationName.FOREST_TWO_BERRY_ONE_CARD);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player1.getFirstPlayedCard(CardName.LOOKOUT),
            },
          },
          {
            inputType: GameInputType.SELECT_LOCATION,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.LOOKOUT,
            locationOptions: gameState
              .getPlayableLocations({
                checkCanPlaceWorker: false,
              })
              .filter((name) => {
                const location = Location.fromName(name);
                return (
                  location.type === LocationType.BASIC ||
                  location.type === LocationType.FOREST
                );
              }),
            clientOptions: {
              selectedLocation: LocationName.FOREST_TWO_BERRY_ONE_CARD,
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);

        expect(player1.numAvailableWorkers).to.be(0);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
        expect(player1.cardsInHand.length).to.be(1);
      });
    });

    describe(CardName.MINE, () => {
      it("gain 1 PEBBLE when played", () => {
        const card = Card.fromName(CardName.MINE);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
        expect(player.hasCardInCity(card.name)).to.be(true);
      });
    });

    describe(CardName.MINER_MOLE, () => {
      it("should allow the player to copy another player's GENERAL_STORE", () => {
        const card = Card.fromName(CardName.MINER_MOLE);

        let player1 = gameState.getActivePlayer();
        const player2 = gameState.players[1];

        player2.addToCity(gameState, CardName.GENERAL_STORE);
        player2.addToCity(gameState, CardName.FARM);

        // Make sure we can play this card
        player1.gainResources(gameState, card.baseCost);
        player1.cardsInHand.push(card.name);

        expect(player1.hasCardInCity(card.name)).to.be(false);

        [player1, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.MINER_MOLE,
            maxToSelect: 1,
            minToSelect: 1,
            cardOptions: [
              ...player2.getPlayedCardForCardName(CardName.GENERAL_STORE),
              ...player2.getPlayedCardForCardName(CardName.FARM),
            ],
            clientOptions: {
              selectedCards: player2.getPlayedCardForCardName(
                CardName.GENERAL_STORE
              ),
            },
          },
        ]);

        // 2 berries because player 2 has a farm
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      });

      it("should allow the player to copy another player's BARGE_TOAD", () => {
        const card = Card.fromName(CardName.MINER_MOLE);

        let player1 = gameState.getActivePlayer();
        const player2 = gameState.players[1];

        player2.addToCity(gameState, CardName.BARGE_TOAD);
        player2.addToCity(gameState, CardName.FARM);

        // Make sure we can play this card
        player1.gainResources(gameState, card.baseCost);
        player1.cardsInHand.push(card.name);

        expect(player1.hasCardInCity(card.name)).to.be(false);

        [player1, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.MINER_MOLE,
            maxToSelect: 1,
            minToSelect: 1,
            cardOptions: [
              ...player2.getPlayedCardForCardName(CardName.BARGE_TOAD),
              ...player2.getPlayedCardForCardName(CardName.FARM),
            ],
            clientOptions: {
              selectedCards: player2.getPlayedCardForCardName(
                CardName.BARGE_TOAD
              ),
            },
          },
        ]);

        // player gains 2 twig
        expect(player1.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
      });

      it("should allow the player to copy another player's HUSBAND", () => {
        const card = Card.fromName(CardName.MINER_MOLE);

        let player1 = gameState.getActivePlayer();
        const player2 = gameState.players[1];

        player2.addToCity(gameState, CardName.HUSBAND);
        player2.addToCity(gameState, CardName.WIFE);
        player2.addToCity(gameState, CardName.FARM);

        // Make sure we can play this card
        player1.gainResources(gameState, card.baseCost);
        player1.cardsInHand.push(card.name);

        expect(player1.hasCardInCity(card.name)).to.be(false);

        [player1, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.MINER_MOLE,
            maxToSelect: 1,
            minToSelect: 1,
            cardOptions: [
              ...player2.getPlayedCardForCardName(CardName.HUSBAND),
              ...player2.getPlayedCardForCardName(CardName.FARM),
            ],
            clientOptions: {
              selectedCards: player2.getPlayedCardForCardName(CardName.HUSBAND),
            },
          },
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.SELECT_PLAYED_CARDS,
            cardContext: CardName.HUSBAND,
            options: [
              ResourceType.BERRY,
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.PEBBLE,
            ],
            clientOptions: {
              selectedOption: ResourceType.BERRY,
            },
          },
        ]);

        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });

      it("should not allow the player to copy another player's HUSBAND (if they are missing a WIFE AND FARM)", () => {
        const card = Card.fromName(CardName.MINER_MOLE);

        let player1 = gameState.getActivePlayer();
        const player2 = gameState.players[1];

        player2.addToCity(gameState, CardName.HUSBAND);
        player2.addToCity(gameState, CardName.FARM);

        // Make sure we can play this card
        player1.gainResources(gameState, card.baseCost);
        player1.cardsInHand.push(card.name);

        expect(player1.hasCardInCity(card.name)).to.be(false);

        [player1, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.MINER_MOLE,
            maxToSelect: 1,
            minToSelect: 1,
            cardOptions: [...player2.getPlayedCardForCardName(CardName.FARM)],
            clientOptions: {
              selectedCards: player2.getPlayedCardForCardName(CardName.FARM),
            },
          },
        ]);

        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });

      it("should allow the player to copy another player's miner mole", () => {
        const card = Card.fromName(CardName.MINER_MOLE);

        let player1 = gameState.getActivePlayer();
        const player2 = gameState.players[1];

        player1.addToCity(gameState, CardName.FARM);
        player1.addToCity(gameState, CardName.CHIP_SWEEP);
        player1.addToCity(gameState, CardName.GENERAL_STORE);

        player2.addToCity(gameState, CardName.MINER_MOLE);
        player2.addToCity(gameState, CardName.CHIP_SWEEP);
        player2.addToCity(gameState, CardName.GENERAL_STORE);

        // Make sure we can play this card
        player1.gainResources(gameState, card.baseCost);
        player1.cardsInHand.push(card.name);

        expect(player1.hasCardInCity(card.name)).to.be(false);

        [player1, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.MINER_MOLE,
            maxToSelect: 1,
            minToSelect: 1,
            cardOptions: [
              ...player1.getPlayedCardForCardName(CardName.FARM),
              ...player1.getPlayedCardForCardName(CardName.GENERAL_STORE),
              ...player2.getPlayedCardForCardName(CardName.GENERAL_STORE),
            ],
            clientOptions: {
              selectedCards: player1.getPlayedCardForCardName(
                CardName.GENERAL_STORE
              ),
            },
          },
        ]);

        // 2 berries because player 1 has a farm
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      });
    });

    describe(CardName.MONASTERY, () => {
      it("can give 2 resources to another player", () => {
        player.addToCity(gameState, CardName.MONASTERY);
        expect(() => {
          multiStepGameInputTest(gameState, [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.MONASTERY),
              },
            },
          ]);
        }).to.throwException(/need at least 2 resources/i);

        player.gainResources(gameState, {
          [ResourceType.BERRY]: 2,
        });
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        const targetPlayerId = gameState.players[1].playerId;

        const selectResourcesInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.MONASTERY,
          toSpend: true,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 2,
            },
          },
          maxResources: 2,
          minResources: 2,
        };

        const selectPlayerInput = {
          inputType: GameInputType.SELECT_PLAYER as const,
          prevInputType: GameInputType.SELECT_RESOURCES,
          prevInput: selectResourcesInput,
          cardContext: CardName.MONASTERY,
          playerOptions: [targetPlayerId],
          mustSelectOne: true,
          clientOptions: {
            selectedPlayer: targetPlayerId,
          },
        };
        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.MONASTERY),
            },
          },
          selectResourcesInput,
          selectPlayerInput,
        ]);

        const targetPlayer = gameState.getPlayer(targetPlayerId);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(4);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(targetPlayer.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      });
      it.skip("cannot give resources to player who has ended", () => {
        gameState = testInitialGameState({ numPlayers: 3 });
        player = gameState.getActivePlayer();
        player.addToCity(gameState, CardName.MONASTERY);
        player.gainResources(gameState, {
          [ResourceType.BERRY]: 2,
        });

        const player0Id = gameState.players[0].playerId;
        const player1Id = gameState.players[1].playerId;
        const player2Id = gameState.players[2].playerId;

        // put player1 in the ended state
        gameState.getPlayer(player1Id).playerStatus = PlayerStatus.GAME_ENDED;

        const selectResourcesInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.MONASTERY,
          toSpend: true,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 2,
            },
          },
          maxResources: 2,
          minResources: 2,
        };

        const selectPlayerInput = {
          inputType: GameInputType.SELECT_PLAYER as const,
          prevInputType: GameInputType.SELECT_RESOURCES,
          prevInput: selectResourcesInput,
          cardContext: CardName.MONASTERY,
          playerOptions: [player2Id],
          mustSelectOne: true,
          clientOptions: {
            selectedPlayer: player2Id,
          },
        };
        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.MONASTERY),
            },
          },
          selectResourcesInput,
          selectPlayerInput,
        ]);

        const targetPlayer = gameState.getPlayer(player2Id);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(4);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(targetPlayer.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      });

      it.skip("should not be able to visit if no players to give resources to", () => {
        player.addToCity(gameState, CardName.MONASTERY);
        player.gainResources(gameState, {
          [ResourceType.BERRY]: 2,
        });

        const player1Id = gameState.players[1].playerId;

        // put other player in the ended state
        gameState.getPlayer(player1Id).playerStatus = PlayerStatus.GAME_ENDED;

        expect(() => {
          multiStepGameInputTest(gameState, [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.MONASTERY),
              },
            },
          ]);
        }).to.throwException(/Need at least/i);
      });
    });

    describe(CardName.MONK, () => {
      it("should do nothing if no resources", () => {
        const card = Card.fromName(CardName.MONK);
        player.addCardToHand(gameState, CardName.MONK);
        player.gainResources(gameState, card.baseCost);
        multiStepGameInputTest(gameState, [playCardInput(card.name)], {
          autoAdvance: true,
        });
      });

      it("should allow player to give up 2 berries for vp", () => {
        const card = Card.fromName(CardName.MONK);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        player.addCardToHand(gameState, CardName.MONK);
        player.gainResources(gameState, card.baseCost);
        player.gainResources(gameState, {
          [ResourceType.BERRY]: 2,
        });

        const selectResourceGameInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PLAY_CARD as const,
          toSpend: true,
          cardContext: CardName.MONK,
          maxResources: 2,
          minResources: 0,
          specificResource: ResourceType.BERRY,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 2,
            },
          },
        };

        const targetPlayerId = gameState.players[1].playerId;
        expect(
          gameState
            .getPlayer(targetPlayerId)
            .getNumResourcesByType(ResourceType.BERRY)
        ).to.be(0);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          selectResourceGameInput,
          {
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.SELECT_RESOURCES,
            prevInput: selectResourceGameInput,
            cardContext: CardName.MONK,
            mustSelectOne: true,
            playerOptions: [targetPlayerId],
            clientOptions: {
              selectedPlayer: targetPlayerId,
            },
          },
        ]);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(4);
        expect(
          gameState
            .getPlayer(targetPlayerId)
            .getNumResourcesByType(ResourceType.BERRY)
        ).to.be(2);
      });

      it("should not allow player to give up non-existent berries", () => {
        const card = Card.fromName(CardName.MONK);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        player.addCardToHand(gameState, CardName.MONK);
        player.gainResources(gameState, card.baseCost);
        player.gainResources(gameState, {
          [ResourceType.BERRY]: 1,
        });

        const selectResourceGameInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          toSpend: true,
          prevInputType: GameInputType.PLAY_CARD as const,
          cardContext: CardName.MONK,
          maxResources: 2,
          minResources: 0,
          specificResource: ResourceType.BERRY,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 2,
            },
          },
        };

        const targetPlayerId = gameState.players[1].playerId;

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            selectResourceGameInput,
            {
              inputType: GameInputType.SELECT_PLAYER,
              prevInputType: GameInputType.SELECT_RESOURCES,
              prevInput: selectResourceGameInput,
              cardContext: CardName.MONK,
              mustSelectOne: true,
              playerOptions: [targetPlayerId],
              clientOptions: {
                selectedPlayer: targetPlayerId,
              },
            },
          ]);
        }).to.throwException(/insufficient/i);
      });

      it("should not allow player to give more than 2 resources", () => {
        const card = Card.fromName(CardName.MONK);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        player.addCardToHand(gameState, CardName.MONK);
        player.gainResources(gameState, card.baseCost);
        player.gainResources(gameState, {
          [ResourceType.BERRY]: 4,
        });

        const selectResourceGameInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          toSpend: true,
          prevInputType: GameInputType.PLAY_CARD as const,
          cardContext: CardName.MONK,
          maxResources: 2,
          minResources: 0,
          specificResource: ResourceType.BERRY,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 4,
            },
          },
        };

        const targetPlayerId = gameState.players[1].playerId;

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            selectResourceGameInput,
            {
              inputType: GameInputType.SELECT_PLAYER,
              prevInputType: GameInputType.SELECT_RESOURCES,
              prevInput: selectResourceGameInput,
              cardContext: CardName.MONK,
              mustSelectOne: true,
              playerOptions: [targetPlayerId],
              clientOptions: {
                selectedPlayer: targetPlayerId,
              },
            },
          ]);
        }).to.throwException(/too many/i);
      });

      it("should not allow player to give themselves berries", () => {
        const card = Card.fromName(CardName.MONK);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        player.addCardToHand(gameState, CardName.MONK);
        player.gainResources(gameState, card.baseCost);
        player.gainResources(gameState, {
          [ResourceType.BERRY]: 4,
        });

        const selectResourceGameInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          toSpend: true,
          prevInputType: GameInputType.PLAY_CARD as const,
          cardContext: CardName.MONK,
          maxResources: 2,
          minResources: 0,
          specificResource: ResourceType.BERRY,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 2,
            },
          },
        };

        const targetPlayerId = gameState.players[1].playerId;

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            selectResourceGameInput,
            {
              inputType: GameInputType.SELECT_PLAYER,
              prevInputType: GameInputType.SELECT_RESOURCES,
              prevInput: selectResourceGameInput,
              cardContext: CardName.MONK,
              mustSelectOne: true,
              playerOptions: [targetPlayerId],
              clientOptions: {
                selectedPlayer: player.playerId,
              },
            },
          ]);
        }).to.throwException(/invalid/i);
      });
    });

    describe(CardName.PALACE, () => {
      it("worth 1 vp more per unique construction", () => {
        const card = Card.fromName(CardName.PALACE);
        player.addToCity(gameState, card.name);
        expect(card.getPoints(player, gameState)).to.be(4 + 1);

        player.addToCity(gameState, CardName.DUNGEON);
        expect(card.getPoints(player, gameState)).to.be(4 + 2);

        player.addToCity(gameState, CardName.THEATRE);
        expect(card.getPoints(player, gameState)).to.be(4 + 3);

        player.addToCity(gameState, CardName.UNIVERSITY);
        expect(card.getPoints(player, gameState)).to.be(4 + 4);

        player.addToCity(gameState, CardName.FARM);
        expect(card.getPoints(player, gameState)).to.be(4 + 4);

        player.addToCity(gameState, CardName.RANGER);
        expect(card.getPoints(player, gameState)).to.be(4 + 4);
      });
    });

    describe(CardName.PEDDLER, () => {
      it("should do nothing if no resources", () => {
        const card = Card.fromName(CardName.PEDDLER);

        player.addCardToHand(gameState, CardName.PEDDLER);
        player.gainResources(gameState, card.baseCost);
        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(card.name)],
          { autoAdvance: true }
        );
      });

      it("should allow player to swap 2 resources", () => {
        const card = Card.fromName(CardName.PEDDLER);

        player.addCardToHand(gameState, CardName.PEDDLER);
        player.gainResources(gameState, card.baseCost);
        player.gainResources(gameState, {
          [ResourceType.PEBBLE]: 1,
          [ResourceType.RESIN]: 1,
        });

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_RESOURCES,
            toSpend: true,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.PEDDLER,
            maxResources: 2,
            minResources: 0,
            clientOptions: {
              resources: {
                [ResourceType.PEBBLE]: 1,
                [ResourceType.RESIN]: 1,
              },
            },
          },
          {
            inputType: GameInputType.SELECT_RESOURCES,
            toSpend: false,
            prevInputType: GameInputType.SELECT_RESOURCES,
            cardContext: CardName.PEDDLER,
            maxResources: 2,
            minResources: 2,
            clientOptions: {
              resources: {
                [ResourceType.BERRY]: 2,
              },
            },
          },
        ]);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      });

      it("should not allow player to swap 2 non-existent resources", () => {
        const card = Card.fromName(CardName.PEDDLER);
        player.addCardToHand(gameState, CardName.PEDDLER);
        player.gainResources(gameState, card.baseCost);
        player.gainResources(gameState, {
          [ResourceType.PEBBLE]: 1,
          [ResourceType.RESIN]: 1,
        });

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            {
              inputType: GameInputType.SELECT_RESOURCES,
              toSpend: true,
              prevInputType: GameInputType.PLAY_CARD,
              cardContext: CardName.PEDDLER,
              maxResources: 2,
              minResources: 0,
              clientOptions: {
                resources: {
                  [ResourceType.PEBBLE]: 2,
                },
              },
            },
          ]);
        }).to.throwException(/insufficient/i);
      });

      it("should not allow player to swap more than 2 resources", () => {
        const card = Card.fromName(CardName.PEDDLER);
        player.addCardToHand(gameState, CardName.PEDDLER);
        player.gainResources(gameState, card.baseCost);
        player.gainResources(gameState, {
          [ResourceType.PEBBLE]: 2,
          [ResourceType.RESIN]: 2,
        });

        expect(() => {
          multiStepGameInputTest(gameState, [
            playCardInput(card.name),
            {
              inputType: GameInputType.SELECT_RESOURCES,
              toSpend: true,
              prevInputType: GameInputType.PLAY_CARD,
              cardContext: CardName.PEDDLER,
              maxResources: 2,
              minResources: 0,
              clientOptions: {
                resources: {
                  [ResourceType.PEBBLE]: 2,
                  [ResourceType.RESIN]: 2,
                },
              },
            },
          ]);
        }).to.throwException(/too many/i);
      });
    });

    describe(CardName.POSTAL_PIGEON, () => {
      it("should allow the player to select a card to play", () => {
        const card = Card.fromName(CardName.POSTAL_PIGEON);
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        gameState.deck.addToStack(CardName.FARM);
        gameState.deck.addToStack(CardName.MINE);

        expect(gameState.discardPile.length).to.eql(0);
        expect(gameState.pendingGameInputs).to.eql([]);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.MINE)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POSTAL_PIGEON,
            maxToSelect: 1,
            minToSelect: 0,
            cardOptions: [CardName.MINE, CardName.FARM],
            cardOptionsUnfiltered: [CardName.MINE, CardName.FARM],
            clientOptions: {
              selectedCards: [CardName.MINE],
            },
          },
        ]);

        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.MINE)).to.be(true);
        expect(gameState.discardPile.length).to.eql(1);
        expect(gameState.pendingGameInputs).to.eql([]);
      });

      it("should only allow the player to select eligible cards", () => {
        const card = Card.fromName(CardName.POSTAL_PIGEON);
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        // Add cards that have too high vp
        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.QUEEN);

        expect(gameState.discardPile.length).to.eql(0);
        expect(gameState.pendingGameInputs).to.eql([]);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.MINE)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POSTAL_PIGEON,
            maxToSelect: 1,
            minToSelect: 0,
            cardOptions: [],
            cardOptionsUnfiltered: [CardName.QUEEN, CardName.KING],
            clientOptions: {
              selectedCards: [],
            },
          },
        ]);

        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(gameState.discardPile.length).to.eql(2);
      });

      it("should trigger production cards when played via the postal pigeon", () => {
        const card = Card.fromName(CardName.POSTAL_PIGEON);
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        gameState.deck.addToStack(CardName.FARM);
        gameState.deck.addToStack(CardName.MINE);

        expect(gameState.discardPile.length).to.eql(0);
        expect(gameState.pendingGameInputs).to.eql([]);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.MINE)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POSTAL_PIGEON,
            maxToSelect: 1,
            minToSelect: 0,
            cardOptions: [CardName.MINE, CardName.FARM],
            cardOptionsUnfiltered: [CardName.MINE, CardName.FARM],
            clientOptions: {
              selectedCards: [CardName.MINE],
            },
          },
        ]);

        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.MINE)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
      });

      it("should trigger HISTORIAN/SHOPKEEPER cards when played via the postal pigeon", () => {
        const card = Card.fromName(CardName.POSTAL_PIGEON);
        player.gainResources(gameState, card.baseCost);
        player.addToCity(gameState, CardName.HISTORIAN);
        player.addToCity(gameState, CardName.SHOPKEEPER);

        // For historian
        gameState.deck.addToStack(CardName.WIFE);

        // For Postal Pigeon
        gameState.deck.addToStack(CardName.WANDERER);
        gameState.deck.addToStack(CardName.FARM);

        player.addCardToHand(gameState, card.name);

        expect(gameState.discardPile.length).to.eql(0);
        expect(player.numCardsInHand).to.eql(1);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.WANDERER)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POSTAL_PIGEON,
            maxToSelect: 1,
            minToSelect: 0,
            cardOptions: [CardName.FARM, CardName.WANDERER],
            cardOptionsUnfiltered: [CardName.FARM, CardName.WANDERER],
            clientOptions: {
              selectedCards: [CardName.WANDERER],
            },
          },
        ]);

        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.WANDERER)).to.be(true);
        // From shopkeeper (1 for postal pigeon, 1 for wanderer)
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
        // From historian (2 cards) and wanderer
        expect(player.numCardsInHand).to.eql(3 + 2);
      });

      it("should trigger COURTHOUSE cards when played via the postal pigeon", () => {
        const card = Card.fromName(CardName.POSTAL_PIGEON);
        player.gainResources(gameState, card.baseCost);
        player.addToCity(gameState, CardName.HISTORIAN);
        player.addToCity(gameState, CardName.COURTHOUSE);

        // For historian
        gameState.deck.addToStack(CardName.WIFE);

        // For Postal Pigeon
        gameState.deck.addToStack(CardName.WANDERER);
        gameState.deck.addToStack(CardName.FARM);

        player.addCardToHand(gameState, card.name);

        expect(gameState.discardPile.length).to.eql(0);
        expect(player.numCardsInHand).to.eql(1);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.MINE)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POSTAL_PIGEON,
            maxToSelect: 1,
            minToSelect: 0,
            cardOptions: [CardName.FARM, CardName.WANDERER],
            cardOptionsUnfiltered: [CardName.FARM, CardName.WANDERER],
            clientOptions: {
              selectedCards: [CardName.FARM],
            },
          },
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.COURTHOUSE,
            options: ["TWIG", "RESIN", "PEBBLE"],
            clientOptions: {
              selectedOption: "TWIG",
            },
          },
        ]);

        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);

        // From farm production
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
        // From historian (postal pigeon + farm)
        expect(player.numCardsInHand).to.eql(2);
        // From COURTHOUSE
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      });

      it("should NOT trigger SHOPKEEPER if played via the postal pigeon", () => {
        const card = Card.fromName(CardName.POSTAL_PIGEON);
        player.gainResources(gameState, card.baseCost);

        // For Postal Pigeon
        gameState.deck.addToStack(CardName.WANDERER);
        gameState.deck.addToStack(CardName.SHOPKEEPER);

        player.addCardToHand(gameState, card.name);

        expect(gameState.discardPile.length).to.eql(0);
        expect(player.numCardsInHand).to.eql(1);

        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.SHOPKEEPER)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POSTAL_PIGEON,
            maxToSelect: 1,
            minToSelect: 0,
            cardOptions: [CardName.SHOPKEEPER, CardName.WANDERER],
            cardOptionsUnfiltered: [CardName.SHOPKEEPER, CardName.WANDERER],
            clientOptions: {
              selectedCards: [CardName.SHOPKEEPER],
            },
          },
        ]);

        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.SHOPKEEPER)).to.be(true);

        // Spent all berries
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      });

      it("should NOT trigger HISTORIAN if played via the postal pigeon", () => {
        const card = Card.fromName(CardName.POSTAL_PIGEON);
        player.gainResources(gameState, card.baseCost);

        // For Postal Pigeon
        gameState.deck.addToStack(CardName.WANDERER);
        gameState.deck.addToStack(CardName.HISTORIAN);

        player.addCardToHand(gameState, card.name);

        expect(gameState.discardPile.length).to.eql(0);
        expect(player.numCardsInHand).to.eql(1);

        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.SHOPKEEPER)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POSTAL_PIGEON,
            maxToSelect: 1,
            minToSelect: 0,
            cardOptions: [CardName.HISTORIAN, CardName.WANDERER],
            cardOptionsUnfiltered: [CardName.HISTORIAN, CardName.WANDERER],
            clientOptions: {
              selectedCards: [CardName.HISTORIAN],
            },
          },
        ]);

        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.HISTORIAN)).to.be(true);
        // Did not draw card.
        expect(player.numCardsInHand).to.be(0);
      });
    });

    describe(CardName.POST_OFFICE, () => {
      it("should not be visitable if player has less than 2 cards", () => {
        const card = Card.fromName(CardName.POST_OFFICE);
        player.addToCity(gameState, CardName.POST_OFFICE);

        const visitDestinationInput = {
          inputType: GameInputType.VISIT_DESTINATION_CARD as const,
          clientOptions: {
            playedCard: player.getFirstPlayedCard(CardName.POST_OFFICE),
          },
        };

        expect(card.canPlay(gameState, visitDestinationInput)).to.be(false);
        player.addCardToHand(gameState, CardName.FARM);
        player.addCardToHand(gameState, CardName.MONK);
        expect(card.canPlay(gameState, visitDestinationInput)).to.be(true);
      });

      it("should give another player 2 cards and draw max cards", () => {
        let targetPlayer = gameState.players[1];

        player.cardsInHand = [
          CardName.FARM,
          CardName.MINE,
          CardName.QUEEN,
          CardName.KING,
        ];
        player.addToCity(gameState, CardName.POST_OFFICE);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getPlayedCardForCardName(CardName.POST_OFFICE)).to.eql([
          {
            cardOwnerId: player.playerId,
            cardName: CardName.POST_OFFICE,
            usedForCritter: false,
            workers: [],
          },
        ]);

        for (let i = 0; i < 8; i++) {
          gameState.deck.addToStack(CardName.MINER_MOLE);
        }

        const visitDestinationInput = {
          inputType: GameInputType.VISIT_DESTINATION_CARD as const,
          clientOptions: {
            playedCard: player.getFirstPlayedCard(CardName.POST_OFFICE),
          },
        };

        const selectPlayer = {
          inputType: GameInputType.SELECT_PLAYER as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD as const,
          cardContext: CardName.POST_OFFICE,
          playerOptions: [targetPlayer.playerId],
          mustSelectOne: true,
          clientOptions: {
            selectedPlayer: targetPlayer.playerId,
          },
        };

        const selectCardsToGiveAway = {
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.SELECT_PLAYER as const,
          prevInput: selectPlayer,
          cardContext: CardName.POST_OFFICE,
          cardOptions: player.cardsInHand,
          maxToSelect: 2,
          minToSelect: 2,
          clientOptions: {
            selectedCards: [CardName.MINE, CardName.QUEEN],
          },
        };

        const selectCardsToDiscard = {
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.SELECT_CARDS as const,
          cardContext: CardName.POST_OFFICE,
          cardOptions: [CardName.FARM, CardName.KING],
          maxToSelect: 2,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [CardName.FARM, CardName.KING],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          visitDestinationInput,
          selectPlayer,
          selectCardsToGiveAway,
          selectCardsToDiscard,
        ]);

        targetPlayer = gameState.getPlayer(targetPlayer.playerId);
        expect(player.numAvailableWorkers).to.be(1);
        expect(player.getPlayedCardForCardName(CardName.POST_OFFICE)).to.eql([
          {
            cardOwnerId: player.playerId,
            cardName: CardName.POST_OFFICE,
            usedForCritter: false,
            workers: [player.playerId],
          },
        ]);
        expect(targetPlayer.cardsInHand).to.eql([
          CardName.MINE,
          CardName.QUEEN,
        ]);
        expect(player.cardsInHand).to.eql([
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
          CardName.MINER_MOLE,
        ]);
      });
    });

    describe(CardName.QUEEN, () => {
      it("should allow player to choose to play card from meadow OR hand", () => {
        gameState = testInitialGameState({
          meadowCards: [
            CardName.FARM,
            CardName.KING,
            CardName.KING,
            CardName.KING,
            CardName.KING,
            CardName.KING,
            CardName.KING,
            CardName.KING,
          ],
        });
        player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.QUEEN);
        player.addToCity(gameState, CardName.QUEEN);
        player.addCardToHand(gameState, CardName.FARM);

        expect(player.numAvailableWorkers).to.be(2);
        expect(gameState.meadowCards.length).to.be(8);
        expect(player.hasCardInCity(CardName.FARM)).to.be(false);

        const selectCardInput = {
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.QUEEN,
          cardOptions: [CardName.FARM, CardName.FARM],
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [CardName.FARM],
          },
        };

        const selectCardFromMeadowSourceInput = {
          inputType: GameInputType.SELECT_OPTION_GENERIC as const,
          prevInputType: GameInputType.SELECT_CARDS,
          prevInput: selectCardInput,
          cardContext: CardName.QUEEN,
          options: ["Meadow", "Hand"],
          clientOptions: { selectedOption: "Meadow" },
        };

        const selectCardFromHandSourceInput = {
          inputType: GameInputType.SELECT_OPTION_GENERIC as const,
          prevInputType: GameInputType.SELECT_CARDS,
          prevInput: selectCardInput,
          cardContext: CardName.QUEEN,
          options: ["Meadow", "Hand"],
          clientOptions: { selectedOption: "Hand" },
        };

        const [playerMeadow, gameState2] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.QUEEN),
            },
          },
          selectCardInput,
          selectCardFromMeadowSourceInput,
        ]);

        expect(gameState2.meadowCards.indexOf(CardName.FARM)).to.be(-1);
        expect(gameState2.meadowCards.length).to.be(8);
        expect(playerMeadow.cardsInHand.indexOf(CardName.FARM)).to.be(0);
        expect(playerMeadow.numAvailableWorkers).to.be(1);
        expect(playerMeadow.hasCardInCity(CardName.FARM)).to.be(true);

        const [playerHand, gameState3] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.QUEEN),
            },
          },
          selectCardInput,
          selectCardFromHandSourceInput,
        ]);

        expect(gameState3.meadowCards.indexOf(CardName.FARM)).to.be(0);
        expect(gameState3.meadowCards.length).to.be(8);
        expect(playerHand.cardsInHand.indexOf(CardName.FARM)).to.be(-1);
        expect(playerHand.numAvailableWorkers).to.be(1);
        expect(playerHand.hasCardInCity(CardName.FARM)).to.be(true);
      });

      it("should allow player to buy card from hand for less than 3 points for free", () => {
        const card = Card.fromName(CardName.QUEEN);
        player.addToCity(gameState, CardName.QUEEN);
        player.addCardToHand(gameState, CardName.HUSBAND);
        gameState.clearMeadow();

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.HUSBAND)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.QUEEN),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.QUEEN,
            cardOptions: [CardName.HUSBAND],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.HUSBAND],
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.hasCardInCity(CardName.HUSBAND)).to.be(true);
        expect(player.cardsInHand.indexOf(CardName.HUSBAND)).to.be(-1);
      });

      it("should allow player to play card from the meadow for less than 3 points for free", () => {
        gameState = testInitialGameState({
          meadowCards: [
            CardName.KING,
            CardName.QUEEN,
            CardName.POSTAL_PIGEON,
            CardName.POSTAL_PIGEON,
            CardName.FARM,
            CardName.HUSBAND,
            CardName.CHAPEL,
            CardName.MONK,
          ],
        });
        player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.QUEEN);
        player.addToCity(gameState, CardName.QUEEN);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.HUSBAND)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.QUEEN),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.QUEEN,
            cardOptions: [
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.CHAPEL,
              CardName.MONK,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.HUSBAND],
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.hasCardInCity(CardName.HUSBAND)).to.be(true);
        expect(gameState.meadowCards.indexOf(CardName.HUSBAND)).to.be(-1);
      });

      it("should allow player to play card worth exactly 3 points for free", () => {
        gameState = testInitialGameState({
          meadowCards: [
            CardName.KING,
            CardName.QUEEN,
            CardName.POSTAL_PIGEON,
            CardName.POSTAL_PIGEON,
            CardName.FARM,
            CardName.HUSBAND,
            CardName.CHAPEL,
            CardName.FAIRGROUNDS,
          ],
        });
        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.QUEEN);
        player.addToCity(gameState, CardName.QUEEN);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.FAIRGROUNDS)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.QUEEN),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.QUEEN,
            cardOptions: [
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.CHAPEL,
              CardName.FAIRGROUNDS,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.FAIRGROUNDS],
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(gameState.meadowCards.indexOf(CardName.FAIRGROUNDS)).to.be(-1);
        expect(player.hasCardInCity(CardName.FAIRGROUNDS)).to.be(true);
      });

      it("should not allow player to buy card for than 3 points", () => {
        gameState = testInitialGameState({
          meadowCards: [
            CardName.KING,
            CardName.QUEEN,
            CardName.POSTAL_PIGEON,
            CardName.POSTAL_PIGEON,
            CardName.FARM,
            CardName.HUSBAND,
            CardName.CHAPEL,
            CardName.MONK,
          ],
        });
        const player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.QUEEN);
        player.addToCity(gameState, CardName.QUEEN);

        expect(player.numAvailableWorkers).to.be(2);

        gameState = gameState.next({
          inputType: GameInputType.VISIT_DESTINATION_CARD,
          clientOptions: {
            playedCard: player.getFirstPlayedCard(CardName.QUEEN),
          },
        });

        expect(() => {
          gameState.next({
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.QUEEN,
            cardOptions: [
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.CHAPEL,
              CardName.MONK,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.KING],
            },
          });
        }).to.throwException(/Selected card is not a valid option/i);
      });

      it("should not allow player to visit the queen if there are no applicable cards", () => {
        gameState = testInitialGameState({
          meadowCards: [
            CardName.KING,
            CardName.KING,
            CardName.KING,
            CardName.KING,
            CardName.KING,
            CardName.KING,
            CardName.KING,
            CardName.KING,
          ],
        });
        const player = gameState.getActivePlayer();
        const card = Card.fromName(CardName.QUEEN);
        player.addToCity(gameState, CardName.QUEEN);

        expect(() => {
          gameState.next({
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.QUEEN),
            },
          });
        }).to.throwException(/no playable cards/i);
      });

      it("should not allow player to visit the queen if occupied", () => {
        const card = Card.fromName(CardName.QUEEN);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addToCity(gameState, CardName.QUEEN);
        player.placeWorkerOnCard(
          gameState,
          player.getFirstPlayedCard(CardName.QUEEN)
        );

        expect(() => {
          gameState.next({
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.QUEEN),
            },
          });
        }).to.throwException(/cannot place worker/i);
      });

      it("should not allow player to visit the queen if there are no playable cards", () => {
        gameState = testInitialGameState({
          meadowCards: [
            CardName.WIFE,
            CardName.WIFE,
            CardName.WIFE,
            CardName.WIFE,
            CardName.WIFE,
            CardName.WIFE,
            CardName.WIFE,
            CardName.WIFE,
          ],
        });
        const player = gameState.getActivePlayer();
        const card = Card.fromName(CardName.QUEEN);
        player.addCardToHand(gameState, CardName.WIFE);

        // Fill up city
        player.addToCity(gameState, CardName.QUEEN);
        for (let i = 0; i < 14; i++) {
          player.addToCity(gameState, CardName.FARM);
        }

        expect(() => {
          gameState.next({
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.QUEEN),
            },
          });
        }).to.throwException(/no playable cards/i);
      });

      it("should allow player to visit the queen and play RUINS if the city is full", () => {
        const card = Card.fromName(CardName.QUEEN);
        const cards = [
          CardName.WIFE,
          CardName.WIFE,
          CardName.WIFE,
          CardName.WIFE,
          CardName.WIFE,
          CardName.WIFE,
          CardName.WIFE,
          CardName.WIFE,
        ];
        gameState = testInitialGameState({ meadowCards: cards });
        let player = gameState.getActivePlayer();

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, CardName.RUINS);
        player.addToCity(gameState, CardName.QUEEN);
        for (let i = 0; i < 14; i++) {
          player.addToCity(gameState, CardName.FARM);
        }

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.QUEEN),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardOptions: [CardName.RUINS],
            maxToSelect: 1,
            minToSelect: 1,
            cardContext: CardName.QUEEN,
            clientOptions: { selectedCards: [CardName.RUINS] },
          },
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardOptions: player.getPlayedCardForCardName(CardName.FARM),
            cardContext: CardName.RUINS,
            playedCardContext: undefined,
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
            },
          },
        ]);

        expect(player.hasCardInCity(CardName.RUINS)).to.be(true);
      });
    });

    describe(CardName.RANGER, () => {
      it("should do nothing if there's no placed workers", () => {
        const card = Card.fromName(CardName.RANGER);
        player.addCardToHand(gameState, CardName.RANGER);
        player.gainResources(gameState, card.baseCost);
        multiStepGameInputTest(gameState, [playCardInput(card.name)]);
      });

      it("should do nothing if there's no recallable workers", () => {
        const card = Card.fromName(CardName.RANGER);
        player.addCardToHand(gameState, CardName.RANGER);
        player.gainResources(gameState, card.baseCost);

        player.placeWorkerOnLocation(LocationName.JOURNEY_FIVE);

        multiStepGameInputTest(gameState, [playCardInput(card.name)]);
      });

      it("should prompt to move an existing worker and trigger the new placement", () => {
        const card = Card.fromName(CardName.RANGER);
        player.addCardToHand(gameState, CardName.RANGER);
        player.gainResources(gameState, card.baseCost);

        gameState.locationsMap[LocationName.BASIC_ONE_STONE]!.push(
          player.playerId
        );
        player.placeWorkerOnLocation(LocationName.BASIC_ONE_STONE);
        expect(player.numAvailableWorkers).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.numCardsInHand).to.be(1);

        const recallWorkerInput = {
          inputType: GameInputType.SELECT_WORKER_PLACEMENT as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.RANGER,
          mustSelectOne: true,
          clientOptions: {
            selectedOption: {
              location: LocationName.BASIC_ONE_STONE,
            },
          },
          options: [{ location: LocationName.BASIC_ONE_STONE }],
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          recallWorkerInput,
          {
            inputType: GameInputType.SELECT_WORKER_PLACEMENT,
            prevInput: recallWorkerInput,
            prevInputType: GameInputType.SELECT_WORKER_PLACEMENT,
            cardContext: CardName.RANGER,
            mustSelectOne: true,
            options: [
              { location: LocationName.BASIC_ONE_BERRY },
              { location: LocationName.BASIC_ONE_BERRY_AND_ONE_CARD },
              { location: LocationName.BASIC_ONE_RESIN_AND_ONE_CARD },
              { location: LocationName.BASIC_THREE_TWIGS },
              { location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP },
              { location: LocationName.BASIC_TWO_RESIN },
              { location: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD },
              { location: LocationName.HAVEN },
            ],
            clientOptions: {
              selectedOption: {
                location: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD,
              },
            },
          },
        ]);
        expect(
          gameState.locationsMap[LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]
        ).to.eql([player.playerId]);
        expect(player.numAvailableWorkers).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
        expect(player.numCardsInHand).to.be(1);
      });

      it("should not allow moving the worker back to the same location", () => {
        const card = Card.fromName(CardName.RANGER);
        player.addCardToHand(gameState, CardName.RANGER);
        player.gainResources(gameState, card.baseCost);

        gameState.locationsMap[LocationName.BASIC_ONE_STONE]!.push(
          player.playerId
        );
        gameState.locationsMap[LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]!.push(
          player.playerId
        );
        player.placeWorkerOnLocation(LocationName.BASIC_ONE_STONE);
        player.placeWorkerOnLocation(LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD);
        expect(player.numAvailableWorkers).to.be(0);

        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.numCardsInHand).to.be(1);

        const recallWorkerInput = {
          inputType: GameInputType.SELECT_WORKER_PLACEMENT as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.RANGER,
          mustSelectOne: true,
          clientOptions: {
            selectedOption: {
              location: LocationName.BASIC_ONE_STONE,
            },
          },
          options: [
            { location: LocationName.BASIC_ONE_STONE },
            { location: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD },
          ],
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          recallWorkerInput,
          {
            inputType: GameInputType.SELECT_WORKER_PLACEMENT,
            prevInput: recallWorkerInput,
            prevInputType: GameInputType.SELECT_WORKER_PLACEMENT,
            cardContext: CardName.RANGER,
            mustSelectOne: true,
            options: [
              { location: LocationName.BASIC_ONE_BERRY },
              { location: LocationName.BASIC_ONE_BERRY_AND_ONE_CARD },
              { location: LocationName.BASIC_ONE_RESIN_AND_ONE_CARD },
              { location: LocationName.BASIC_THREE_TWIGS },
              { location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP },
              { location: LocationName.BASIC_TWO_RESIN },
              { location: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD },
              { location: LocationName.HAVEN },
            ],
            clientOptions: {
              selectedOption: {
                location: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD,
              },
            },
          },
        ]);
        expect(
          gameState.locationsMap[LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]
        ).to.eql([player.playerId, player.playerId]);
        expect(player.numAvailableWorkers).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
        expect(player.numCardsInHand).to.be(1);
      });
    });

    describe(CardName.RESIN_REFINERY, () => {
      it("should gain 1 RESIN when played", () => {
        const card = Card.fromName(CardName.RESIN_REFINERY);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);

        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
        expect(player.hasCardInCity(card.name)).to.be(true);
      });
    });

    describe(CardName.RUINS, () => {
      it("should not be playable if there's no construction in the city", () => {
        const card = Card.fromName(CardName.RUINS);
        player.addCardToHand(gameState, card.name);
        expect(() => {
          [player, gameState] = multiStepGameInputTest(gameState, [
            playCardInput(card.name),
          ]);
        }).to.throwException(/Require an existing construction to play Ruins/i);
      });

      it("should be playable if there's a construction in the city", () => {
        const card = Card.fromName(CardName.RUINS);
        player.addCardToHand(gameState, card.name);
        player.addToCity(gameState, CardName.FARM);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardOptions: player.getPlayedCardForCardName(CardName.FARM),
            cardContext: CardName.RUINS,
            playedCardContext: undefined,
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
            },
          },
        ]);
        expect(player.hasCardInCity(CardName.FARM)).to.be(false);
        expect(player.hasCardInCity(CardName.RUINS)).to.be(true);
      });

      it("should be playable even if there's no space in the city", () => {
        const card = Card.fromName(CardName.RUINS);
        player.addCardToHand(gameState, card.name);
        player.addToCity(gameState, CardName.FARM);
        for (let i = 0; i < 14; i++) {
          player.addToCity(gameState, CardName.HUSBAND);
        }
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardOptions: player.getPlayedCardForCardName(CardName.FARM),
            cardContext: CardName.RUINS,
            playedCardContext: undefined,
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
            },
          },
        ]);
        expect(player.hasCardInCity(CardName.FARM)).to.be(false);
        expect(player.hasCardInCity(CardName.RUINS)).to.be(true);
      });
    });

    describe(CardName.SCHOOL, () => {
      it("worth 1 extra VP per common critter", () => {
        const card = Card.fromName(CardName.SCHOOL);
        player.addToCity(gameState, card.name);
        const playerId = player.playerId;

        expect(card.getPoints(player, gameState)).to.be(2 + 0);

        player.addToCity(gameState, CardName.DUNGEON);
        expect(card.getPoints(player, gameState)).to.be(2 + 0);

        player.addToCity(gameState, CardName.RANGER);
        expect(card.getPoints(player, gameState)).to.be(2 + 0);

        player.addToCity(gameState, CardName.HUSBAND);
        expect(card.getPoints(player, gameState)).to.be(2 + 1);

        player.addToCity(gameState, CardName.WANDERER);
        expect(card.getPoints(player, gameState)).to.be(2 + 2);

        player.addToCity(gameState, CardName.WANDERER);
        expect(card.getPoints(player, gameState)).to.be(2 + 3);
      });
    });

    describe(CardName.SHEPHERD, () => {
      it("play shepherd using berries", () => {
        let player1 = gameState.players[0];
        let player2 = gameState.players[1];
        const card = Card.fromName(CardName.SHEPHERD);

        // Make sure we can play this card
        player1.gainResources(gameState, card.baseCost);
        player1.addCardToHand(gameState, card.name);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
        expect(player2.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.PLAY_CARD,
            prevInput: playCardInput(card.name),
            cardContext: CardName.SHEPHERD,
            playerOptions: [player2.playerId],
            mustSelectOne: true,
            clientOptions: {
              selectedPlayer: player2.playerId,
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);
        player2 = gameState.getPlayer(player2.playerId);

        // shepherd's power is to gain 3 berries + 1 VP per VP on chapel
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
        expect(player1.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player2.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
      });

      it("play shepherd using mixed resources (eg judge)", () => {
        let player1 = gameState.players[0];
        let player2 = gameState.players[1];
        const card = Card.fromName(CardName.SHEPHERD);

        // Make sure we can play this card

        player1.gainResources(gameState, {
          [ResourceType.TWIG]: 3,
          [ResourceType.BERRY]: 2,
        });
        player1.addCardToHand(gameState, card.name);
        player1.addToCity(gameState, CardName.JUDGE);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
        expect(player2.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.PLAY_CARD,
            clientOptions: {
              card: card.name,
              source: "HAND",
              paymentOptions: {
                resources: {
                  [ResourceType.TWIG]: 1,
                  [ResourceType.BERRY]: 2,
                },
              },
            },
          },
          {
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.PLAY_CARD,
            prevInput: {
              inputType: GameInputType.PLAY_CARD,
              clientOptions: {
                card: card.name,
                source: "HAND",
                paymentOptions: {
                  resources: {
                    [ResourceType.TWIG]: 1,
                    [ResourceType.BERRY]: 2,
                  },
                },
              },
            },
            cardContext: CardName.SHEPHERD,
            playerOptions: [player2.playerId],
            mustSelectOne: true,
            clientOptions: {
              selectedPlayer: player2.playerId,
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);
        player2 = gameState.getPlayer(player2.playerId);

        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
        expect(player1.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
        expect(player1.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player2.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
        expect(player2.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
      });

      it("playing shepherd via queen should not cost resources", () => {
        let player1 = gameState.players[0];
        let player2 = gameState.players[1];
        const card = Card.fromName(CardName.SHEPHERD);

        // Make sure we can play this card
        gameState.clearMeadow();
        player1.gainResources(gameState, {
          [ResourceType.TWIG]: 3,
          [ResourceType.BERRY]: 2,
        });
        player1.addCardToHand(gameState, card.name);
        player1.addToCity(gameState, CardName.QUEEN);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
        expect(player2.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player1.getFirstPlayedCard(CardName.QUEEN),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.QUEEN,
            cardOptions: [CardName.SHEPHERD],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.SHEPHERD],
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);
        player2 = gameState.getPlayer(player2.playerId);

        expect(player1.hasCardInCity(CardName.SHEPHERD));
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(5);
        expect(player1.getNumResourcesByType(ResourceType.TWIG)).to.be(3);
        expect(player1.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player2.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player2.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      });

      it("playing shepherd by occupying should not cost resources", () => {
        let player1 = gameState.players[0];
        let player2 = gameState.players[1];
        const card = Card.fromName(CardName.SHEPHERD);

        // Make sure we can play this card

        player1.gainResources(gameState, {
          [ResourceType.TWIG]: 3,
          [ResourceType.BERRY]: 0,
        });
        player1.addCardToHand(gameState, card.name);
        player.addToCity(gameState, CardName.CHAPEL);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player2.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.PLAY_CARD,
            clientOptions: {
              card: CardName.SHEPHERD,
              source: "HAND",
              paymentOptions: {
                useAssociatedCard: true,
                resources: {},
              },
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);
        player2 = gameState.getPlayer(player2.playerId);

        expect(player1.hasCardInCity(CardName.SHEPHERD));
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
        expect(player1.getNumResourcesByType(ResourceType.TWIG)).to.be(3);
        expect(player2.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player2.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      });

      it("Give correct num of VP when playing Shepherd", () => {
        let player1 = gameState.players[0];
        let player2 = gameState.players[1];
        const card = Card.fromName(CardName.SHEPHERD);

        player.addToCity(gameState, CardName.CHAPEL);
        const chapelInfo = player.getFirstPlayedCard(CardName.CHAPEL);
        const chapelResources = chapelInfo.resources || {
          [ResourceType.VP]: 0,
        };
        chapelResources[ResourceType.VP] = 2;

        // Make sure we can play this card
        player1.gainResources(gameState, card.baseCost);
        player1.addCardToHand(gameState, card.name);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
        expect(player2.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.PLAY_CARD,
            prevInput: playCardInput(card.name),
            cardContext: CardName.SHEPHERD,
            playerOptions: [player2.playerId],
            mustSelectOne: true,
            clientOptions: {
              selectedPlayer: player2.playerId,
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);
        player2 = gameState.getPlayer(player2.playerId);

        // shepherd's power is to gain 3 berries + 1 VP per VP on chapel
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
        expect(player1.getNumResourcesByType(ResourceType.VP)).to.be(2);
        expect(player2.getNumResourcesByType(ResourceType.BERRY)).to.be(3);
      });
    });

    describe(CardName.SHOPKEEPER, () => {
      it("should do nothing if player plays a construction", () => {
        player.addToCity(gameState, CardName.SHOPKEEPER);

        const cardToPlay = Card.fromName(CardName.MINE);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
        ]);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      });

      it("should gain a berry if player plays a critter", () => {
        player.addToCity(gameState, CardName.SHOPKEEPER);

        const cardToPlay = Card.fromName(CardName.QUEEN);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });

      it("should not gain a berry when playing a shopkeeper", () => {
        const cardToPlay = Card.fromName(CardName.SHOPKEEPER);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      });
    });

    describe(CardName.STOREHOUSE, () => {
      it("should allow player to choose resources to place on card", () => {
        const card = Card.fromName(CardName.STOREHOUSE);
        player.addCardToHand(gameState, card.name);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: card.name,
            playedCardContext: {
              cardName: card.name,
              cardOwnerId: player.playerId,
              workers: [],
              resources: {
                BERRY: 0,
                PEBBLE: 0,
                RESIN: 0,
                TWIG: 0,
              },
              usedForCritter: false,
            },
            options: ["3 TWIG", "2 RESIN", "1 PEBBLE", "2 BERRY"],
            clientOptions: {
              selectedOption: "3 TWIG",
            },
          },
        ]);

        const playedCard = player.getFirstPlayedCard(card.name);
        expect(playedCard).to.eql({
          cardName: card.name,
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 0,
            PEBBLE: 0,
            RESIN: 0,
            TWIG: 3,
          },
          workers: [],
          usedForCritter: false,
        });
      });

      it("should add resources to the correct storehouse", () => {
        const card = Card.fromName(CardName.STOREHOUSE);
        player.addCardToHand(gameState, card.name);

        // play one store card
        const storehouse1 = player.addToCity(gameState, card.name);
        // put 5 berries on it.
        storehouse1.resources![ResourceType.BERRY]! = 5;

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: card.name,
            playedCardContext: {
              cardName: card.name,
              cardOwnerId: player.playerId,
              resources: {
                BERRY: 0,
                PEBBLE: 0,
                RESIN: 0,
                TWIG: 0,
              },
              usedForCritter: false,
              workers: [],
            },
            options: ["3 TWIG", "2 RESIN", "1 PEBBLE", "2 BERRY"],
            clientOptions: {
              selectedOption: "3 TWIG",
            },
          },
        ]);

        expect(player.getPlayedCardForCardName(card.name)).to.eql([
          {
            cardName: card.name,
            cardOwnerId: player.playerId,
            workers: [],
            resources: {
              BERRY: 5,
              PEBBLE: 0,
              RESIN: 0,
              TWIG: 0,
            },
            usedForCritter: false,
          },
          {
            cardName: card.name,
            workers: [],
            cardOwnerId: player.playerId,
            resources: {
              BERRY: 0,
              PEBBLE: 0,
              RESIN: 0,
              TWIG: 3,
            },
            usedForCritter: false,
          },
        ]);
      });

      it("should add resources to the correct storehouse", () => {
        const card = Card.fromName(CardName.STOREHOUSE);
        const storehouse1 = player.addToCity(gameState, card.name);
        storehouse1.resources![ResourceType.BERRY]! = 5;

        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          cardOwnerId: player.playerId,
          workers: [],
          resources: {
            BERRY: 5,
            PEBBLE: 0,
            RESIN: 0,
            TWIG: 0,
          },
          usedForCritter: false,
        });
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD as const,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(card.name),
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(5);
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          cardOwnerId: player.playerId,
          workers: [player.playerId],
          resources: {
            BERRY: 0,
            PEBBLE: 0,
            RESIN: 0,
            TWIG: 0,
          },
          usedForCritter: false,
        });
      });

      it("should allow multiple CHIP_SWEEP to add resources to same correct storehouse", () => {
        player.addToCity(gameState, CardName.CHIP_SWEEP);
        player.addToCity(gameState, CardName.CHIP_SWEEP);
        player.addToCity(gameState, CardName.STOREHOUSE);

        // Use up all workers
        gameState.locationsMap[LocationName.BASIC_TWO_CARDS_AND_ONE_VP]!.push(
          player.playerId,
          player.playerId
        );
        player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
        player.placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            { inputType: GameInputType.PREPARE_FOR_SEASON },
            {
              inputType: GameInputType.SELECT_PLAYED_CARDS,
              prevInputType: GameInputType.PREPARE_FOR_SEASON,
              cardOptions: [player.getFirstPlayedCard(CardName.STOREHOUSE)],
              cardContext: CardName.CHIP_SWEEP,
              maxToSelect: 1,
              minToSelect: 1,
              clientOptions: {
                selectedCards: [player.getFirstPlayedCard(CardName.STOREHOUSE)],
              },
            },
            {
              inputType: GameInputType.SELECT_OPTION_GENERIC,
              prevInputType: GameInputType.PREPARE_FOR_SEASON,
              cardContext: CardName.STOREHOUSE,
              playedCardContext: player.getFirstPlayedCard(CardName.STOREHOUSE),
              options: ["3 TWIG", "2 RESIN", "1 PEBBLE", "2 BERRY"],
              clientOptions: { selectedOption: "3 TWIG" },
            },
            {
              inputType: GameInputType.SELECT_PLAYED_CARDS,
              prevInputType: GameInputType.PREPARE_FOR_SEASON,
              cardOptions: [
                {
                  ...player.getFirstPlayedCard(CardName.STOREHOUSE),
                  resources: {
                    [ResourceType.TWIG]: 3,
                    [ResourceType.RESIN]: 0,
                    [ResourceType.PEBBLE]: 0,
                    [ResourceType.BERRY]: 0,
                  },
                },
              ],
              cardContext: CardName.CHIP_SWEEP,
              maxToSelect: 1,
              minToSelect: 1,
              clientOptions: {
                selectedCards: [
                  {
                    ...player.getFirstPlayedCard(CardName.STOREHOUSE),
                    resources: {
                      [ResourceType.TWIG]: 3,
                      [ResourceType.RESIN]: 0,
                      [ResourceType.PEBBLE]: 0,
                      [ResourceType.BERRY]: 0,
                    },
                  },
                ],
              },
            },
            {
              inputType: GameInputType.SELECT_OPTION_GENERIC,
              prevInputType: GameInputType.SELECT_PLAYED_CARDS,
              cardContext: CardName.STOREHOUSE,
              playedCardContext: {
                ...player.getFirstPlayedCard(CardName.STOREHOUSE),
                resources: {
                  [ResourceType.TWIG]: 3,
                  [ResourceType.RESIN]: 0,
                  [ResourceType.PEBBLE]: 0,
                  [ResourceType.BERRY]: 0,
                },
              },
              options: ["3 TWIG", "2 RESIN", "1 PEBBLE", "2 BERRY"],
              clientOptions: { selectedOption: "3 TWIG" },
            },
            {
              inputType: GameInputType.SELECT_OPTION_GENERIC,
              prevInputType: GameInputType.SELECT_PLAYED_CARDS,
              cardContext: CardName.STOREHOUSE,
              playedCardContext: {
                ...player.getFirstPlayedCard(CardName.STOREHOUSE),
                resources: {
                  [ResourceType.TWIG]: 6,
                  [ResourceType.RESIN]: 0,
                  [ResourceType.PEBBLE]: 0,
                  [ResourceType.BERRY]: 0,
                },
              },
              options: ["3 TWIG", "2 RESIN", "1 PEBBLE", "2 BERRY"],
              clientOptions: { selectedOption: "3 TWIG" },
            },
          ],
          { skipMultiPendingInputCheck: true }
        );

        expect(player.getFirstPlayedCard(CardName.STOREHOUSE)).to.eql({
          cardOwnerId: player.playerId,
          cardName: CardName.STOREHOUSE,
          usedForCritter: false,
          workers: [],
          resources: { TWIG: 9, RESIN: 0, PEBBLE: 0, BERRY: 0 },
        });
      });

      it("should give player resources after visiting the storehouse", () => {
        const card = Card.fromName(CardName.STOREHOUSE);
        const storehouse = player.addToCity(gameState, card.name);
        storehouse.resources![ResourceType.BERRY]! = 5;

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD as const,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(card.name),
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(5);
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          workers: [player.playerId],
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 0,
            PEBBLE: 0,
            RESIN: 0,
            TWIG: 0,
          },
          usedForCritter: false,
        });

        gameState.nextPlayer();

        expect(() => {
          multiStepGameInputTest(gameState, [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD as const,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(card.name),
              },
            },
          ]);
        }).to.throwException(/cannot place worker on card/i);
      });

      it("should give player resources from the correct storehouse", () => {
        const card = Card.fromName(CardName.STOREHOUSE);
        const storehouseA = player.addToCity(gameState, card.name);
        const storehouseB = player.addToCity(gameState, card.name);

        storehouseA.resources![ResourceType.BERRY]! = 5;
        storehouseB.resources![ResourceType.PEBBLE]! = 5;

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        expect(player.getPlayedCardForCardName(card.name)[0]).to.eql({
          cardName: card.name,
          workers: [],
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 5,
            PEBBLE: 0,
            RESIN: 0,
            TWIG: 0,
          },
          usedForCritter: false,
        });
        expect(player.getPlayedCardForCardName(card.name)[1]).to.eql({
          cardName: card.name,
          workers: [],
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 0,
            PEBBLE: 5,
            RESIN: 0,
            TWIG: 0,
          },
          usedForCritter: false,
        });

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD as const,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(card.name),
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(5);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        expect(player.getPlayedCardForCardName(card.name)[0]).to.eql({
          cardName: card.name,
          workers: [player.playerId],
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 0,
            PEBBLE: 0,
            RESIN: 0,
            TWIG: 0,
          },
          usedForCritter: false,
        });
        expect(player.getPlayedCardForCardName(card.name)[1]).to.eql({
          cardName: card.name,
          workers: [],
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 0,
            PEBBLE: 5,
            RESIN: 0,
            TWIG: 0,
          },
          usedForCritter: false,
        });

        gameState.nextPlayer();
        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD as const,
            clientOptions: {
              playedCard: player.getPlayedCardForCardName(card.name)[1],
            },
          },
        ]);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(5);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(5);

        expect(player.getPlayedCardForCardName(card.name)[0]).to.eql({
          cardName: card.name,
          workers: [player.playerId],
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 0,
            PEBBLE: 0,
            RESIN: 0,
            TWIG: 0,
          },
          usedForCritter: false,
        });
        expect(player.getPlayedCardForCardName(card.name)[1]).to.eql({
          cardName: card.name,
          workers: [player.playerId],
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 0,
            PEBBLE: 0,
            RESIN: 0,
            TWIG: 0,
          },
          usedForCritter: false,
        });
      });
    });

    describe(CardName.TEACHER, () => {
      it("allow player to give cards to other player using teacher", () => {
        let player1 = gameState.players[0];
        let player2 = gameState.players[1];
        const card = Card.fromName(CardName.TEACHER);

        const topOfDeck = [CardName.FARM, CardName.QUEEN];
        topOfDeck.reverse();
        topOfDeck.forEach((cardName) => {
          gameState.deck.addToStack(cardName);
        });

        // Make sure we can play this card
        player1.gainResources(gameState, card.baseCost);
        player1.addCardToHand(gameState, card.name);

        expect(player1.cardsInHand.length).to.be(1);
        expect(player2.cardsInHand.length).to.be(0);

        const selectCardInput = {
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.TEACHER,
          cardOptions: [CardName.FARM, CardName.QUEEN],
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [CardName.FARM],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          selectCardInput,
          {
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.SELECT_CARDS,
            prevInput: selectCardInput,
            playerOptions: [player2.playerId],
            mustSelectOne: true,
            cardContext: CardName.TEACHER,
            clientOptions: {
              selectedPlayer: player2.playerId,
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);
        player2 = gameState.getPlayer(player2.playerId);

        expect(player1.cardsInHand).to.eql([CardName.FARM]);

        expect(player2.cardsInHand).to.eql([CardName.QUEEN]);
      });
    });

    describe(CardName.THEATRE, () => {
      it("worth 1 extra VP per unique critter", () => {
        const card = Card.fromName(CardName.THEATRE);
        player.addToCity(gameState, card.name);
        const playerId = player.playerId;

        expect(card.getPoints(player, gameState)).to.be(3 + 0);

        player.addToCity(gameState, CardName.DUNGEON);
        expect(card.getPoints(player, gameState)).to.be(3 + 0);

        player.addToCity(gameState, CardName.RANGER);
        expect(card.getPoints(player, gameState)).to.be(3 + 1);

        player.addToCity(gameState, CardName.HUSBAND);
        expect(card.getPoints(player, gameState)).to.be(3 + 1);

        player.addToCity(gameState, CardName.WANDERER);
        expect(card.getPoints(player, gameState)).to.be(3 + 1);

        player.addToCity(gameState, CardName.BARD);
        expect(card.getPoints(player, gameState)).to.be(3 + 2);
      });
    });

    describe(CardName.TWIG_BARGE, () => {
      it("gain 2 TWIG when played", () => {
        const card = Card.fromName(CardName.TWIG_BARGE);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);

        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
        expect(player.hasCardInCity(card.name)).to.be(true);
      });
    });

    describe(CardName.UNDERTAKER, () => {
      it("should allow player to take card from meadow", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK,
        ];
        gameState = testInitialGameState({ meadowCards: cards });
        let player = gameState.getActivePlayer();
        const topOfDeck = [
          CardName.SCHOOL,
          CardName.TEACHER,
          CardName.WIFE,
          CardName.DOCTOR,
        ];
        topOfDeck.reverse();
        topOfDeck.forEach((cardName) => {
          gameState.deck.addToStack(cardName);
        });

        const card = Card.fromName(CardName.UNDERTAKER);

        expect(player.cardsInHand).to.eql([]);
        expect(gameState.meadowCards.indexOf(CardName.DOCTOR)).to.be.lessThan(
          0
        );

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.UNDERTAKER,
            cardOptions: [
              CardName.KING,
              CardName.QUEEN,
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.CHAPEL,
              CardName.MONK,
            ],
            maxToSelect: 3,
            minToSelect: 3,
            clientOptions: {
              selectedCards: [CardName.QUEEN, CardName.KING, CardName.CHAPEL],
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.SELECT_CARDS,
            cardContext: card.name,
            cardOptions: [
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.MONK,
              CardName.SCHOOL,
              CardName.TEACHER,
              CardName.WIFE,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.TEACHER],
            },
          },
        ]);

        expect(player.cardsInHand).to.eql([CardName.TEACHER]);
        expect(
          gameState.meadowCards.indexOf(CardName.DOCTOR)
        ).to.be.greaterThan(0);
      });

      it("should not replenish meadow until the end of the turn", () => {
        const card = Card.fromName(CardName.UNDERTAKER);
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          card.name,
        ];
        gameState = testInitialGameState({ meadowCards: cards });
        let player = gameState.getActivePlayer();
        const topOfDeck = [
          CardName.SCHOOL,
          CardName.TEACHER,
          CardName.WIFE,
          CardName.DOCTOR,
        ];
        topOfDeck.reverse();
        topOfDeck.forEach((cardName) => {
          gameState.deck.addToStack(cardName);
        });

        expect(player.cardsInHand).to.eql([]);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name, { source: "MEADOW" }),
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.UNDERTAKER,
            cardOptions: [
              CardName.KING,
              CardName.QUEEN,
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.CHAPEL,
            ],
            maxToSelect: 3,
            minToSelect: 3,
            clientOptions: {
              selectedCards: [CardName.QUEEN, CardName.KING, CardName.CHAPEL],
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.SELECT_CARDS,
            cardContext: card.name,
            cardOptions: [
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.SCHOOL,
              CardName.TEACHER,
              CardName.WIFE,
              CardName.DOCTOR,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.TEACHER],
            },
          },
        ]);

        expect(player.cardsInHand).to.eql([CardName.TEACHER]);
      });
    });

    describe(CardName.UNIVERSITY, () => {
      it("should allow player remove card from city with university", () => {
        player.addToCity(gameState, CardName.UNIVERSITY);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.CHAPEL);
        player.addToCity(gameState, CardName.MONK);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.hasCardInCity(CardName.FARM)).to.be(true);

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.UNIVERSITY,
          cardOptions: player
            .getPlayedCards()
            .filter(({ cardName }) => cardName !== CardName.UNIVERSITY),
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.UNIVERSITY),
            },
          },
          selectPlayedCardInput,
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInput: selectPlayedCardInput,
            cardContext: CardName.UNIVERSITY,
            options: [
              ResourceType.BERRY,
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.PEBBLE,
            ],
            clientOptions: {
              selectedOption: ResourceType.BERRY,
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.hasCardInCity(CardName.FARM)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
      });

      it("remove card with non-permanently placed worker on it", () => {
        player.addToCity(gameState, CardName.UNIVERSITY);
        player.addToCity(gameState, CardName.LOOKOUT);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        player.placeWorkerOnCard(
          gameState,
          player.getFirstPlayedCard(CardName.LOOKOUT)
        );
        expect(player.numAvailableWorkers).to.be(1);

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.UNIVERSITY,
          cardOptions: player
            .getPlayedCards()
            .filter(({ cardName }) => cardName !== CardName.UNIVERSITY),
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            // these are the cards the player wants to remove
            // from their city
            selectedCards: [
              ...player.getPlayedCardForCardName(CardName.LOOKOUT),
            ],
          },
        };

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.UNIVERSITY),
            },
          },
          selectPlayedCardInput,
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInput: selectPlayedCardInput,
            cardContext: CardName.UNIVERSITY,
            options: [
              ResourceType.BERRY,
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.PEBBLE,
            ],
            clientOptions: {
              selectedOption: ResourceType.BERRY,
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(0);
        expect(player.hasCardInCity(CardName.LOOKOUT)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
        player.recallWorkers(gameState);
        expect(player.numAvailableWorkers).to.be(2);
      });

      it("remove card with another player's worker on it", () => {
        let player1 = gameState.getActivePlayer();
        let player2 = gameState.players[1];

        player1.addToCity(gameState, CardName.UNIVERSITY);
        player1.addToCity(gameState, CardName.INN);
        player2.addToCity(gameState, CardName.LOOKOUT);

        expect(player1.numAvailableWorkers).to.be(2);
        expect(player2.numAvailableWorkers).to.be(2);
        expect(player1.getNumResourcesByType(ResourceType.VP)).to.be(0);
        player2.placeWorkerOnCard(
          gameState,
          player1.getFirstPlayedCard(CardName.INN)
        );
        player2.placeWorkerOnCard(
          gameState,
          player2.getFirstPlayedCard(CardName.LOOKOUT)
        );
        expect(player2.numAvailableWorkers).to.be(0);

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.UNIVERSITY,
          cardOptions: player1
            .getPlayedCards()
            .filter(({ cardName }) => cardName !== CardName.UNIVERSITY),
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [...player1.getPlayedCardForCardName(CardName.INN)],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player1.getFirstPlayedCard(CardName.UNIVERSITY),
            },
          },
          selectPlayedCardInput,
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInput: selectPlayedCardInput,
            cardContext: CardName.UNIVERSITY,
            options: [
              ResourceType.BERRY,
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.PEBBLE,
            ],
            clientOptions: {
              selectedOption: ResourceType.TWIG,
            },
          },
        ]);
        player1 = gameState.getPlayer(player1.playerId);
        player2 = gameState.getPlayer(player2.playerId);

        player2.recallWorkers(gameState);
        expect(player2.numAvailableWorkers).to.be(2);
      });

      it("remove card with permanently placed worker on it", () => {
        player.addToCity(gameState, CardName.UNIVERSITY);
        player.addToCity(gameState, CardName.MONASTERY);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        player.placeWorkerOnCard(
          gameState,
          player.getFirstPlayedCard(CardName.MONASTERY)
        );
        expect(player.numAvailableWorkers).to.be(1);

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.UNIVERSITY,
          cardOptions: player
            .getPlayedCards()
            .filter(({ cardName }) => cardName !== CardName.UNIVERSITY),
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            // these are the cards the player wants to remove
            // from their city
            selectedCards: [
              ...player.getPlayedCardForCardName(CardName.MONASTERY),
            ],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.UNIVERSITY),
            },
          },
          selectPlayedCardInput,
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInput: selectPlayedCardInput,
            cardContext: CardName.UNIVERSITY,
            options: [
              ResourceType.BERRY,
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.PEBBLE,
            ],
            clientOptions: {
              selectedOption: ResourceType.TWIG,
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(0);
        player.recallWorkers(gameState);
        expect(player.numAvailableWorkers).to.be(1);
      });
    });

    describe(CardName.WANDERER, () => {
      it("should gain 3 cards when played", () => {
        const card = Card.fromName(CardName.WANDERER);
        const gameInput = playCardInput(card.name);

        gameState.deck.addToStack(CardName.FARM);
        gameState.deck.addToStack(CardName.FARM);
        gameState.deck.addToStack(CardName.FARM);

        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        expect(player.cardsInHand).to.eql([card.name]);

        [player, gameState] = multiStepGameInputTest(gameState, [gameInput]);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.cardsInHand).to.eql([
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
        ]);
      });
    });

    describe(CardName.WIFE, () => {
      it("should be worth 3 points when paired with HUSBAND", () => {
        expect(player.getPointsFromCards(gameState)).to.be(0);

        player.addToCity(gameState, CardName.WIFE);
        expect(player.getPointsFromCards(gameState)).to.be(2);

        player.addToCity(gameState, CardName.WIFE);
        expect(player.getPointsFromCards(gameState)).to.be(4);

        player.addToCity(gameState, CardName.HUSBAND);
        expect(player.getPointsFromCards(gameState)).to.be(6 + 3);

        player.addToCity(gameState, CardName.HUSBAND);
        expect(player.getPointsFromCards(gameState)).to.be(8 + 3 + 3);

        player.addToCity(gameState, CardName.HUSBAND);
        expect(player.getPointsFromCards(gameState)).to.be(10 + 3 + 3);
      });
    });

    describe(CardName.WOODCARVER, () => {
      it("should not prompt player if they don't have any twigs", () => {
        const card = Card.fromName(CardName.WOODCARVER);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(card.name)],
          { autoAdvance: true }
        );

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      });

      it("should allow player to pay up to 3 twig for vp", () => {
        const card = Card.fromName(CardName.WOODCARVER);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        // Make sure we can spend for vp
        player.gainResources(gameState, { [ResourceType.TWIG]: 3 });
        player.addCardToHand(gameState, card.name);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_RESOURCES,
            toSpend: true,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.WOODCARVER,
            specificResource: ResourceType.TWIG,
            minResources: 0,
            maxResources: 3,
            clientOptions: {
              resources: {
                [ResourceType.TWIG]: 3,
              },
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(3);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
      });
    });

    /**
     * Pearlbrook cards.
     */
    describe(CardName.BRIDGE, () => {
      it("should increase your max hand size by the number of PEARL", () => {
        expect(player.maxHandSize).to.be(8);

        player.addToCity(gameState, CardName.BRIDGE);
        expect(player.maxHandSize).to.be(8);

        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
        expect(player.maxHandSize).to.be(9);

        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
        expect(player.maxHandSize).to.be(10);
      });

      it("should draw 2 cards every time you gain a PEARL", () => {
        player.addToCity(gameState, CardName.BRIDGE);

        expect(player.numCardsInHand).to.be(0);

        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
        expect(player.numCardsInHand).to.be(2);

        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
        expect(player.numCardsInHand).to.be(4);

        player.gainResources(gameState, { [ResourceType.PEARL]: 4 });
        expect(player.numCardsInHand).to.be(12);

        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
        expect(player.numCardsInHand).to.be(14);

        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
        expect(player.numCardsInHand).to.be(16);

        player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
        // MAX hand size reached!
        expect(player.numCardsInHand).to.be(17);
      });

      it("should do nothing", () => {
        const card = Card.fromName(CardName.BRIDGE);

        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, {
          [ResourceType.PEARL]: 2,
        });
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);
        expect(player.maxHandSize).to.be(10);
      });
    });

    describe(CardName.HARBOR, () => {
      const card = Card.fromName(CardName.HARBOR);

      it("should do nothing if fewer than 2 PEARL", () => {
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);
        expect(player.hasCardInCity(card.name)).to.be(true);
      });

      it("should gain a wild resource if at least 2 PEARL", () => {
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        player.gainResources(gameState, { [ResourceType.PEARL]: 2 });

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_RESOURCES,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: card.name,
            maxResources: 2,
            minResources: 2,
            toSpend: false,
            clientOptions: {
              resources: { [ResourceType.BERRY]: 2 },
            },
          },
        ]);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      });
    });

    describe(CardName.FERRY_FERRET, () => {
      const card = Card.fromName(CardName.FERRY_FERRET);

      it("should do nothing if fewer than 2 PEARL", () => {
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
      });

      it("should gain 2 VP if at least 2 PEARL", () => {
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        player.gainResources(gameState, { [ResourceType.PEARL]: 2 });
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(2);
      });

      it("should gain 2 VP if at least 2 PEARL when prepare for season", () => {
        player.gainResources(gameState, { [ResourceType.PEARL]: 2 });
        player.addToCity(gameState, card.name);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        player.activateProduction(gameState, {
          inputType: GameInputType.PREPARE_FOR_SEASON,
        });
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(2);
      });
    });

    describe(CardName.SHIPWRIGHT, () => {
      const card = Card.fromName(CardName.SHIPWRIGHT);

      it("should be worth 1 point per Pearlbrook card", () => {
        const playerId = player.playerId;
        player.addToCity(gameState, card.name);

        expect(card.getPoints(player, gameState)).to.be(2 + 1 /* itself */);

        player.addToCity(gameState, CardName.PIRATE);
        expect(card.getPoints(player, gameState)).to.be(2 + 2);

        player.addToCity(gameState, CardName.WIFE);
        expect(card.getPoints(player, gameState)).to.be(2 + 2);

        player.addToCity(gameState, CardName.HARBOR);
        expect(card.getPoints(player, gameState)).to.be(2 + 3);
      });
    });

    describe(CardName.MESSENGER, () => {
      const card = Card.fromName(CardName.MESSENGER);

      it("should not be playable w/o a construction", () => {
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        expect(() => {
          multiStepGameInputTest(gameState, [playCardInput(card.name)]);
        }).to.throwException(/Cannot add Messenger/);
      });

      it("should be playable w a construction", () => {
        player.addToCity(gameState, CardName.FARM);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(card.name)],
          { autoAdvance: true }
        );
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
        expect(player.getFirstPlayedCard(CardName.FARM)).to.eql({
          cardName: CardName.FARM,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          shareSpaceWith: card.name,
        });
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.FARM,
        });
      });

      it("should be relocated if Construction is destroyed", () => {
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.MESSENGER);
        player.addToCity(gameState, CardName.UNIVERSITY);

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

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.UNIVERSITY,
          cardOptions: player
            .getPlayedCards()
            .filter(({ cardName }) => cardName !== CardName.UNIVERSITY),
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
          },
        };

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.UNIVERSITY),
              },
            },
            selectPlayedCardInput,
            {
              inputType: GameInputType.SELECT_OPTION_GENERIC,
              prevInputType: GameInputType.SELECT_PLAYED_CARDS,
              prevInput: selectPlayedCardInput,
              cardContext: CardName.UNIVERSITY,
              options: [
                ResourceType.BERRY,
                ResourceType.TWIG,
                ResourceType.RESIN,
                ResourceType.PEBBLE,
              ],
              clientOptions: {
                selectedOption: ResourceType.BERRY,
              },
            },
          ],
          { autoAdvance: true }
        );
        expect(player.getFirstPlayedCard(CardName.MESSENGER)).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.UNIVERSITY,
        });

        expect(player.getFirstPlayedCard(CardName.UNIVERSITY)).to.eql({
          cardName: CardName.UNIVERSITY,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          workers: [player.playerId],
          shareSpaceWith: CardName.MESSENGER,
        });
      });

      it("should be relocated if Construction is moved", () => {
        player.addToCity(gameState, CardName.PIRATE_SHIP);
        player.addToCity(gameState, CardName.MESSENGER);

        player.updatePlayedCard(
          gameState,
          player.getFirstPlayedCard(CardName.PIRATE_SHIP),
          { shareSpaceWith: CardName.MESSENGER }
        );
        player.updatePlayedCard(
          gameState,
          player.getFirstPlayedCard(CardName.MESSENGER),
          { shareSpaceWith: CardName.PIRATE_SHIP }
        );

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.PIRATE_SHIP),
              },
            },
          ],
          { autoAdvance: true }
        );

        expect(player.getFirstPlayedCard(CardName.MESSENGER)).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: undefined,
        });

        const targetPlayer = gameState.players[1];
        expect(targetPlayer.getFirstPlayedCard(CardName.PIRATE_SHIP)).to.eql({
          cardName: CardName.PIRATE_SHIP,
          cardOwnerId: targetPlayer.playerId,
          usedForCritter: false,
          workers: [player.playerId],
          shareSpaceWith: undefined,
        });
      });

      it("should remove from Construction if MESSENGER is removed from city", () => {
        player.addToCity(gameState, CardName.FARM);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(card.name)],
          { autoAdvance: true }
        );
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.getFirstPlayedCard(CardName.FARM)).to.eql({
          cardName: CardName.FARM,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          shareSpaceWith: card.name,
        });
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.FARM,
        });
      });

      it("should remove from Construction if MESSENGER removed by UNIVERSITY", () => {
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.MESSENGER);
        player.addToCity(gameState, CardName.UNIVERSITY);

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

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.UNIVERSITY,
          cardOptions: player
            .getPlayedCards()
            .filter(({ cardName }) => cardName !== CardName.UNIVERSITY),
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.MESSENGER)],
          },
        };

        expect(player.getFirstPlayedCard(CardName.FARM)).to.eql({
          cardName: CardName.FARM,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          shareSpaceWith: CardName.MESSENGER,
        });

        expect(player.getFirstPlayedCard(CardName.MESSENGER)).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.FARM,
        });

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.UNIVERSITY),
              },
            },
            selectPlayedCardInput,
            {
              inputType: GameInputType.SELECT_OPTION_GENERIC,
              prevInputType: GameInputType.SELECT_PLAYED_CARDS,
              prevInput: selectPlayedCardInput,
              cardContext: CardName.UNIVERSITY,
              options: [
                ResourceType.BERRY,
                ResourceType.TWIG,
                ResourceType.RESIN,
                ResourceType.PEBBLE,
              ],
              clientOptions: {
                selectedOption: ResourceType.BERRY,
              },
            },
          ],
          { autoAdvance: true }
        );
        expect(player.getFirstPlayedCard(CardName.FARM)).to.eql({
          cardName: CardName.FARM,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          shareSpaceWith: undefined,
        });
      });

      it("should be relocated to Player's chosen card if shared construction is removed by UNIVERSITY", () => {
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.TWIG_BARGE);
        player.addToCity(gameState, CardName.MESSENGER);
        player.addToCity(gameState, CardName.UNIVERSITY);

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

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.UNIVERSITY,
          cardOptions: player
            .getPlayedCards()
            .filter(({ cardName }) => cardName !== CardName.UNIVERSITY),
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
          },
        };

        expect(player.getFirstPlayedCard(CardName.FARM)).to.eql({
          cardName: CardName.FARM,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          shareSpaceWith: CardName.MESSENGER,
        });

        // gameinput asking player to choose card
        const selectPlayedCardInputMessenger = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.MESSENGER,
          playedCardContext: {
            cardOwnerId: player.playerId,
            cardName: CardName.MESSENGER,
            shareSpaceWith: undefined,
          },
          cardOptions: [
            ...player.getPlayedCardForCardName(CardName.TWIG_BARGE),
            {
              cardOwnerId: player.playerId,
              cardName: CardName.UNIVERSITY,
              usedForCritter: false,
              workers: [player.playerId],
            },
          ],
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.TWIG_BARGE)],
          },
        };

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.UNIVERSITY),
              },
            },
            selectPlayedCardInput,
            {
              inputType: GameInputType.SELECT_OPTION_GENERIC,
              prevInputType: GameInputType.SELECT_PLAYED_CARDS,
              prevInput: selectPlayedCardInput,
              cardContext: CardName.UNIVERSITY,
              options: [
                ResourceType.BERRY,
                ResourceType.TWIG,
                ResourceType.RESIN,
                ResourceType.PEBBLE,
              ],
              clientOptions: {
                selectedOption: ResourceType.BERRY,
              },
            },
            selectPlayedCardInputMessenger,
          ],
          { autoAdvance: true }
        );
      });

      it("should be relocated to RUINS if Construction is destroyed via played RUINS", () => {
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
        player.addCardToHand(gameState, CardName.RUINS);

        expect(player.getFirstPlayedCard(CardName.MESSENGER)).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.FARM,
        });

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(CardName.RUINS)],
          { autoAdvance: true }
        );

        expect(player.hasCardInCity(CardName.MESSENGER)).to.be(true);
        expect(player.getFirstPlayedCard(CardName.MESSENGER)).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.RUINS,
        });
        expect(player.hasCardInCity(CardName.RUINS)).to.be(true);
        expect(player.getFirstPlayedCard(CardName.RUINS)).to.eql({
          cardName: CardName.RUINS,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          shareSpaceWith: CardName.MESSENGER,
        });
      });

      it("should be relocated to Player's chosen card if Construction is destroyed via played RUINS", () => {
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.TWIG_BARGE);
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
        player.addCardToHand(gameState, CardName.RUINS);

        expect(player.getFirstPlayedCard(CardName.MESSENGER)).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.FARM,
        });

        const selectPlayedCardInputRuins = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardOptions: [
            ...player.getPlayedCardForCardName(CardName.FARM),
            ...player.getPlayedCardForCardName(CardName.TWIG_BARGE),
          ],
          cardContext: CardName.RUINS,
          playedCardContext: undefined,
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
          },
        };

        // gameinput asking player to choose card
        const selectPlayedCardInputMessenger = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.MESSENGER,
          playedCardContext: {
            cardOwnerId: player.playerId,
            cardName: CardName.MESSENGER,
            shareSpaceWith: undefined,
          },
          cardOptions: [
            ...player.getPlayedCardForCardName(CardName.TWIG_BARGE),
            {
              cardOwnerId: player.playerId,
              cardName: CardName.RUINS,
              usedForCritter: false,
            },
          ],
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.TWIG_BARGE)],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(CardName.RUINS),
          selectPlayedCardInputRuins,
          selectPlayedCardInputMessenger,
        ]);

        expect(player.hasCardInCity(CardName.MESSENGER)).to.be(true);

        expect(player.getFirstPlayedCard(CardName.MESSENGER)).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.TWIG_BARGE,
        });
        expect(player.hasCardInCity(CardName.RUINS)).to.be(true);
        expect(player.getFirstPlayedCard(CardName.RUINS)).to.eql({
          cardName: CardName.RUINS,
          cardOwnerId: player.playerId,
          usedForCritter: false,
        });
      });

      // See: https://boardgamegeek.com/thread/2261133/article/32762766#32762766
      it("should be remain if there is no Construction to move to", () => {
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.UNIVERSITY);
        player.addToCity(gameState, CardName.MESSENGER);
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
        player.updatePlayedCard(
          gameState,
          player.getFirstPlayedCard(CardName.UNIVERSITY),
          { shareSpaceWith: CardName.MESSENGER }
        );
        player.updatePlayedCard(
          gameState,
          player.getPlayedCardForCardName(CardName.MESSENGER)[1],
          { shareSpaceWith: CardName.UNIVERSITY }
        );

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.UNIVERSITY,
          cardOptions: player
            .getPlayedCards()
            .filter(({ cardName }) => cardName !== CardName.UNIVERSITY),
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
          },
        };

        expect(
          player.getPlayedCardForCardName(CardName.MESSENGER).length
        ).to.be(2);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.UNIVERSITY),
              },
            },
            selectPlayedCardInput,
            {
              inputType: GameInputType.SELECT_OPTION_GENERIC,
              prevInputType: GameInputType.SELECT_PLAYED_CARDS,
              prevInput: selectPlayedCardInput,
              cardContext: CardName.UNIVERSITY,
              options: [
                ResourceType.BERRY,
                ResourceType.TWIG,
                ResourceType.RESIN,
                ResourceType.PEBBLE,
              ],
              clientOptions: {
                selectedOption: ResourceType.BERRY,
              },
            },
          ],
          { autoAdvance: true }
        );
        expect(player.getPlayedCardForCardName(CardName.MESSENGER)).to.eql([
          {
            cardName: CardName.MESSENGER,
            cardOwnerId: player.playerId,
            shareSpaceWith: undefined,
          },
          {
            cardName: CardName.MESSENGER,
            cardOwnerId: player.playerId,
            shareSpaceWith: CardName.UNIVERSITY,
          },
        ]);
        expect(
          player.getPlayedCardForCardName(CardName.MESSENGER).length
        ).to.be(2);
      });

      it("should be relocated when attached to Crane and Crane is used", () => {
        player.addToCity(gameState, CardName.CRANE);
        player.addToCity(gameState, CardName.MESSENGER);
        player.gainResources(gameState, { [ResourceType.TWIG]: 1 });

        // attach the Messenger to the Crane
        player.updatePlayedCard(
          gameState,
          player.getFirstPlayedCard(CardName.CRANE),
          { shareSpaceWith: CardName.MESSENGER }
        );
        player.updatePlayedCard(
          gameState,
          player.getFirstPlayedCard(CardName.MESSENGER),
          { shareSpaceWith: CardName.CRANE }
        );
        player.addCardToHand(gameState, CardName.FAIRGROUNDS);

        expect(player.getFirstPlayedCard(CardName.MESSENGER)).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.CRANE,
        });

        expect(player.hasCardInCity(CardName.CRANE)).to.be(true);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            playCardInput(CardName.FAIRGROUNDS, {
              paymentOptions: {
                cardToUse: CardName.CRANE,
                resources: {
                  [ResourceType.TWIG]: 1,
                  [ResourceType.RESIN]: 0,
                  [ResourceType.PEBBLE]: 0,
                },
              },
            }),
          ],
          { autoAdvance: true }
        );

        expect(player.hasCardInCity(CardName.CRANE)).to.be(false);
        expect(player.hasCardInCity(CardName.FAIRGROUNDS)).to.be(true);
        expect(player.hasCardInCity(CardName.MESSENGER)).to.be(true);

        expect(player.getFirstPlayedCard(CardName.MESSENGER)).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.FAIRGROUNDS,
        });

        expect(player.getFirstPlayedCard(CardName.FAIRGROUNDS)).to.eql({
          cardName: CardName.FAIRGROUNDS,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          shareSpaceWith: CardName.MESSENGER,
        });

        // expect that active player is now the next player, since
        // the messenger moved automatically
        expect(gameState.getActivePlayer().playerId).to.not.eql(
          player.playerId
        );
      });

      // multiple messengers
      it("should handle unpaired messengers and RUINS", () => {
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.TWIG_BARGE);
        player.addToCity(gameState, CardName.MESSENGER);
        player.addToCity(gameState, CardName.MESSENGER);

        let playedMessengers = player.getPlayedCardForCardName(
          CardName.MESSENGER
        );
        expect(
          player.getPlayedCardForCardName(CardName.MESSENGER).length
        ).to.be(2);

        player.updatePlayedCard(
          gameState,
          player.getFirstPlayedCard(CardName.FARM),
          { shareSpaceWith: CardName.MESSENGER }
        );
        player.updatePlayedCard(gameState, playedMessengers[0], {
          shareSpaceWith: CardName.FARM,
        });

        player.updatePlayedCard(
          gameState,
          player.getFirstPlayedCard(CardName.TWIG_BARGE),
          { shareSpaceWith: CardName.MESSENGER }
        );
        player.updatePlayedCard(gameState, playedMessengers[1], {
          shareSpaceWith: CardName.TWIG_BARGE,
        });

        player.addCardToHand(gameState, CardName.RUINS);

        playedMessengers = player.getPlayedCardForCardName(CardName.MESSENGER);

        expect(playedMessengers[0]).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.FARM,
        });

        expect(playedMessengers[1]).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.TWIG_BARGE,
        });

        const selectPlayedCardInputRuins = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardOptions: [
            ...player.getPlayedCardForCardName(CardName.FARM),
            ...player.getPlayedCardForCardName(CardName.TWIG_BARGE),
          ],
          cardContext: CardName.RUINS,
          playedCardContext: undefined,
          maxToSelect: 1,
          minToSelect: 1,
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
          },
        };

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(CardName.RUINS), selectPlayedCardInputRuins],
          { autoAdvance: true }
        );

        expect(player.hasCardInCity(CardName.MESSENGER)).to.be(true);

        playedMessengers = player.getPlayedCardForCardName(CardName.MESSENGER);
        expect(playedMessengers.length).to.be(2);

        // if we destroy one of the constructions, the messenger should stick to the RUINS
        // because the other card already has a messenger on it
        expect(playedMessengers[0]).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.RUINS,
        });

        expect(playedMessengers[1]).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.TWIG_BARGE,
        });
        expect(player.hasCardInCity(CardName.RUINS)).to.be(true);
        expect(player.getFirstPlayedCard(CardName.RUINS)).to.eql({
          cardName: CardName.RUINS,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          shareSpaceWith: CardName.MESSENGER,
        });
      });

      it("should pair unpaired messengers with newly added constructions", () => {
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.MESSENGER);
        player.removeCardFromCity(
          gameState,
          player.getFirstPlayedCard(CardName.FARM)
        );

        player.addCardToHand(gameState, CardName.TWIG_BARGE);
        player.gainResources(gameState, { TWIG: 1, PEBBLE: 1 });

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(CardName.TWIG_BARGE)],
          { autoAdvance: true }
        );

        const playedMessengers = player.getPlayedCardForCardName(
          CardName.MESSENGER
        );

        expect(playedMessengers[0]).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.TWIG_BARGE,
        });

        expect(player.hasCardInCity(CardName.MESSENGER)).to.be(true);
        expect(player.hasCardInCity(CardName.TWIG_BARGE)).to.be(true);
        expect(player.getFirstPlayedCard(CardName.TWIG_BARGE)).to.eql({
          cardName: CardName.TWIG_BARGE,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          shareSpaceWith: CardName.MESSENGER,
        });
        expect(player.getFirstPlayedCard(CardName.MESSENGER)).to.eql({
          cardName: CardName.MESSENGER,
          cardOwnerId: player.playerId,
          shareSpaceWith: CardName.TWIG_BARGE,
        });
      });
    });

    describe(CardName.PIRATE_SHIP, () => {
      const card = Card.fromName(CardName.PIRATE_SHIP);

      it("should not be playable if there's no applicable destination city", () => {
        gameState.players.forEach((p) => {
          for (let i = 0; i < 15; i++) {
            p.addToCity(gameState, card.name);
          }
        });

        expect(() => {
          multiStepGameInputTest(gameState, [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(card.name),
              },
            },
          ]);
        }).to.throwException(/No space in any opponent's city/);
      });

      it("should move to opponent's city", () => {
        gameState = testInitialGameState({ numPlayers: 3 });
        player = gameState.getActivePlayer();

        let targetPlayer = gameState.players[1];

        player.addToCity(gameState, card.name);
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(false);

        const visitDestinationInput = {
          inputType: GameInputType.VISIT_DESTINATION_CARD as const,
          clientOptions: {
            playedCard: player.getFirstPlayedCard(card.name),
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          visitDestinationInput,
          {
            inputType: GameInputType.SELECT_PLAYER,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            prevInput: visitDestinationInput,
            cardContext: card.name,
            playerOptions: [
              targetPlayer.playerId,
              gameState.players[2].playerId,
            ],
            mustSelectOne: true,
            clientOptions: { selectedPlayer: targetPlayer.playerId },
          },
        ]);

        targetPlayer = gameState.getPlayer(targetPlayer.playerId);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(true);
      });

      it("should be able to exchange pirate ships", () => {
        gameState = testInitialGameState({ numPlayers: 2 });

        let player1 = gameState.players[0];
        let player2 = gameState.players[1];

        player1.addToCity(gameState, card.name);
        player2.addToCity(gameState, card.name);
        expect(player1.hasCardInCity(card.name)).to.be(true);
        expect(player2.hasCardInCity(card.name)).to.be(true);
        expect(player1.getPlayedCardForCardName(card.name).length).to.be(1);
        expect(player2.getPlayedCardForCardName(card.name).length).to.be(1);

        // Player 1 moves pirate ship to Player 2
        [, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player1.getFirstPlayedCard(card.name),
              },
            },
          ],
          { autoAdvance: true }
        );

        player1 = gameState.players[0];
        player2 = gameState.players[1];
        expect(player1.hasCardInCity(card.name)).to.be(false);
        expect(player2.hasCardInCity(card.name)).to.be(true);
        expect(player1.getPlayedCardForCardName(card.name).length).to.be(0);
        expect(player2.getPlayedCardForCardName(card.name).length).to.be(2);

        // Player 2 moves pirate ship to Player 1
        [, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player2.getPlayedCardForCardName(card.name)[1],
              },
            },
          ],
          { autoAdvance: true }
        );

        player1 = gameState.players[0];
        player2 = gameState.players[1];
        expect(player1.hasCardInCity(card.name)).to.be(true);
        expect(player2.hasCardInCity(card.name)).to.be(true);
        expect(player1.getPlayedCardForCardName(card.name).length).to.be(1);
        expect(player2.getPlayedCardForCardName(card.name).length).to.be(1);
      });

      it("should auto advance moving to an opponent's city", () => {
        let targetPlayer = gameState.players[1];

        player.addToCity(gameState, card.name);
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(false);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(card.name),
              },
            },
          ],
          { autoAdvance: true }
        );

        targetPlayer = gameState.getPlayer(targetPlayer.playerId);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(true);
      });

      it("should gain resources if opponent has pearls city", () => {
        let targetPlayer = gameState.players[1];

        player.addToCity(gameState, card.name);
        targetPlayer.gainResources(gameState, { [ResourceType.PEARL]: 2 });

        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(card.name),
              },
            },
            {
              inputType: GameInputType.SELECT_RESOURCES,
              prevInputType: GameInputType.SELECT_PLAYER,
              toSpend: false,
              maxResources: 2,
              minResources: 2,
              clientOptions: {
                resources: {
                  [ResourceType.BERRY]: 1,
                  [ResourceType.PEBBLE]: 1,
                },
              },
              cardContext: card.name,
            },
          ],
          { autoAdvance: true }
        );

        targetPlayer = gameState.getPlayer(targetPlayer.playerId);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(true);
      });

      it("should be able to take the last spot in the opponent city", () => {
        let targetPlayer = gameState.players[1];
        for (let i = 0; i < 14; i++) {
          targetPlayer.addToCity(gameState, CardName.FARM);
        }

        player.addToCity(gameState, card.name);
        targetPlayer.gainResources(gameState, { [ResourceType.PEARL]: 2 });

        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(card.name),
              },
            },
            {
              inputType: GameInputType.SELECT_RESOURCES,
              prevInputType: GameInputType.SELECT_PLAYER,
              toSpend: false,
              maxResources: 2,
              minResources: 2,
              clientOptions: {
                resources: {
                  [ResourceType.BERRY]: 1,
                  [ResourceType.PEBBLE]: 1,
                },
              },
              cardContext: card.name,
            },
          ],
          { autoAdvance: true }
        );

        targetPlayer = gameState.getPlayer(targetPlayer.playerId);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(true);
      });

      it("should gain up to 3 resources if opponent has pearls city", () => {
        let targetPlayer = gameState.players[1];

        player.addToCity(gameState, card.name);
        targetPlayer.gainResources(gameState, { [ResourceType.PEARL]: 10 });

        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(card.name),
              },
            },
            {
              inputType: GameInputType.SELECT_RESOURCES,
              prevInputType: GameInputType.SELECT_PLAYER,
              toSpend: false,
              maxResources: 3,
              minResources: 3,
              clientOptions: {
                resources: {
                  [ResourceType.BERRY]: 2,
                  [ResourceType.PEBBLE]: 1,
                },
              },
              cardContext: card.name,
            },
          ],
          { autoAdvance: true }
        );

        targetPlayer = gameState.getPlayer(targetPlayer.playerId);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(3);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(true);
      });

      it("should be able to recall workers after", () => {
        let targetPlayer = gameState.players[1];

        // Place first worker.
        gameState.locationsMap[LocationName.BASIC_ONE_BERRY]!.push(
          player.playerId,
          player.playerId
        );
        player.placeWorkerOnLocation(LocationName.BASIC_ONE_BERRY);

        player.addToCity(gameState, card.name);
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(false);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(card.name),
              },
            },
          ],
          { autoAdvance: true }
        );
        targetPlayer = gameState.getPlayer(targetPlayer.playerId);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(true);

        expect(player.numAvailableWorkers).to.be(0);
        expect(targetPlayer.getFirstPlayedCard(card.name)).to.eql({
          cardOwnerId: targetPlayer.playerId,
          cardName: card.name,
          usedForCritter: false,
          workers: [player.playerId],
        });

        player.recallWorkers(gameState);

        expect(player.numAvailableWorkers).to.be(2);
        expect(targetPlayer.getFirstPlayedCard(card.name)).to.eql({
          cardOwnerId: targetPlayer.playerId,
          cardName: card.name,
          usedForCritter: false,
          workers: [],
        });
      });

      it("should retain PlayedCardInfo on Pirate Ship", () => {
        let targetPlayer = gameState.players[1];

        const playedPirateShip = player.addToCity(gameState, card.name);
        player.updatePlayedCard(gameState, playedPirateShip, {
          usedForCritter: true,
        });

        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardOwnerId: player.playerId,
          cardName: card.name,
          usedForCritter: true,
          workers: [],
        });

        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(false);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(card.name),
              },
            },
          ],
          { autoAdvance: true }
        );

        targetPlayer = gameState.getPlayer(targetPlayer.playerId);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(targetPlayer.hasCardInCity(card.name)).to.be(true);
        expect(targetPlayer.getFirstPlayedCard(card.name)).to.eql({
          cardOwnerId: targetPlayer.playerId,
          cardName: card.name,
          usedForCritter: true,
          workers: [player.playerId],
        });
      });
    });

    describe(CardName.FERRY, () => {
      const card = Card.fromName(CardName.FERRY);

      beforeEach(() => {
        gameState = testInitialGameState({ gameOptions: { pearlbrook: true } });
        player = gameState.getActivePlayer();

        gameState.riverDestinationMap!.spots[
          RiverDestinationSpotName.TWO_TRAVELER
        ].name = RiverDestinationName.BALLROOM;
      });

      it("should not be visitable if there are no revealed river destinations", () => {
        player.addToCity(gameState, card.name);
        expect(() => {
          multiStepGameInputTest(gameState, [
            {
              inputType: GameInputType.PLACE_AMBASSADOR,
              clientOptions: {
                loc: {
                  type: "card",
                  playedCard: player.getFirstPlayedCard(card.name),
                },
              },
            },
          ]);
        }).to.throwException(/No revealed river destinations to copy/);
      });

      it("should be visitable if there are revealed river destinations", () => {
        player.addToCity(gameState, card.name);
        gameState.riverDestinationMap!.spots[
          RiverDestinationSpotName.TWO_TRAVELER
        ].revealed = true;

        expect(player.hasUnusedAmbassador()).to.be(true);
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          ambassador: null,
          cardOwnerId: player.playerId,
          usedForCritter: false,
        });

        player.gainResources(gameState, {
          [ResourceType.RESIN]: 1,
          [ResourceType.VP]: 1,
        });

        expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
        expect(player.numCardsInHand).to.be(0);
        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.PLACE_AMBASSADOR,
            clientOptions: {
              loc: {
                type: "card",
                playedCard: player.getFirstPlayedCard(card.name),
              },
            },
          },
          {
            inputType: GameInputType.SELECT_RIVER_DESTINATION,
            prevInputType: GameInputType.PLACE_AMBASSADOR,
            options: [RiverDestinationName.BALLROOM],
            cardContext: CardName.FERRY,
            clientOptions: { riverDestination: RiverDestinationName.BALLROOM },
          },
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.PLACE_AMBASSADOR,
            riverDestinationContext: RiverDestinationName.BALLROOM,
            options: ["Ok", "Decline"],
            clientOptions: { selectedOption: "Ok" },
          },
        ]);
        expect(player.hasUnusedAmbassador()).to.be(false);
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          ambassador: player.playerId,
          cardOwnerId: player.playerId,
          usedForCritter: false,
        });
        expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.numCardsInHand).to.be(3);
      });

      it("should auto advance if there's only one option", () => {
        player.addToCity(gameState, card.name);
        gameState.riverDestinationMap!.spots[
          RiverDestinationSpotName.TWO_TRAVELER
        ].revealed = true;

        expect(player.hasUnusedAmbassador()).to.be(true);
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          ambassador: null,
          cardOwnerId: player.playerId,
          usedForCritter: false,
        });

        player.gainResources(gameState, {
          [ResourceType.RESIN]: 1,
          [ResourceType.VP]: 1,
        });

        expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
        expect(player.numCardsInHand).to.be(0);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.PLACE_AMBASSADOR,
              clientOptions: {
                loc: {
                  type: "card",
                  playedCard: player.getFirstPlayedCard(card.name),
                },
              },
            },
            {
              inputType: GameInputType.SELECT_OPTION_GENERIC,
              prevInputType: GameInputType.PLACE_AMBASSADOR,
              riverDestinationContext: RiverDestinationName.BALLROOM,
              options: ["Ok", "Decline"],
              clientOptions: { selectedOption: "Ok" },
            },
          ],
          { autoAdvance: true }
        );
        expect(player.hasUnusedAmbassador()).to.be(false);
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          ambassador: player.playerId,
          cardOwnerId: player.playerId,
          usedForCritter: false,
        });
        expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.numCardsInHand).to.be(3);
      });

      it("should recall ambassador properly", () => {
        player.addToCity(gameState, card.name);
        gameState.riverDestinationMap!.spots[
          RiverDestinationSpotName.TWO_TRAVELER
        ].revealed = true;

        expect(player.hasUnusedAmbassador()).to.be(true);
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          ambassador: null,
          cardOwnerId: player.playerId,
          usedForCritter: false,
        });

        player.gainResources(gameState, {
          [ResourceType.RESIN]: 1,
          [ResourceType.VP]: 1,
        });

        expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
        expect(player.numCardsInHand).to.be(0);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            {
              inputType: GameInputType.PLACE_AMBASSADOR,
              clientOptions: {
                loc: {
                  type: "card",
                  playedCard: player.getFirstPlayedCard(card.name),
                },
              },
            },
            {
              inputType: GameInputType.SELECT_OPTION_GENERIC,
              prevInputType: GameInputType.PLACE_AMBASSADOR,
              riverDestinationContext: RiverDestinationName.BALLROOM,
              options: ["Ok", "Decline"],
              clientOptions: { selectedOption: "Ok" },
            },
          ],
          { autoAdvance: true }
        );
        expect(player.hasUnusedAmbassador()).to.be(false);
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          ambassador: player.playerId,
          cardOwnerId: player.playerId,
          usedForCritter: false,
        });
        expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.numCardsInHand).to.be(3);

        player.recallAmbassador(gameState);
        expect(player.getFirstPlayedCard(card.name)).to.eql({
          cardName: card.name,
          ambassador: null,
          cardOwnerId: player.playerId,
          usedForCritter: false,
        });
        expect(player.hasUnusedAmbassador()).to.be(true);
      });
    });

    describe(CardName.PIRATE, () => {
      const card = Card.fromName(CardName.PIRATE);

      it("should do nothing if the player has no cards in hand", () => {
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);
        expect(player.hasCardInCity(card.name));
      });

      it("should prompt player to discard cards", () => {
        player.cardsInHand.push(
          card.name,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM
        );
        player.gainResources(gameState, card.baseCost);

        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.QUEEN);
        gameState.deck.addToStack(CardName.MINE);
        gameState.deck.addToStack(CardName.BARGE_TOAD);

        expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.DISCARD_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.PIRATE,
            minCards: 0,
            maxCards: 4,
            clientOptions: {
              cardsToDiscard: [CardName.FARM, CardName.FARM, CardName.FARM],
            },
          },
        ]);
        expect(player.hasCardInCity(card.name));
        expect(player.cardsInHand).to.eql([
          CardName.FARM,
          CardName.BARGE_TOAD,
          CardName.MINE,
          CardName.QUEEN,
        ]);
        expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(1);
      });

      it("should not gain PEARL if base points of revealed cards less than 7", () => {
        player.cardsInHand.push(
          card.name,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM,
          CardName.FARM
        );
        player.gainResources(gameState, card.baseCost);
        gameState.deck.addToStack(CardName.RUINS);
        gameState.deck.addToStack(CardName.RUINS);
        gameState.deck.addToStack(CardName.RUINS);
        gameState.deck.addToStack(CardName.RUINS);

        expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.DISCARD_CARDS,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.PIRATE,
            minCards: 0,
            maxCards: 4,
            clientOptions: {
              cardsToDiscard: [CardName.FARM, CardName.FARM, CardName.FARM],
            },
          },
        ]);
        expect(player.hasCardInCity(card.name));
        expect(player.cardsInHand).to.eql([
          CardName.FARM,
          CardName.RUINS,
          CardName.RUINS,
          CardName.RUINS,
        ]);
        expect(player.getNumResourcesByType(ResourceType.PEARL)).to.be(0);
      });
    });

    /**
     * Newleaf cards.
     */
    describe(CardName.AIR_BALLOON, () => {
      it("should allow you to copy a TRAVELLER from an opponent's city", () => {
        const player2 = gameState.players[1];
        player2.addToCity(gameState, CardName.WANDERER);

        const card = Card.fromName(CardName.AIR_BALLOON);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        expect(player.numCardsInHand).to.be(1);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(card.name)],
          { autoAdvance: true }
        );
        expect(player.numCardsInHand).to.be(3);
      });

      it("should not allow you to copy certain cards", () => {
        const player2 = gameState.players[1];
        player2.addToCity(gameState, CardName.WANDERER);
        player2.addToCity(gameState, CardName.FOOL);
        player2.addToCity(gameState, CardName.MAIN_ROAD);
        player2.addToCity(gameState, CardName.RUINS);

        const card = Card.fromName(CardName.AIR_BALLOON);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        expect(player.numCardsInHand).to.be(1);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(card.name)],
          { autoAdvance: true }
        );
        expect(player.numCardsInHand).to.be(3);
      });

      it("should allow you to select which TRAVELLER to copy from an opponent's city", () => {
        const player2 = gameState.players[1];
        player2.addToCity(gameState, CardName.WANDERER);
        player2.addToCity(gameState, CardName.POSTAL_PIGEON);

        const card = Card.fromName(CardName.AIR_BALLOON);
        player.addCardToHand(gameState, card.name);
        player.gainResources(gameState, card.baseCost);
        expect(player.numCardsInHand).to.be(1);

        [player, gameState] = multiStepGameInputTest(
          gameState,
          [
            playCardInput(card.name),
            {
              inputType: GameInputType.SELECT_CARDS,
              prevInputType: GameInputType.PLAY_CARD,
              cardContext: CardName.AIR_BALLOON,
              cardOptions: [CardName.WANDERER, CardName.POSTAL_PIGEON],
              maxToSelect: 1,
              minToSelect: 1,
              clientOptions: {
                selectedCards: [CardName.WANDERER],
              },
            },
          ],
          { autoAdvance: true }
        );
        expect(player.numCardsInHand).to.be(3);
      });
    });

    describe(CardName.BAKER, () => {});

    describe(CardName.BANK, () => {
      it("should add resources to the bank and increase hand size", () => {
        const card = Card.fromName(CardName.BANK);
        player.addCardToHand(gameState, card.name);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);

        expect(
          player.getFirstPlayedCard(CardName.BANK).resources![ResourceType.VP]
        ).to.be(1);
        expect(player.maxHandSize).to.be(9);
        // 0 VP that you can use
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        // 2 points from bank and 1 from VP on it
        expect(player.getPoints(gameState)).to.be(3);
      });
      it("should add 1 VP when producing", () => {
        const card = Card.fromName(CardName.BANK);
        player.addCardToHand(gameState, card.name);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);

        expect(
          player.getFirstPlayedCard(CardName.BANK).resources![ResourceType.VP]
        ).to.be(1);
        expect(player.maxHandSize).to.be(9);
        // 0 VP that you can use
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        // 2 points from bank and 1 from VP on it
        expect(player.getPoints(gameState)).to.be(3);

        player.activateProduction(gameState, {
          inputType: GameInputType.PREPARE_FOR_SEASON,
        });

        expect(
          player.getFirstPlayedCard(CardName.BANK).resources![ResourceType.VP]
        ).to.be(2);
        expect(player.maxHandSize).to.be(10);
        // 0 VP that you can use
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        // 2 points from bank and 2 from VP on it
        expect(player.getPoints(gameState)).to.be(4);
      });
    });

    describe(CardName.CHIPSMITH, () => {
      it("should allow the player to reactivate production cards", () => {
        let player = gameState.getActivePlayer();

        player.addToCity(gameState, CardName.MINE);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.CHIPSMITH);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        const visitDestinationInput = {
          inputType: GameInputType.VISIT_DESTINATION_CARD as const,
          clientOptions: {
            playedCard: player.getFirstPlayedCard(CardName.CHIPSMITH),
          },
        };

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.CHIPSMITH,
          maxToSelect: 2,
          minToSelect: 2,
          cardOptions: [
            ...player.getPlayedCardForCardName(CardName.MINE),
            ...player.getPlayedCardForCardName(CardName.FARM),
          ],
          clientOptions: {
            selectedCards: [
              player.getFirstPlayedCard(CardName.MINE),
              player.getFirstPlayedCard(CardName.FARM),
            ],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          visitDestinationInput,
          selectPlayedCardInput,
        ]);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });

      it("should not allow player to visit if 0 production cards", () => {
        player.addToCity(gameState, CardName.CHIPSMITH);

        const visitDestinationInput = {
          inputType: GameInputType.VISIT_DESTINATION_CARD as const,
          clientOptions: {
            playedCard: player.getFirstPlayedCard(CardName.CHIPSMITH),
          },
        };

        expect(() => {
          gameState.next(visitDestinationInput);
        }).to.throwException(/No useful production cards/i);
      });

      it("allow player to visit if only 1 production card", () => {
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.CHIPSMITH);

        const visitDestinationInput = {
          inputType: GameInputType.VISIT_DESTINATION_CARD as const,
          clientOptions: {
            playedCard: player.getFirstPlayedCard(CardName.CHIPSMITH),
          },
        };

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.CHIPSMITH,
          maxToSelect: 1,
          minToSelect: 1,
          cardOptions: [...player.getPlayedCardForCardName(CardName.FARM)],
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          visitDestinationInput,
          selectPlayedCardInput,
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });

      it("should not allow the player to copy their HUSBAND (if they are missing a WIFE)", () => {
        player.addToCity(gameState, CardName.HUSBAND);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.CHIPSMITH);

        const visitDestinationInput = {
          inputType: GameInputType.VISIT_DESTINATION_CARD as const,
          clientOptions: {
            playedCard: player.getFirstPlayedCard(CardName.CHIPSMITH),
          },
        };

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.VISIT_DESTINATION_CARD,
          cardContext: CardName.CHIPSMITH,
          maxToSelect: 1,
          minToSelect: 1,
          cardOptions: [...player.getPlayedCardForCardName(CardName.FARM)],
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          visitDestinationInput,
          selectPlayedCardInput,
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
      });
    });

    describe(CardName.CITY_HALL, () => {
      it("should do nothing is player plays a critter", () => {
        player.addToCity(gameState, CardName.CITY_HALL);

        const cardToPlay = Card.fromName(CardName.HUSBAND);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);
        multiStepGameInputTest(gameState, [playCardInput(cardToPlay.name)]);
      });

      it("should allow player to give opponent a card after playing a construction", () => {
        let player2 = gameState.players[1];

        player.addToCity(gameState, CardName.CITY_HALL);

        const cardToPlay = Card.fromName(CardName.FARM);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.HUSBAND);

        gameState.deck.addToStack(CardName.PALACE);

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.cardsInHand.length).to.be(3);

        const selectCardInput = {
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.CITY_HALL,
          cardOptions: [CardName.WIFE, CardName.HUSBAND],
          maxToSelect: 1,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [CardName.HUSBAND],
          },
        };

        const selectPlayerInput = {
          inputType: GameInputType.SELECT_PLAYER as const,
          prevInputType: GameInputType.SELECT_CARDS,
          prevInput: selectCardInput,
          playerOptions: [player2.playerId],
          mustSelectOne: true,
          cardContext: CardName.CITY_HALL,
          clientOptions: {
            selectedPlayer: player2.playerId,
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
          selectCardInput,
          selectPlayerInput,
        ]);

        player2 = gameState.getPlayer(player2.playerId);

        expect(player.numCardsInHand).to.be(2);
        expect(player.cardsInHand).to.eql([CardName.WIFE, CardName.PALACE]);
        expect(player2.cardsInHand).to.eql([CardName.HUSBAND]);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
      });

      it("should allow player to give 0 cards", () => {
        let player2 = gameState.players[1];

        player.addToCity(gameState, CardName.CITY_HALL);

        const cardToPlay = Card.fromName(CardName.FARM);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.HUSBAND);

        gameState.deck.addToStack(CardName.PALACE);

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.cardsInHand.length).to.be(3);

        const selectCardInput = {
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.CITY_HALL,
          cardOptions: [CardName.WIFE, CardName.HUSBAND],
          maxToSelect: 1,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
          selectCardInput,
        ]);

        player2 = gameState.getPlayer(player2.playerId);

        expect(player.numCardsInHand).to.be(2);
        expect(player.cardsInHand).to.eql([CardName.WIFE, CardName.HUSBAND]);
        expect(player2.cardsInHand).to.eql([]);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
      });
    });

    describe(CardName.CONDUCTOR, () => {
      it("should allow player to use an opponent's DESTINATION card", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK,
        ];
        gameState = testInitialGameState({ meadowCards: cards });

        let player1 = gameState.getActivePlayer();
        let player2 = gameState.players[1];

        player1.addToCity(gameState, CardName.CONDUCTOR);
        player2.addToCity(gameState, CardName.QUEEN);

        player1.addCardToHand(gameState, CardName.WIFE);

        expect(player1.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player1.getFirstPlayedCard(CardName.CONDUCTOR),
            },
          },
          {
            inputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.CONDUCTOR,
            cardOptions: [player2.getFirstPlayedCard(CardName.QUEEN)],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [player2.getFirstPlayedCard(CardName.QUEEN)],
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.QUEEN,
            cardOptions: [
              CardName.WIFE,
              CardName.POSTAL_PIGEON,
              CardName.POSTAL_PIGEON,
              CardName.FARM,
              CardName.HUSBAND,
              CardName.CHAPEL,
              CardName.MONK,
            ],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.WIFE],
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);

        expect(player1.numAvailableWorkers).to.be(1);
        expect(player1.hasCardInCity(CardName.WIFE)).to.be(true);
      });
      // TODO: add more tests:
      // - Open Destinations shouldn't give owner VP
      // - can't copy destinations in your own city
      // - copy the ferry
      // - copy destination you can't use
    });

    describe(CardName.DIPLOMAT, () => {
      it("should do nothing is player plays a construction", () => {
        player.addToCity(gameState, CardName.DIPLOMAT);

        const cardToPlay = Card.fromName(CardName.FARM);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);
        multiStepGameInputTest(gameState, [playCardInput(cardToPlay.name)]);
      });

      it("should allow player to give opponent a card after playing a critter", () => {
        let player2 = gameState.players[1];

        player.addToCity(gameState, CardName.DIPLOMAT);

        const cardToPlay = Card.fromName(CardName.QUEEN);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.HUSBAND);

        gameState.deck.addToStack(CardName.PALACE);

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.cardsInHand.length).to.be(3);

        const selectCardInput = {
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.DIPLOMAT,
          cardOptions: [CardName.WIFE, CardName.HUSBAND],
          maxToSelect: 1,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [CardName.HUSBAND],
          },
        };

        const selectPlayerInput = {
          inputType: GameInputType.SELECT_PLAYER as const,
          prevInputType: GameInputType.SELECT_CARDS,
          prevInput: selectCardInput,
          playerOptions: [player2.playerId],
          mustSelectOne: true,
          cardContext: CardName.DIPLOMAT,
          clientOptions: {
            selectedPlayer: player2.playerId,
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
          selectCardInput,
          selectPlayerInput,
        ]);

        player2 = gameState.getPlayer(player2.playerId);

        expect(player.numCardsInHand).to.be(2);
        expect(player.cardsInHand).to.eql([CardName.WIFE, CardName.PALACE]);
        expect(player2.cardsInHand).to.eql([CardName.HUSBAND]);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
      });

      it("should allow player to give 0 cards", () => {
        let player2 = gameState.players[1];

        player.addToCity(gameState, CardName.DIPLOMAT);

        const cardToPlay = Card.fromName(CardName.QUEEN);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.HUSBAND);

        gameState.deck.addToStack(CardName.PALACE);

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.cardsInHand.length).to.be(3);

        const selectCardInput = {
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.DIPLOMAT,
          cardOptions: [CardName.WIFE, CardName.HUSBAND],
          maxToSelect: 1,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
          selectCardInput,
        ]);

        player2 = gameState.getPlayer(player2.playerId);

        expect(player.numCardsInHand).to.be(2);
        expect(player.cardsInHand).to.eql([CardName.WIFE, CardName.HUSBAND]);
        expect(player2.cardsInHand).to.eql([]);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
      });
    });

    describe(CardName.EVER_WALL, () => {});

    describe(CardName.FREIGHT_CAR, () => {
      it("should allow player to play and claim resources", () => {
        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.FREIGHT_CAR);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        // freight car costs 1 twig, 2 resin, and 2 pebbles
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);

        const playedCardContext = {
          cardName: card.name,
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 2,
            PEBBLE: 2,
            RESIN: 2,
            TWIG: 2,
          },
          usedForCritter: false,
        };

        const selectResourcesInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PLAY_CARD,
          maxResources: 2,
          minResources: 2,
          toSpend: false,
          cardContext: CardName.FREIGHT_CAR,
          playedCardContext: playedCardContext,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 1,
              [ResourceType.TWIG]: 1,
            },
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_RESOURCES as const,
            prevInputType: GameInputType.PLAY_CARD,
            maxResources: 2,
            minResources: 2,
            toSpend: false,
            cardContext: CardName.FREIGHT_CAR,
            playedCardContext: playedCardContext,
            clientOptions: {
              resources: {
                [ResourceType.BERRY]: 1,
                [ResourceType.TWIG]: 1,
              },
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);

        let playedCard = player.getFirstPlayedCard(card.name);
        expect(playedCard).to.eql({
          cardName: card.name,
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 1,
            TWIG: 1,
            RESIN: 2,
            PEBBLE: 2,
          },
          usedForCritter: false,
        });

        // skip player2
        gameState.nextPlayer();

        player.activateProduction(gameState, {
          inputType: GameInputType.PREPARE_FOR_SEASON,
        });

        const selectResourcesInput2 = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PLAY_CARD,
          maxResources: 2,
          minResources: 2,
          toSpend: false,
          cardContext: CardName.FREIGHT_CAR,
          playedCardContext: player.getFirstPlayedCard(CardName.FREIGHT_CAR),
          clientOptions: {
            resources: {
              [ResourceType.RESIN]: 2,
            },
          },
        };

        gameState = gameState.next({
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PREPARE_FOR_SEASON,
          maxResources: 2,
          minResources: 2,
          toSpend: false,
          cardContext: CardName.FREIGHT_CAR,
          playedCardContext: player.getFirstPlayedCard(CardName.FREIGHT_CAR),
          clientOptions: {
            resources: {
              [ResourceType.RESIN]: 2,
            },
          },
        });

        player = gameState.getPlayer(player.playerId);

        playedCard = player.getFirstPlayedCard(card.name);
        expect(playedCard).to.eql({
          cardName: card.name,
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 1,
            TWIG: 1,
            RESIN: 0,
            PEBBLE: 2,
          },
          usedForCritter: false,
        });

        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(2);
      });
      it("should not allow player to select than 2 resources", () => {
        const player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.FREIGHT_CAR);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        // freight car costs 1 twig, 2 resin, and 2 pebbles
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);

        const playedCardContext = {
          cardName: card.name,
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 2,
            PEBBLE: 2,
            RESIN: 2,
            TWIG: 2,
          },
          usedForCritter: false,
        };

        const selectResourcesInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PLAY_CARD,
          maxResources: 2,
          minResources: 2,
          toSpend: false,
          cardContext: CardName.FREIGHT_CAR,
          playedCardContext: playedCardContext,
          clientOptions: {
            resources: {
              [ResourceType.TWIG]: 3,
            },
          },
        };

        gameState.next(playCardInput(card.name));

        expect(() => {
          gameState.next(selectResourcesInput);
        }).to.throwException(/Must select exactly 2 resources/i);
      });
      it("should not allow player to select more resources than are on the card", () => {
        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.FREIGHT_CAR);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        const playedCardContext = {
          cardName: card.name,
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 2,
            PEBBLE: 2,
            RESIN: 2,
            TWIG: 2,
          },
          usedForCritter: false,
        };

        const selectResourcesInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PLAY_CARD,
          maxResources: 2,
          minResources: 2,
          toSpend: false,
          cardContext: CardName.FREIGHT_CAR,
          playedCardContext: playedCardContext,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 2,
            },
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          selectResourcesInput,
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);

        // skip player2's turn
        gameState.nextPlayer();

        player.activateProduction(gameState, {
          inputType: GameInputType.PREPARE_FOR_SEASON,
        });

        expect(() => {
          gameState = gameState.next({
            inputType: GameInputType.SELECT_RESOURCES as const,
            prevInputType: GameInputType.PREPARE_FOR_SEASON,
            maxResources: 2,
            minResources: 2,
            toSpend: false,
            cardContext: CardName.FREIGHT_CAR,
            playedCardContext: player.getFirstPlayedCard(CardName.FREIGHT_CAR),
            clientOptions: {
              resources: {
                [ResourceType.BERRY]: 2,
              },
            },
          });
        }).to.throwException(/Selected more BERRY/i);
      });
      it("should not allow player to select resources when there are none left", () => {
        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.FREIGHT_CAR);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        const playedCardContext = {
          cardName: card.name,
          cardOwnerId: player.playerId,
          resources: {
            BERRY: 2,
            PEBBLE: 2,
            RESIN: 2,
            TWIG: 2,
          },
          usedForCritter: false,
        };

        const selectResourcesInput = {
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PLAY_CARD,
          maxResources: 2,
          minResources: 2,
          toSpend: false,
          cardContext: CardName.FREIGHT_CAR,
          playedCardContext: playedCardContext,
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 2,
            },
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          selectResourcesInput,
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);

        // remove all the resources
        player.updatePlayedCard(
          gameState,
          player.getFirstPlayedCard(CardName.FREIGHT_CAR),
          {
            resources: {
              [ResourceType.TWIG]: 0,
              [ResourceType.RESIN]: 0,
              [ResourceType.BERRY]: 0,
              [ResourceType.PEBBLE]: 0,
            },
          }
        );

        // skip player2's turn
        gameState.nextPlayer();

        player.activateProduction(gameState, {
          inputType: GameInputType.PREPARE_FOR_SEASON,
        });

        gameState = gameState.next({
          inputType: GameInputType.SELECT_RESOURCES as const,
          prevInputType: GameInputType.PREPARE_FOR_SEASON,
          maxResources: 2,
          minResources: 2,
          toSpend: false,
          cardContext: CardName.FREIGHT_CAR,
          playedCardContext: player.getFirstPlayedCard(CardName.FREIGHT_CAR),
          clientOptions: {
            resources: {
              [ResourceType.BERRY]: 2,
            },
          },
        });

        // we expect nothing to happen and for this to not throw an error
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      });
    });

    describe(CardName.GARDENER, () => {
      it("should allow the player to reactivate production cards", () => {
        let player = gameState.getActivePlayer();
        const card = Card.fromName(CardName.GARDENER);

        player.addToCity(gameState, CardName.MINE);
        player.addToCity(gameState, CardName.RESIN_REFINERY);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.GARDENER,
          maxToSelect: 2,
          minToSelect: 2,
          cardOptions: [
            ...player.getPlayedCardForCardName(CardName.MINE),
            ...player.getPlayedCardForCardName(CardName.RESIN_REFINERY),
          ],
          clientOptions: {
            selectedCards: [
              player.getFirstPlayedCard(CardName.MINE),
              player.getFirstPlayedCard(CardName.RESIN_REFINERY),
            ],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          selectPlayedCardInput,
        ]);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(1);
      });

      it("should allow the player to play if 0 production cards in city", () => {
        let player = gameState.getActivePlayer();
        const card = Card.fromName(CardName.GARDENER);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      });

      it("allow gardener to be played if only 1 production card in city", () => {
        let player = gameState.getActivePlayer();
        const card = Card.fromName(CardName.GARDENER);

        player.addToCity(gameState, CardName.MINE);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.GARDENER,
          maxToSelect: 1,
          minToSelect: 1,
          cardOptions: [...player.getPlayedCardForCardName(CardName.MINE)],
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.MINE)],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          selectPlayedCardInput,
        ]);

        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
      });
    });

    describe(CardName.GREENHOUSE, () => {});

    describe(CardName.HOTEL, () => {
      it("should allow player play card from hand without spending resources if cost is <= 3", () => {
        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.HOTEL);

        player.addToCity(gameState, CardName.HOTEL);

        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.PALACE);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getFirstPlayedCard(CardName.HOTEL)).to.eql({
          cardName: CardName.HOTEL,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          workers: [],
        });
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(false);
        expect(player.cardsInHand.length).to.be(2);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.HOTEL),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.HOTEL,
            cardOptions: [CardName.WIFE],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.WIFE],
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(true);
        expect(player.cardsInHand).to.eql([CardName.PALACE]);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
      });

      it("should allow player buy card from hand if cost is > 3", () => {
        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.HOTEL);

        // Make sure we can play this card
        player.gainResources(gameState, { [ResourceType.BERRY]: 4 });
        player.addToCity(gameState, CardName.HOTEL);

        player.addCardToHand(gameState, CardName.QUEEN);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.QUEEN)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(4);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.HOTEL),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.HOTEL,
            cardOptions: [CardName.QUEEN],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.QUEEN],
            },
          },
          {
            inputType: GameInputType.SELECT_PAYMENT_FOR_CARD,
            prevInputType: GameInputType.SELECT_CARDS,
            cardContext: card.name,
            card: CardName.QUEEN,
            clientOptions: {
              card: CardName.QUEEN,
              paymentOptions: {
                resources: {
                  [ResourceType.BERRY]: 2,
                },
                cardToUse: CardName.HOTEL,
              },
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.hasCardInCity(CardName.QUEEN)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(2);
      });

      it("should not allow player to buy from their hand", () => {
        const player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.HOTEL);

        // Make sure we can play this card
        player.gainResources(gameState, { [ResourceType.BERRY]: 4 });
        player.addToCity(gameState, CardName.HOTEL);

        // Already have QUEEN & KING in city.
        player.addToCity(gameState, CardName.QUEEN);
        player.addToCity(gameState, CardName.KING);

        // Add QUEEN and WIFE to hand. QUEEN should not be playable
        player.addCardToHand(gameState, CardName.QUEEN);
        player.addCardToHand(gameState, CardName.WIFE);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(4);

        expect(() => {
          multiStepGameInputTest(gameState, [
            {
              inputType: GameInputType.VISIT_DESTINATION_CARD,
              clientOptions: {
                playedCard: player.getFirstPlayedCard(CardName.HOTEL),
              },
            },
            {
              inputType: GameInputType.SELECT_CARDS,
              prevInputType: GameInputType.VISIT_DESTINATION_CARD,
              cardContext: CardName.HOTEL,
              cardOptions: [CardName.WIFE],
              maxToSelect: 1,
              minToSelect: 1,
              clientOptions: {
                selectedCards: [CardName.QUEEN],
              },
            },
          ]);
        }).to.throwException(/Selected card is not a valid option/i);
      });

      it("should allow player buy card using another player's hotel", () => {
        let player = gameState.getActivePlayer();
        let player2 = gameState.players[1];

        const card = Card.fromName(CardName.HOTEL);

        player2.addToCity(gameState, CardName.HOTEL);
        player.addCardToHand(gameState, CardName.WIFE);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player2.getFirstPlayedCard(CardName.HOTEL),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.HOTEL,
            cardOptions: [CardName.WIFE],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.WIFE],
            },
          },
        ]);

        player2 = gameState.getPlayer(player2.playerId);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player2.getNumResourcesByType(ResourceType.VP)).to.be(2);
      });

      it("should not allow player buy card in meadow but not in hand", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK,
        ];
        gameState = testInitialGameState({ meadowCards: cards });
        const player = gameState.getActivePlayer();

        // Make sure we can play this card
        player.addCardToHand(gameState, CardName.WIFE);
        player.addToCity(gameState, CardName.HOTEL);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(false);

        gameState = gameState.next({
          inputType: GameInputType.VISIT_DESTINATION_CARD,
          clientOptions: {
            playedCard: player.getFirstPlayedCard(CardName.HOTEL),
          },
        });

        expect(() => {
          gameState.next({
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.INN,
            cardOptions: [CardName.WIFE],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.POSTAL_PIGEON],
            },
          });
        }).to.throwException(/Selected card is not a valid option/i);
      });

      it("should allow player to buy card that exists in hand and meadow", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.WIFE,
        ];
        gameState = testInitialGameState({ meadowCards: cards });
        let player = gameState.getActivePlayer();
        gameState.deck.addToStack(CardName.LOOKOUT);

        const idx = gameState.meadowCards.indexOf(CardName.LOOKOUT);
        expect(idx).to.be(-1);

        player.addToCity(gameState, CardName.HOTEL);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.HUSBAND);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(false);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.HOTEL),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.HOTEL,
            cardOptions: [CardName.WIFE, CardName.HUSBAND],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.WIFE],
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.hasCardInCity(CardName.WIFE)).to.be(true);

        const hasWifeInHand = player.cardsInHand.indexOf(CardName.WIFE) >= 0;
        expect(hasWifeInHand).to.be(false);

        const wifeInMeadow = gameState.meadowCards.indexOf(CardName.WIFE) >= 0;
        expect(wifeInMeadow).to.be(true);

        // false because no cards were played from the meadow
        const lookoutInMeadow =
          gameState.meadowCards.indexOf(CardName.LOOKOUT) >= 0;
        expect(lookoutInMeadow).to.be(false);
      });

      it("should allow player to use both their Hotels", () => {
        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.HOTEL);
        player.addToCity(gameState, CardName.HOTEL);
        player.addToCity(gameState, CardName.HOTEL);

        expect(player.numAvailableWorkers).to.be(2);
        expect(player.getFirstPlayedCard(CardName.HOTEL)).to.eql({
          cardName: CardName.HOTEL,
          cardOwnerId: player.playerId,
          usedForCritter: false,
          workers: [],
        });

        player.addCardToHand(gameState, CardName.FARM);
        player.addCardToHand(gameState, CardName.FARM);
        player.addCardToHand(gameState, CardName.FARM);

        expect(player.hasCardInCity(CardName.FARM)).to.be(false);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getFirstPlayedCard(CardName.HOTEL),
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.HOTEL,
            cardOptions: [CardName.FARM, CardName.FARM, CardName.FARM],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.FARM],
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(1);
        expect(player.getPlayedCardForCardName(CardName.FARM).length).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);

        // Back to the same player's turn
        gameState.nextPlayer();

        [player, gameState] = multiStepGameInputTest(gameState, [
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: player.getPlayedCardForCardName(CardName.HOTEL)[1],
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.VISIT_DESTINATION_CARD,
            cardContext: CardName.HOTEL,
            cardOptions: [CardName.FARM, CardName.FARM],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.FARM],
            },
          },
        ]);

        expect(player.numAvailableWorkers).to.be(0);
        expect(player.getPlayedCardForCardName(CardName.FARM).length).to.be(2);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
      });
    });

    describe(CardName.INVENTOR, () => {
      it("can be used to play a critter for 3 BERRY less", () => {
        const card = Card.fromName(CardName.WIFE);
        player.addToCity(gameState, CardName.INVENTOR);
        player.addCardToHand(gameState, card.name);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);

        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.INVENTOR)).to.be(true);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name, {
            paymentOptions: {
              resources: { [ResourceType.BERRY]: 0 },
              cardToUse: CardName.INVENTOR,
            },
          }),
        ]);

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.INVENTOR)).to.be(false);
      });

      it("can be used to play a construction for 3 ANY less", () => {
        const card = Card.fromName(CardName.DUNGEON);
        player.addToCity(gameState, CardName.INVENTOR);
        player.addCardToHand(gameState, card.name);
        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.INVENTOR)).to.be(true);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name, {
            paymentOptions: {
              resources: { [ResourceType.RESIN]: 0, [ResourceType.PEBBLE]: 0 },
              cardToUse: CardName.INVENTOR,
            },
          }),
        ]);

        expect(player.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.INVENTOR)).to.be(false);
      });

      it("can be used to play a critter even if city is full", () => {
        const card = Card.fromName(CardName.WIFE);
        player.addToCity(gameState, CardName.INVENTOR);
        player.addCardToHand(gameState, card.name);

        for (let i = 0; i < 14; i++) {
          player.addToCity(gameState, CardName.FARM);
        }

        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.getNumOccupiedSpacesInCity()).to.be(15);
        expect(player.hasCardInCity(card.name)).to.be(false);
        expect(player.hasCardInCity(CardName.INVENTOR)).to.be(true);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name, {
            paymentOptions: {
              resources: { [ResourceType.BERRY]: 0 },
              cardToUse: CardName.INVENTOR,
            },
          }),
        ]);

        expect(player.getNumOccupiedSpacesInCity()).to.be(15);
        expect(player.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player.hasCardInCity(card.name)).to.be(true);
        expect(player.hasCardInCity(CardName.INVENTOR)).to.be(false);
      });
    });

    describe(CardName.LAMPLIGHTER, () => {});

    describe(CardName.LIBRARY, () => {
      it("Should calculate points correctly", () => {
        const card = Card.fromName(CardName.LIBRARY);
        player.addToCity(gameState, card.name);
        expect(card.getPoints(player, gameState)).to.be(3 + 1);

        player.addToCity(gameState, CardName.FARM);
        expect(card.getPoints(player, gameState)).to.be(3 + 2);

        player.addToCity(gameState, CardName.FARM);
        // still 1, because didn't add another unique color
        expect(card.getPoints(player, gameState)).to.be(3 + 2);

        player.addToCity(gameState, CardName.INN);
        expect(card.getPoints(player, gameState)).to.be(3 + 3);

        player.addToCity(gameState, CardName.UNDERTAKER);
        expect(card.getPoints(player, gameState)).to.be(3 + 4);

        player.addToCity(gameState, CardName.EVERTREE);
        expect(card.getPoints(player, gameState)).to.be(3 + 4);

        player.addToCity(gameState, CardName.INNKEEPER);
        expect(card.getPoints(player, gameState)).to.be(3 + 5);

        player.addToCity(gameState, CardName.HISTORIAN);
        expect(card.getPoints(player, gameState)).to.be(3 + 5);
      });
    });

    describe(CardName.LOCOMOTIVE, () => {});

    // TODO: add test case for "should now allow player to select Magician"
    describe(CardName.MAGICIAN, () => {
      it("allow player to discard card from city to receive 1 VP and 1 ANY", () => {
        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.MAGICIAN);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.TWIG_BARGE);

        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.MAGICIAN,
          cardOptions: [
            ...player.getPlayedCardForCardName(CardName.FARM),
            ...player.getPlayedCardForCardName(CardName.TWIG_BARGE),
          ],
          maxToSelect: 1,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [player.getFirstPlayedCard(CardName.FARM)],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          selectPlayedCardInput,
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.SELECT_PLAYED_CARDS,
            prevInput: selectPlayedCardInput,
            cardContext: CardName.MAGICIAN,
            options: [
              ResourceType.BERRY,
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.PEBBLE,
            ],
            clientOptions: {
              selectedOption: ResourceType.TWIG,
            },
          },
        ]);

        expect(player.hasCardInCity(CardName.FARM)).to.be(false);
        expect(player.hasCardInCity(CardName.TWIG_BARGE)).to.be(true);
        expect(player.hasCardInCity(CardName.MAGICIAN)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(1);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);
      });
      it("allow player to select 0 cards", () => {
        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.MAGICIAN);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.TWIG_BARGE);

        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        const selectPlayedCardInput = {
          inputType: GameInputType.SELECT_PLAYED_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.MAGICIAN,
          cardOptions: [
            ...player.getPlayedCardForCardName(CardName.FARM),
            ...player.getPlayedCardForCardName(CardName.TWIG_BARGE),
          ],
          maxToSelect: 1,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          selectPlayedCardInput,
        ]);

        expect(player.hasCardInCity(CardName.FARM)).to.be(true);
        expect(player.hasCardInCity(CardName.TWIG_BARGE)).to.be(true);
        expect(player.hasCardInCity(CardName.MAGICIAN)).to.be(true);
        expect(player.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
      });
    });

    describe(CardName.MAIN_ROAD, () => {
      it("should not take up any space in the city", () => {
        player.addToCity(gameState, CardName.MAIN_ROAD);
        expect(player.getNumOccupiedSpacesInCity()).to.be(0);
      });

      it("should give you extra space in your city", () => {
        expect(player.maxCitySize).to.be(15);
        player.addToCity(gameState, CardName.MAIN_ROAD);
        expect(player.maxCitySize).to.be(16);
      });
    });

    describe(CardName.MAYOR, () => {});

    describe(CardName.MILLER, () => {
      it("should not prompt player if they don't have any PEBBLE", () => {
        const card = Card.fromName(CardName.MILLER);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);
        [player, gameState] = multiStepGameInputTest(
          gameState,
          [playCardInput(card.name)],
          { autoAdvance: true }
        );

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);
      });

      it("should allow player to pay 1 PEBBLE for 3 VP", () => {
        const card = Card.fromName(CardName.MILLER);

        // Make sure we can play this card
        player.gainResources(gameState, card.baseCost);
        // Make sure we can spend for VP
        player.gainResources(gameState, { [ResourceType.PEBBLE]: 2 });
        player.addCardToHand(gameState, card.name);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_RESOURCES,
            toSpend: true,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.MILLER,
            specificResource: ResourceType.PEBBLE,
            minResources: 0,
            maxResources: 1,
            clientOptions: {
              resources: {
                [ResourceType.PEBBLE]: 1,
              },
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(3);
        expect(player.getNumResourcesByType(ResourceType.PEBBLE)).to.be(1);
      });
    });

    describe(CardName.MUSEUM, () => {
      it("should draw a card if player plays a construction", () => {
        player.addToCity(gameState, CardName.MUSEUM);

        const cardToPlay = Card.fromName(CardName.MINE);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.QUEEN);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
        ]);

        expect(player.cardsInHand).to.eql([CardName.QUEEN, CardName.KING]);
      });

      it("should draw a card if player plays a critter", () => {
        player.addToCity(gameState, CardName.MUSEUM);

        const cardToPlay = Card.fromName(CardName.SHOPKEEPER);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        gameState.deck.addToStack(CardName.KING);
        gameState.deck.addToStack(CardName.QUEEN);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
        ]);

        expect(player.cardsInHand).to.eql([CardName.QUEEN, CardName.KING]);
      });

      it("should not draw a card when the player plays the Museum", () => {
        const cardToPlay = Card.fromName(CardName.MUSEUM);
        player.addCardToHand(gameState, cardToPlay.name);
        player.gainResources(gameState, cardToPlay.baseCost);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(cardToPlay.name),
        ]);
        expect(player.cardsInHand).to.eql([]);
      });
    });

    describe(CardName.PHOTOGRAPHER, () => {});

    describe(CardName.POET, () => {
      it("should allow player to choose a color, draw cards from meadow, and get VP", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK,
        ];
        gameState = testInitialGameState({ meadowCards: cards });

        const topOfDeck = [
          CardName.SCHOOL,
          CardName.TEACHER,
          CardName.WIFE,
          CardName.DOCTOR,
        ];
        topOfDeck.reverse();
        topOfDeck.forEach((cardName) => {
          gameState.deck.addToStack(cardName);
        });

        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.POET);
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POET,
            options: [
              "Blue / Governance",
              "Green / Production",
              "Tan / Traveler",
              "Red / Destination",
              "Purple / Prosperity",
            ],
            clientOptions: {
              selectedOption: "Green / Production",
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(3);

        // check state of player's hand
        expect(player.cardsInHand.indexOf(CardName.FARM) >= 0);
        expect(player.cardsInHand.indexOf(CardName.HUSBAND) >= 0);
        expect(player.cardsInHand.indexOf(CardName.MONK) >= 0);

        // check state of the Meadow
        expect(gameState.meadowCards.indexOf(CardName.HUSBAND)).to.be.lessThan(
          0
        );
        expect(gameState.meadowCards.indexOf(CardName.MONK)).to.be.lessThan(0);
        expect(gameState.meadowCards.indexOf(CardName.FARM)).to.be.lessThan(0);
        expect(
          gameState.meadowCards.indexOf(CardName.SCHOOL)
        ).to.be.greaterThan(0);
      });
      it("should handle case where player cannot draw all cards from Meadow", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK,
        ];
        gameState = testInitialGameState({ meadowCards: cards });

        const topOfDeck = [
          CardName.SCHOOL,
          CardName.TEACHER,
          CardName.WIFE,
          CardName.DOCTOR,
        ];
        topOfDeck.reverse();
        topOfDeck.forEach((cardName) => {
          gameState.deck.addToStack(cardName);
        });

        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.POET);
        player.gainResources(gameState, card.baseCost);
        player.addCardToHand(gameState, card.name);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POET,
            options: [
              "Blue / Governance",
              "Green / Production",
              "Tan / Traveler",
              "Red / Destination",
              "Purple / Prosperity",
            ],
            clientOptions: {
              selectedOption: "Green / Production",
            },
          },
          {
            inputType: GameInputType.SELECT_CARDS,
            prevInputType: GameInputType.SELECT_OPTION_GENERIC,
            cardContext: CardName.POET,
            cardOptions: [CardName.FARM, CardName.HUSBAND, CardName.MONK],
            maxToSelect: 1,
            minToSelect: 1,
            clientOptions: {
              selectedCards: [CardName.FARM],
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(1);

        // check state of player's hand
        expect(player.cardsInHand.indexOf(CardName.FARM)).to.be.greaterThan(0);
        expect(player.cardsInHand.indexOf(CardName.HUSBAND)).to.be.lessThan(0);
        expect(player.cardsInHand.indexOf(CardName.MONK)).to.be.lessThan(0);

        // check state of the Meadow
        expect(gameState.meadowCards.indexOf(CardName.HUSBAND)).to.be.lessThan(
          0
        );
        expect(gameState.meadowCards.indexOf(CardName.MONK)).to.be.lessThan(0);
        expect(gameState.meadowCards.indexOf(CardName.FARM)).to.be.lessThan(0);
        expect(
          gameState.meadowCards.indexOf(CardName.SCHOOL)
        ).to.be.greaterThan(0);
      });
      // TODO: This only happens if you play the Poet from the Meadow. Implement this after Meadow refactor
      it.skip("should not let player draw cards if hand is full, but should still clear meadow", () => {
        const cards = [
          CardName.KING,
          CardName.QUEEN,
          CardName.POET,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK,
        ];
        gameState = testInitialGameState({ meadowCards: cards });

        const topOfDeck = [
          CardName.SCHOOL,
          CardName.TEACHER,
          CardName.WIFE,
          CardName.DOCTOR,
        ];
        topOfDeck.reverse();
        topOfDeck.forEach((cardName) => {
          gameState.deck.addToStack(cardName);
        });

        let player = gameState.getActivePlayer();

        const card = Card.fromName(CardName.POET);
        player.gainResources(gameState, card.baseCost);
        // player.addCardToHand(gameState, card.name);

        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);
        player.addCardToHand(gameState, CardName.WIFE);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.PLAY_CARD,
            cardContext: CardName.POET,
            options: [
              "Blue / Governance",
              "Green / Production",
              "Tan / Traveler",
              "Red / Destination",
              "Purple / Prosperity",
            ],
            clientOptions: {
              selectedOption: "Green / Production",
            },
          },
        ]);

        expect(player.getNumResourcesByType(ResourceType.VP)).to.be(0);

        // check state of player's hand
        expect(player.cardsInHand.indexOf(CardName.FARM)).to.be.lessThan(0);
        expect(player.cardsInHand.indexOf(CardName.HUSBAND)).to.be.lessThan(0);
        expect(player.cardsInHand.indexOf(CardName.MONK)).to.be.lessThan(0);

        // check state of the Meadow
        expect(gameState.meadowCards.indexOf(CardName.HUSBAND)).to.be.lessThan(
          0
        );
        expect(gameState.meadowCards.indexOf(CardName.MONK)).to.be.lessThan(0);
        expect(gameState.meadowCards.indexOf(CardName.FARM)).to.be.lessThan(0);
        expect(
          gameState.meadowCards.indexOf(CardName.SCHOOL)
        ).to.be.greaterThan(0);
      });
    });

    describe(CardName.TEA_HOUSE, () => {
      it("allow player to give cards to other player using Tea House", () => {
        let player1 = gameState.players[0];
        let player2 = gameState.players[1];
        const card = Card.fromName(CardName.TEA_HOUSE);

        player1.addCardToHand(gameState, CardName.KING);
        player1.addCardToHand(gameState, CardName.QUEEN);

        // Make sure we can play this card
        player1.gainResources(gameState, card.baseCost);
        player1.addCardToHand(gameState, card.name);

        expect(player1.cardsInHand.length).to.be(3);
        expect(player2.cardsInHand.length).to.be(0);

        gameState.deck.addToStack(CardName.FARM);

        const selectCardInput = {
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.TEA_HOUSE,
          cardOptions: [CardName.KING, CardName.QUEEN],
          maxToSelect: 1,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [CardName.KING],
          },
        };

        const selectPlayerInput = {
          inputType: GameInputType.SELECT_PLAYER as const,
          prevInputType: GameInputType.SELECT_CARDS,
          prevInput: selectCardInput,
          playerOptions: [player2.playerId],
          mustSelectOne: true,
          cardContext: CardName.TEA_HOUSE,
          clientOptions: {
            selectedPlayer: player2.playerId,
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          selectCardInput,
          selectPlayerInput,
          {
            inputType: GameInputType.SELECT_OPTION_GENERIC,
            prevInputType: GameInputType.SELECT_PLAYER,
            prevInput: selectPlayerInput,
            cardContext: CardName.TEA_HOUSE,
            options: [
              ResourceType.BERRY,
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.PEBBLE,
            ],
            clientOptions: {
              selectedOption: ResourceType.BERRY,
            },
          },
        ]);

        player1 = gameState.getPlayer(player1.playerId);
        player2 = gameState.getPlayer(player2.playerId);

        expect(player1.cardsInHand).to.eql([CardName.QUEEN, CardName.FARM]);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(1);

        expect(player2.cardsInHand).to.eql([CardName.KING]);
      });
      it("allow player to select 0 cards to give", () => {
        let player1 = gameState.players[0];
        let player2 = gameState.players[1];
        const card = Card.fromName(CardName.TEA_HOUSE);

        player1.addCardToHand(gameState, CardName.KING);
        player1.addCardToHand(gameState, CardName.QUEEN);

        // Make sure we can play this card
        player1.gainResources(gameState, card.baseCost);
        player1.addCardToHand(gameState, card.name);

        expect(player1.cardsInHand.length).to.be(3);
        expect(player2.cardsInHand.length).to.be(0);

        const selectCardInput = {
          inputType: GameInputType.SELECT_CARDS as const,
          prevInputType: GameInputType.PLAY_CARD,
          cardContext: CardName.TEA_HOUSE,
          cardOptions: [CardName.KING, CardName.QUEEN],
          maxToSelect: 1,
          minToSelect: 0,
          clientOptions: {
            selectedCards: [],
          },
        };

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
          selectCardInput,
        ]);

        player1 = gameState.getPlayer(player1.playerId);
        player2 = gameState.getPlayer(player2.playerId);

        expect(player1.cardsInHand).to.eql([CardName.KING, CardName.QUEEN]);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player1.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player1.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
        expect(player1.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        expect(player2.cardsInHand).to.eql([]);
      });
      it("handle case where player has 0 cards in hand", () => {
        let player1 = gameState.players[0];
        let player2 = gameState.players[1];
        const card = Card.fromName(CardName.TEA_HOUSE);

        // Make sure we can play this card
        player1.gainResources(gameState, card.baseCost);
        player1.addCardToHand(gameState, card.name);

        expect(player1.cardsInHand.length).to.be(1);
        expect(player2.cardsInHand.length).to.be(0);

        [player, gameState] = multiStepGameInputTest(gameState, [
          playCardInput(card.name),
        ]);

        player1 = gameState.getPlayer(player1.playerId);
        player2 = gameState.getPlayer(player2.playerId);

        expect(player1.cardsInHand.length).to.be(0);
        expect(player1.getNumResourcesByType(ResourceType.BERRY)).to.be(0);
        expect(player1.getNumResourcesByType(ResourceType.TWIG)).to.be(0);
        expect(player1.getNumResourcesByType(ResourceType.RESIN)).to.be(0);
        expect(player1.getNumResourcesByType(ResourceType.PEBBLE)).to.be(0);

        expect(player2.cardsInHand).to.eql([]);
      });
    });
  });
});
