import * as React from "react";
import { useDispatch } from "react-redux";

const GameBuilder: React.FC = () => {
  const dispatch = useDispatch();
  return (
    <>
      <div>Create Game</div>
      <p>TODO: form here</p>
      <button
        onClick={() => {
          dispatch({
            type: "CREATE_GAME",
            playerNames: ["player one", "player two"],
          });
        }}
      >
        create game
      </button>
    </>
  );
};

export default GameBuilder;
