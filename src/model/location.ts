import {
  CardName,
  ResourceType,
  ResourceMap,
  OwnableResourceType,
  LocationName,
  LocationType,
  LocationOccupancy,
  LocationNameToPlayerIds,
  GameInput,
  GameInputType,
  Season,
} from "./types";
import { GameState } from "./gameState";
import { Player } from "./player";

type LocationApplyInner = (
  gameState: GameState,
  player: Player,
  gameInput: GameInput
) => void;

type LocationCanApplyInner = (gameState: GameState) => boolean;

const applyInnerGainResourceFactory = ({
  resourceMap,
  numCardsToDraw = 0,
}: {
  resourceMap: Partial<Record<OwnableResourceType, number>>;
  numCardsToDraw?: number;
}): LocationApplyInner => {
  return (gameState: GameState, player: Player, gameInput: GameInput) => {
    player.gainResources(resourceMap);
    if (numCardsToDraw !== 0) {
      player.drawCards(gameState, numCardsToDraw);
    }
  };
};

const applyInnerJourneyFactory = (numPoints: number): LocationApplyInner => {
  return (gameState: GameState, player: Player, gameInput: GameInput) => {
    if (player.cardsInHand.length < numPoints) {
      throw new Error("Insufficient cards for journey");
    }
    if (gameInput.inputType !== GameInputType.PLACE_WORKER) {
      throw new Error("Invalid input type");
    }
    if (gameInput.cardsToDiscard?.length !== numPoints) {
      throw new Error("Must specify cards to discard for journey");
    }
    gameInput.cardsToDiscard.forEach((card: CardName) =>
      player.discardCard(card)
    );
    player.resources[ResourceType.VP] += numPoints;
  };
};

const canApplyInnerJourneyFactory = (
  numPoints: number
): LocationCanApplyInner => {
  return (gameState: GameState) => {
    if (gameState.getActivePlayer().currentSeason !== Season.AUTUMN) {
      return false;
    }
    if (gameState.getActivePlayer().cardsInHand.length < numPoints) {
      return false;
    }
    return true;
  };
};

export class Location {
  readonly name: LocationName;
  readonly type: LocationType;
  readonly occupancy: LocationOccupancy;
  readonly applyInner: LocationApplyInner;
  readonly canApplyInner: LocationCanApplyInner | undefined;

  constructor({
    name,
    type,
    occupancy,
    applyInner,
    canApplyInner,
  }: {
    name: LocationName;
    type: LocationType;
    occupancy: LocationOccupancy;
    applyInner: LocationApplyInner;
    canApplyInner?: LocationCanApplyInner;
  }) {
    this.name = name;
    this.type = type;
    this.occupancy = occupancy;
    this.applyInner = applyInner;
    this.canApplyInner = canApplyInner;
  }

  canApply(gameState: GameState): boolean {
    if (!(this.name in gameState.locationsMap)) {
      return false;
    }
    if (gameState.getActivePlayer().numAvailableWorkers <= 0) {
      return false;
    }
    if (this.canApplyInner && !this.canApplyInner(gameState)) {
      return false;
    }
    if (this.occupancy === LocationOccupancy.EXCLUSIVE) {
      return gameState.locationsMap[this.name]!.length === 0;
    } else if (this.occupancy === LocationOccupancy.EXCLUSIVE_FOUR) {
      return (
        gameState.locationsMap[this.name]!.length <
        (gameState.players.length < 4 ? 1 : 2)
      );
    } else if (this.occupancy === LocationOccupancy.UNLIMITED) {
      return true;
    } else {
      throw new Error(`Unexpected occupancy: ${this.occupancy}`);
    }
  }

  apply(gameState: GameState, gameInput: GameInput): void {
    if (!this.canApply(gameState)) {
      throw new Error(`Unable to visit location ${this.name}`);
    }
    const player = gameState.getActivePlayer();
    gameState.locationsMap[this.name]!.push(player.playerId);
    player.numAvailableWorkers--;

    this.applyInner(gameState, player, gameInput);
  }

  static fromName(name: LocationName): Location {
    return LOCATION_REGISTRY[name];
  }

  static byType(type: LocationType): LocationName[] {
    return ((Object.entries(LOCATION_REGISTRY) as unknown) as [
      LocationName,
      Location
    ][])
      .filter(([_, loc]) => {
        return loc.type === type;
      })
      .map(([name, _]) => {
        return name;
      });
  }
}

const LOCATION_REGISTRY: Record<LocationName, Location> = {
  [LocationName.HAVEN]: new Location({
    name: LocationName.HAVEN,
    type: LocationType.HAVEN,
    occupancy: LocationOccupancy.UNLIMITED,
    applyInner: (
      gameState: GameState,
      player: Player,
      gameInput: GameInput
    ) => {
      if (gameInput.inputType !== GameInputType.PLACE_WORKER) {
        throw new Error("Invalid input type");
      }
      if (!(gameInput.cardsToDiscard && gameInput.resourcesToGain)) {
        throw new Error("Invalid game input");
      }

      const numToDiscard = gameInput.cardsToDiscard.length;
      const numResourcesToGain = Math.floor(numToDiscard / 2);
      const resourcesToGain = gameInput.resourcesToGain;

      let gainingNumResources = 0;
      (Object.entries(resourcesToGain) as [ResourceType, number][]).forEach(
        ([resourceType, count]) => {
          if (
            [
              ResourceType.TWIG,
              ResourceType.BERRY,
              ResourceType.PEBBLE,
              ResourceType.RESIN,
            ].indexOf(resourceType) === -1
          ) {
            throw new Error(`Cannot gain: ${resourceType} from the haven`);
          }
          gainingNumResources += count;
        }
      );

      if (gainingNumResources !== numResourcesToGain) {
        throw new Error(
          `Mismatch resources: can gain: ${numResourcesToGain}, gaining: ${gainingNumResources}`
        );
      }

      gameInput.cardsToDiscard.forEach((card: CardName) => {
        player.discardCard(card);
      });

      (Object.keys(resourcesToGain) as (
        | ResourceType.TWIG
        | ResourceType.BERRY
        | ResourceType.PEBBLE
        | ResourceType.RESIN
      )[]).forEach((resourceType) => {
        player.resources[resourceType] += resourcesToGain[
          resourceType
        ] as number;
      });
    },
  }),
  [LocationName.JOURNEY_FIVE]: new Location({
    name: LocationName.JOURNEY_FIVE,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    applyInner: applyInnerJourneyFactory(5),
    canApplyInner: canApplyInnerJourneyFactory(5),
  }),
  [LocationName.JOURNEY_FOUR]: new Location({
    name: LocationName.JOURNEY_FOUR,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    applyInner: applyInnerJourneyFactory(4),
    canApplyInner: canApplyInnerJourneyFactory(4),
  }),
  [LocationName.JOURNEY_THREE]: new Location({
    name: LocationName.JOURNEY_THREE,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
    applyInner: applyInnerJourneyFactory(3),
    canApplyInner: canApplyInnerJourneyFactory(3),
  }),
  [LocationName.JOURNEY_TWO]: new Location({
    name: LocationName.JOURNEY_TWO,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.UNLIMITED,
    applyInner: applyInnerJourneyFactory(2),
    canApplyInner: canApplyInnerJourneyFactory(2),
  }),
  [LocationName.BASIC_ONE_BERRY]: new Location({
    name: LocationName.BASIC_ONE_BERRY,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    applyInner: applyInnerGainResourceFactory({
      resourceMap: { [ResourceType.BERRY]: 1 },
    }),
  }),
  [LocationName.BASIC_ONE_BERRY_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_BERRY_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    applyInner: applyInnerGainResourceFactory({
      resourceMap: { [ResourceType.BERRY]: 1 },
      numCardsToDraw: 1,
    }),
  }),
  [LocationName.BASIC_ONE_RESIN_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_RESIN_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    applyInner: applyInnerGainResourceFactory({
      resourceMap: { [ResourceType.RESIN]: 1 },
      numCardsToDraw: 1,
    }),
  }),
  [LocationName.BASIC_ONE_STONE]: new Location({
    name: LocationName.BASIC_ONE_STONE,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    applyInner: applyInnerGainResourceFactory({
      resourceMap: { [ResourceType.PEBBLE]: 1 },
    }),
  }),
  [LocationName.BASIC_THREE_TWIGS]: new Location({
    name: LocationName.BASIC_THREE_TWIGS,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    applyInner: applyInnerGainResourceFactory({
      resourceMap: { [ResourceType.TWIG]: 3 },
    }),
  }),
  [LocationName.BASIC_TWO_CARDS_AND_ONE_VP]: new Location({
    name: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    applyInner: applyInnerGainResourceFactory({
      resourceMap: { [ResourceType.VP]: 1 },
      numCardsToDraw: 2,
    }),
  }),
  [LocationName.BASIC_TWO_RESIN]: new Location({
    name: LocationName.BASIC_TWO_RESIN,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
    applyInner: applyInnerGainResourceFactory({
      resourceMap: { [ResourceType.RESIN]: 2 },
    }),
  }),
  [LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
    applyInner: applyInnerGainResourceFactory({
      resourceMap: { [ResourceType.RESIN]: 2 },
      numCardsToDraw: 1,
    }),
  }),
};

export const initialLocationsMap = (): LocationNameToPlayerIds => {
  const ret: LocationNameToPlayerIds = {};
  [
    ...Location.byType(LocationType.BASIC),
    ...Location.byType(LocationType.HAVEN),
    ...Location.byType(LocationType.JOURNEY),
  ].forEach((ty) => {
    ret[ty] = [];
  });
  return ret;
};
