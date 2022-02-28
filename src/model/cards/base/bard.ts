import { Card } from "model/card";
import { GameState } from "model/gameState";
import { toGameText } from "model/gameText";
import { CardName, CardType, ResourceType, GameInput, GameInputType } from "model/types";

export const bard = (): Card => new Card({
  name: CardName.BARD,
  numInDeck: 2,
  cardType: CardType.TRAVELER,
  baseCost: { [ResourceType.BERRY]: 3 },
  baseVP: 0,
  isUnique: true,
  isConstruction: false,
  associatedCard: CardName.THEATRE,
  cardDescription: toGameText(
    "You may discard up to 5 CARD to gain 1 VP each."
  ),
  playInner: (gameState: GameState, gameInput: GameInput) => {
    const player = gameState.getActivePlayer();
    if (gameInput.inputType === GameInputType.PLAY_CARD) {
      gameState.pendingGameInputs.push({
        inputType: GameInputType.DISCARD_CARDS,
        label: "Discard up to 5 CARD to gain 1 VP each",
        prevInputType: gameInput.inputType,
        minCards: 0,
        maxCards: 5,
        cardContext: CardName.BARD,
        clientOptions: {
          cardsToDiscard: [],
        },
      });
    } else if (
      gameInput.inputType === GameInputType.DISCARD_CARDS &&
      gameInput.cardContext === CardName.BARD
    ) {
      if (gameInput.clientOptions?.cardsToDiscard) {
        if (gameInput.clientOptions.cardsToDiscard.length > 5) {
          throw new Error("Discarding too many cards");
        }
        const numDiscarded = gameInput.clientOptions.cardsToDiscard.length;
        if (numDiscarded === 0 && gameInput.isAutoAdvancedInput) {
          gameState.addGameLogFromCard(CardName.BARD, [
            player,
            ` has no CARD to discard.`,
          ]);
        } else {
          gameState.addGameLogFromCard(CardName.BARD, [
            player,
            ` discarded ${numDiscarded} CARD to gain ${numDiscarded} VP.`,
          ]);
        }
        gameInput.clientOptions.cardsToDiscard.forEach((cardName) => {
          player.removeCardFromHand(gameState, cardName);
        });
        player.gainResources(gameState, {
          [ResourceType.VP]: numDiscarded,
        });
      }
    } else {
      throw new Error(`Unexpected input type ${gameInput.inputType}`);
    }
  },
})