import { useMemo } from "react";
import {
  Store,
  AnyAction,
  createStore,
  applyMiddleware,
  combineReducers,
} from "redux";
import { composeWithDevTools } from "redux-devtools-extension";
import { gameReducer } from "./game";

let store: Store | undefined;

export type StoreState = {
  activeGame: object | null;
};

const initialState: StoreState = {
  activeGame: null,
};

function initStore(preloadedState = initialState) {
  return createStore(
    combineReducers({
      activeGame: gameReducer,
    }),
    preloadedState,
    composeWithDevTools(applyMiddleware())
  );
}

export const initializeStore = (preloadedState: StoreState) => {
  let _store = store ?? initStore(preloadedState);

  // After navigating to a page with an initial Redux state, merge that state
  // with the current state in the store, and create a new store
  if (preloadedState && store) {
    _store = initStore({
      ...store.getState(),
      ...preloadedState,
    });
    // Reset the current store
    store = undefined;
  }

  // For SSG and SSR always create a new store
  if (typeof window === "undefined") return _store;
  // Create the store once in the client
  if (!store) store = _store;

  return _store;
};

export function useStore(initialState: StoreState) {
  const store = useMemo(() => initializeStore(initialState), [initialState]);
  return store;
}
