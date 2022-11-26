import { GameOptions } from "./types";

export const defaultGameOptions = (
  gameOptions: Partial<GameOptions>
): GameOptions => {
  return {
    realtimePoints: false,
    pearlbrook: false,
    ...gameOptions,
  };
};
