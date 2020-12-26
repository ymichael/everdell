import * as React from "react";
import Meadow from "./Meadow";
import GameInputBox from "./GameInputBox";

const Game: React.FC<{
  game: any;
  viewingPlayer: any;
}> = ({ game, viewingPlayer }) => {
  return (
    <>
      <Meadow meadowCards={game.gameState.meadowCards} />
      <GameInputBox gameState={game.gameState} viewingPlayer={viewingPlayer} />
      <hr />
      <pre>{JSON.stringify(game, null, 2)}</pre>
    </>
  );
};

export default Game;
