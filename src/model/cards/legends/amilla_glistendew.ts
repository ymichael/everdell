import { Card } from "../../card";
import { GameState } from "../../gameState";
import { toGameText } from "../../gameText";
import {
  CardName,
  CardType,
  ExpansionType,
  GameInput,
  GameInputType,
  ResourceType,
} from "../../types";

export const amilla_glistendew: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.AMILLA_GLISTENDEW,
  associatedCard: CardName.QUEEN,
  cardType: CardType.DESTINATION,
  cardDescription: toGameText(
    "Achieve an Event, even if you don't meet the listed requirements."
  ),
  isConstruction: false,
  isUnique: false,
  baseVP: 5,
  numInDeck: 1,
  resourcesToGain: {},
  baseCost: {
    [ResourceType.BERRY]: 6,
  },
  canPlayCheckInner: (gameState: GameState, gameInput: GameInput) => {
    if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
      if (
        Object.entries(gameState.eventsMap).every(
          ([eventName, playerId]) => playerId !== null
        )
      ) {
        return "No playable events";
      }
    }
    return null;
  },
  playInner: (gameState: GameState, gameInput: GameInput) => {
    if (gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD) {
      gameState.pendingGameInputs.push({
        inputType: GameInputType.CLAIM_EVENT,
        prevInputType: gameInput.inputType,
        label: "Select an EVENT to play for free",
        cardContext: CardName.AMILLA_GLISTENDEW,
        clientOptions: {
          event: null,
        },
      });
    }
  },
};
