import { useMemo } from "react";
import { Store, AnyAction, createStore, applyMiddleware } from "redux";
import { composeWithDevTools } from "redux-devtools-extension";

import { IGame } from "../model/types";

let store: Store | undefined;

type StoreState = {
  activeGame: IGame | null;
};

const initialState: StoreState = {
  activeGame: null,
};

const reducer = (state: StoreState = initialState, action: AnyAction) => {
  switch (action.type) {
    default:
      return state;
  }
};

function initStore(preloadedState = initialState) {
  return createStore(
    reducer,
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
