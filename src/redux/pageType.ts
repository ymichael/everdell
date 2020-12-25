import { AnyAction } from "redux";

export enum PageType {
  HOME = "HOME",
  GAME = "GAME",
  GAME_BUILDER = "GAME_BUILDER",
}

export const pageTypeReducer = (
  state: PageType = PageType.HOME,
  action: AnyAction
): PageType => {
  if (action.type === "CREATE_GAME") {
    return PageType.GAME;
  }
  if (action.type === "NEW_GAME") {
    return PageType.GAME_BUILDER;
  }
  return state;
};
