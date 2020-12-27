import {
  ResourceType,
  LocationName,
  LocationType,
  LocationOccupancy,
  LocationNameToPlayerIds,
  GameInput,
  Season,
} from "./types";
import { GameState } from "./gameState";
import { Player } from "./player";

type LocationApplyInner = (
  gameState: GameState,
  player: Player,
  gameInput: GameInput
) => void;

export class Location {
  readonly name: LocationName;
  readonly type: LocationType;
  readonly occupancy: LocationOccupancy;

  constructor({
    name,
    type,
    occupancy,
  }: {
    name: LocationName;
    type: LocationType;
    occupancy: LocationOccupancy;
  }) {
    this.name = name;
    this.type = type;
    this.occupancy = occupancy;
  }

  canApply(gameState: GameState): boolean {
    if (!(this.name in gameState.locationsMap)) {
      return false;
    }
    if (gameState.getActivePlayer().numAvailableWorkers <= 0) {
      return false;
    }
    if (
      gameState.getActivePlayer().currentSeason !== Season.AUTUMN &&
      this.type === LocationType.JOURNEY
    ) {
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

    //
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
  }),
  [LocationName.JOURNEY_FIVE]: new Location({
    name: LocationName.JOURNEY_FIVE,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
  }),
  [LocationName.JOURNEY_FOUR]: new Location({
    name: LocationName.JOURNEY_FOUR,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
  }),
  [LocationName.JOURNEY_THREE]: new Location({
    name: LocationName.JOURNEY_THREE,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.EXCLUSIVE,
  }),
  [LocationName.JOURNEY_TWO]: new Location({
    name: LocationName.JOURNEY_TWO,
    type: LocationType.JOURNEY,
    occupancy: LocationOccupancy.UNLIMITED,
  }),
  [LocationName.BASIC_ONE_BERRY]: new Location({
    name: LocationName.BASIC_ONE_BERRY,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
  }),
  [LocationName.BASIC_ONE_BERRY_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_BERRY_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
  }),
  [LocationName.BASIC_ONE_RESIN_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_ONE_RESIN_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
  }),
  [LocationName.BASIC_ONE_STONE]: new Location({
    name: LocationName.BASIC_ONE_STONE,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
  }),
  [LocationName.BASIC_THREE_TWIGS]: new Location({
    name: LocationName.BASIC_THREE_TWIGS,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
  }),
  [LocationName.BASIC_TWO_CARDS_AND_ONE_VP]: new Location({
    name: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
  }),
  [LocationName.BASIC_TWO_RESIN]: new Location({
    name: LocationName.BASIC_TWO_RESIN,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.EXCLUSIVE,
  }),
  [LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD]: new Location({
    name: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD,
    type: LocationType.BASIC,
    occupancy: LocationOccupancy.UNLIMITED,
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
