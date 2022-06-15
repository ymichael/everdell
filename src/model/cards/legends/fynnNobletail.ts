import { Card } from "../../card";
import { Event } from "../../event";
import { GameState } from "../../gameState";
import { toGameText } from "../../gameText";
import {
  CardName,
  CardType,
  EventName,
  EventType,
  ExpansionType,
  ResourceType,
} from "../../types";

export const fynnNobletail: ConstructorParameters<typeof Card>[0] = {
  expansion: ExpansionType.LEGENDS,
  name: CardName.FYNN_NOBLETAIL,
  upgradeableCard: CardName.KING,
  cardType: CardType.PROSPERITY,
  cardDescription: toGameText([
    { type: "points", value: 2 },
    " for each basic Event you achieved.",
    { type: "BR" },
    { type: "points", value: 3 },
    " for each special Event you achieved.",
  ]),
  isConstruction: false,
  isUnique: false,
  baseVP: 5,
  numInDeck: 1,
  resourcesToGain: {},
  baseCost: {
    [ResourceType.BERRY]: 7,
  },
  pointsInner: (gameState: GameState, playerId: string) => {
    let numPoints = 0;
    const player = gameState.getPlayer(playerId);
    Object.keys(player.claimedEvents).forEach((eventName) => {
      const event = Event.fromName(eventName as EventName);
      if (event.type === EventType.BASIC) {
        numPoints += 2;
      } else if (event.type === EventType.SPECIAL) {
        numPoints += 3;
      }
    });
    return numPoints;
  },
};
