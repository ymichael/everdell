import { AnyAction } from "redux";
import { createGame } from "../model/game";

export const gameReducer = (
  state: object | null = null,
  action: AnyAction
): object | null => {
  if (action.type === "CREATE_GAME") {
    return createGame(action.playerNames);
  }
  return state;
};
