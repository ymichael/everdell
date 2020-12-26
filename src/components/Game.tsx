import * as React from "react";
import { useSelector, useDispatch } from "react-redux";

import { StoreState } from "../redux/store";
import { PageType } from "../redux/pageType";

const Game: React.FC = () => {
  const dispatch = useDispatch();
  const game = useSelector((state: StoreState) => state.activeGame);
  return (
    <>
      <p>
        <h2>Meadow</h2>
      </p>
      <pre>{JSON.stringify(game, null, 2)}</pre>
      <button
        onClick={() => {
          dispatch({
            type: "END_GAME",
          });
        }}
      >
        end game
      </button>
    </>
  );
};

export default Game;
