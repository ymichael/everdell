import * as React from "react";
import { useState, useCallback } from "react";
import Meadow from "./Meadow";
import GameInputBox from "./GameInputBox";

const Game: React.FC<{ game: any; viewingPlayer: any }> = (props) => {
  const [game, setGame] = useState(props.game);
  const [viewingPlayer, setViewingPlayer] = useState(props.viewingPlayer);
  const updateGameAndViewingPlayer = useCallback(
    ({ game, viewingPlayer }) => {
      setGame(game);
      setViewingPlayer(viewingPlayer);
    },
    [game, viewingPlayer]
  );

  return (
    <>
      <Meadow meadowCards={game.gameState.meadowCards} />
      <GameInputBox
        gameId={game.gameId}
        gameState={game.gameState}
        viewingPlayer={viewingPlayer}
        updateGameAndViewingPlayer={updateGameAndViewingPlayer}
      />
      <hr />
      <pre>{JSON.stringify(game, null, 2)}</pre>
    </>
  );
};

export default Game;
