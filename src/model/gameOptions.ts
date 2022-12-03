import { GameOptions } from "./types";

export const defaultGameOptions = (
  gameOptions: Partial<GameOptions>
): GameOptions => {
  const ret = {
    realtimePoints: false,
    pearlbrook: false,
    ...gameOptions,
  };

  // TODO: Validate game options
  if (ret.newleaf?.knoll && !ret.newleaf?.station) {
    throw new Error("Cannot play with newleaf.knoll without newleaf.station");
  }

  return ret;
};
