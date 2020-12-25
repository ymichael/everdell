import { AnyAction } from "redux";
import { IGame } from "../model/types";
import { createGame } from "../model/game";

export const gameReducer = (
  state: IGame | null = null,
  action: AnyAction
): IGame | null => {
  if (action.type === "CREATE_GAME") {
    return createGame(action.playerNames);
  }
  return state;
};
