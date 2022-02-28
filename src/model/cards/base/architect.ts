import { Card } from "model/card";
import { GameState } from "model/gameState";
import { toGameText } from "model/gameText";
import { CardName, CardType, ResourceType } from "model/types";

export const architect = (): Card => new Card({
  name: CardName.ARCHITECT,
  numInDeck: 2,
  cardType: CardType.PROSPERITY,
  baseCost: { [ResourceType.BERRY]: 4 },
  baseVP: 2,
  isUnique: true,
  isConstruction: false,
  associatedCard: CardName.CRANE,
  cardDescription: toGameText([
    { type: "points", value: 1 },
    " for each of your unused RESIN and PEBBLE, to a maximum of 6.",
  ]),
  // 1 point per rock and pebble, up to 6 pts
  pointsInner: (gameState: GameState, playerId: string) => {
    const player = gameState.getPlayer(playerId);
    const numPebblesAndResin =
      player.getNumResourcesByType(ResourceType.PEBBLE) +
      player.getNumResourcesByType(ResourceType.RESIN);
    return numPebblesAndResin > 6 ? 6 : numPebblesAndResin;
  }
})