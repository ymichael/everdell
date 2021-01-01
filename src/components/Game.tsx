import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { unstable_batchedUpdates } from "react-dom";

import { Meadow, Locations } from "./gameBoard";
import Players from "./Players";
import ViewerUI from "./ViewerUI";
import GameInputBox from "./GameInputBox";
import GameUpdater from "./GameUpdater";
import { Player } from "../model/player";
import { CardName, GameInput } from "../model/types";
import { GameJSON, PlayerJSON } from "../model/jsonTypes";

const Game: React.FC<{
  game: GameJSON;
  gameInputs: GameInput[];
  viewingPlayer: PlayerJSON;
}> = (props) => {
  const [game, setGame] = useState(props.game);
  const [gameInputs, setGameInputs] = useState(props.gameInputs);
  const [viewingPlayer, setViewingPlayer] = useState(props.viewingPlayer);
  const updateGameAndViewingPlayer = useCallback(
    ({ game, viewingPlayer, gameInputs }) => {
      unstable_batchedUpdates(() => {
        setGame(game);
        setViewingPlayer(viewingPlayer);
        setGameInputs(gameInputs);
      });
    },
    [game, viewingPlayer, gameInputs]
  );

  const { gameId, gameState } = game;
  const { playerId, playerSecret } = viewingPlayer;

  const viewingPlayerImpl = Player.fromJSON(viewingPlayer);
  return (
    <GameUpdater
      gameId={gameId}
      playerId={playerId}
      activePlayerId={gameState.activePlayerId}
      playerSecret={playerSecret as string}
      gameStateId={gameState.gameStateId}
      onUpdate={updateGameAndViewingPlayer}
    >
      <Meadow meadowCards={gameState.meadowCards} />
      <GameInputBox
        gameId={gameId}
        gameState={gameState}
        gameInputs={gameInputs}
        viewingPlayer={viewingPlayerImpl}
      />
      <Players viewingPlayer={viewingPlayerImpl} gameState={gameState} />
      <ViewerUI player={viewingPlayerImpl} />
      <Locations locationsMap={gameState.locationsMap} />
      <hr />
      <div>
        <h2>DEBUG</h2>
        <div>
          <h3>you</h3>
          <pre>{JSON.stringify(viewingPlayer, null, 2)}</pre>
        </div>
        <div>
          <h3>Game State:</h3>
          <pre>{JSON.stringify(game, null, 2)}</pre>
        </div>
      </div>
    </GameUpdater>
  );
};

export default Game;
