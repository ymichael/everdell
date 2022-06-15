import { Card } from "../../card";
import { GameState } from "../../gameState";
import { sumResources } from "../../gameStatePlayHelpers";
import { toGameText } from "../../gameText";
import { Player } from "../../player";
import {
  CardName,
  CardType,
  ExpansionType,
  GameInput,
  GameInputType,
  ResourceType,
} from "../../types";

function availableCardsToPlay(
  gameState: GameState,
  player: Player
): CardName[] {
  const resources = player.getResources();
  const availableCards = gameState.meadowCards.concat(player.cardsInHand);
  return availableCards.filter((cardName) => {
    const card = Card.fromName(cardName);
    return (
      card.canPlayIgnoreCostAndSource(gameState) &&
      player.isPaidResourcesValid(resources, card.baseCost, "ANY 4", false)
    );
  });
}

export const theGreenAcorn: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.THE_GREEN_ACORN,
  associatedCard: CardName.INNKEEPER,
  upgradeableCard: CardName.INN,
  cardType: CardType.DESTINATION,
  isOpenDestination: true,
  isConstruction: true,
  isUnique: false,
  baseVP: 4,
  numInDeck: 1,
  cardDescription: toGameText([
    "Play a ",
    { type: "em", text: "Critter " },
    "or ",
    { type: "em", text: "Construction " },
    "for 4 fewer ANY",
  ]),
  baseCost: {
    [ResourceType.TWIG]: 3,
    [ResourceType.RESIN]: 3,
  },
  canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
      const canPlayCards = availableCardsToPlay(gameState, player).length > 0;
      if (!canPlayCards) {
        return `You don't have any cards you can play`;
      }
    }
    return null;
  },
  // Play any card for 4 less resources
  playInner: (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
      // add pending input to select a card to play
      gameState.pendingGameInputs.push({
        inputType: GameInputType.SELECT_CARDS,
        prevInputType: gameInput.inputType,
        label: "Select 1 CARD from to play for 4 fewer ANY",
        cardOptions: availableCardsToPlay(gameState, player),
        maxToSelect: 1,
        minToSelect: 1,
        cardContext: CardName.THE_GREEN_ACORN,
        clientOptions: {
          selectedCards: [],
        },
      });
    } else if (
      gameInput.inputType === GameInputType.SELECT_CARDS &&
      gameInput.cardContext === CardName.THE_GREEN_ACORN
    ) {
      const selectedCards = gameInput.clientOptions.selectedCards;
      if (!selectedCards) {
        throw new Error("Must select card to play.");
      }
      if (selectedCards.length !== 1) {
        throw new Error("Can only play 1 card.");
      }
      const selectedCardName = selectedCards[0];
      if (
        gameState.meadowCards.indexOf(selectedCardName) < 0 ||
        player.cardsInHand.indexOf(selectedCardName) < 0
      ) {
        throw new Error("Cannot find selected card.");
      }
      const selectedCard = Card.fromName(selectedCardName);
      if (!selectedCard.canPlayIgnoreCostAndSource(gameState)) {
        throw new Error(`Unable to play ${selectedCardName}`);
      }

      gameState.addGameLogFromCard(CardName.THE_GREEN_ACORN, [
        player,
        " selected ",
        selectedCard,
        " to play.",
      ]);

      if (sumResources(selectedCard.baseCost) <= 4) {
        gameState.removeCardFromMeadow(selectedCard.name);
        selectedCard.addToCityAndPlay(gameState, gameInput);
        gameState.addGameLogFromCard(CardName.THE_GREEN_ACORN, [
          player,
          " played ",
          selectedCard,
        ]);
      } else {
        gameState.pendingGameInputs.push({
          inputType: GameInputType.SELECT_PAYMENT_FOR_CARD,
          prevInputType: gameInput.inputType,
          cardContext: CardName.THE_GREEN_ACORN,
          card: selectedCardName,
          clientOptions: {
            card: selectedCardName,
            paymentOptions: { resources: {} },
          },
        });
      }
    } else if (
      gameInput.inputType === GameInputType.SELECT_PAYMENT_FOR_CARD &&
      gameInput.cardContext === CardName.INN
    ) {
      if (!gameInput.clientOptions?.paymentOptions?.resources) {
        throw new Error(
          "Invalid input: clientOptions.paymentOptions.resources missing"
        );
      }
      const card = Card.fromName(gameInput.card);
      const paymentError = player.validatePaidResources(
        gameInput.clientOptions.paymentOptions.resources,
        card.baseCost,
        "ANY 3"
      );
      if (paymentError) {
        throw new Error(paymentError);
      }
      player.payForCard(gameState, gameInput);
      card.addToCityAndPlay(gameState, gameInput);

      gameState.removeCardFromMeadow(card.name);

      gameState.addGameLogFromCard(CardName.INN, [
        player,
        " played ",
        card,
        " from the Meadow.",
      ]);
    }
  },
};
