import { IPlayer, Season, ResourceType } from "./types";

export const createPlayer = (name: string): IPlayer => {
  return {
    name,
    playedCards: [],
    cardsInHand: [],
    resources: {
      [ResourceType.VP]: 0,
      [ResourceType.TWIG]: 0,
      [ResourceType.BERRY]: 0,
      [ResourceType.STONE]: 0,
      [ResourceType.RESIN]: 0,
    },
    currentSeason: Season.WINTER,

    // TBD
    numWorkers: 0,
    numAvailableWorkers: 0,
  };
};
