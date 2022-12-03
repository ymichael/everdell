import * as React from "react";
import { useState, useCallback } from "react";
import { unstable_batchedUpdates } from "react-dom";

import { GameBoard, LocationsAndEvents, River } from "./gameBoard";
import Players from "./Players";
import GamePointsBreakdown from "./GamePointsBreakdown";
import ViewerUI from "./ViewerUI";
import GameInputBox from "./GameInputBox";
import GameUpdater from "./GameUpdater";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";
import { GameInput } from "../model/types";
import { GameJSON, PlayerJSON } from "../model/jsonTypes";

import styles from "../styles/Game.module.css";

const Game: React.FC<{
  gameJSON: GameJSON;
  gameInputs: GameInput[];
  viewingPlayerJSON: PlayerJSON | null;
}> = (props) => {
  const [gameJSON, setGameJSON] = useState(props.gameJSON);
  const [gameInputs, setGameInputs] = useState(props.gameInputs);
  const [viewingPlayerJSON, setViewingPlayerJSON] = useState(
    props.viewingPlayerJSON
  );
  const updateGameAndViewingPlayer = useCallback(
    ({ gameJSON, viewingPlayerJSON, gameInputs }) => {
      unstable_batchedUpdates(() => {
        setGameJSON(gameJSON);
        setViewingPlayerJSON(viewingPlayerJSON);
        setGameInputs(gameInputs);
      });
    },
    [gameJSON, viewingPlayerJSON, gameInputs]
  );

  const { gameId, gameState: gameStateJSON } = gameJSON;
  const { playerId = null, playerSecret = null } = viewingPlayerJSON || {};

  gameStateJSON.players = gameStateJSON.players.map((playerJSON) => {
    if (playerJSON.playerId === viewingPlayerJSON?.playerId) {
      return viewingPlayerJSON;
    } else {
      return playerJSON;
    }
  });

  const gameState = GameState.fromJSON(gameStateJSON);
  const viewingPlayer = viewingPlayerJSON
    ? Player.fromJSON(viewingPlayerJSON)
    : null;

  return (
    <div className={styles.container}>
      <GameUpdater
        gameId={gameId}
        playerId={playerId}
        isGameOver={gameState.isGameOver()}
        activePlayerId={gameState.activePlayerId}
        playerSecret={playerSecret as string}
        gameStateId={gameState.gameStateId}
        onUpdate={updateGameAndViewingPlayer}
      >
        <GameBoard
          gameStateJSON={gameStateJSON}
          gameState={gameState}
          viewingPlayer={viewingPlayer}
        />
        {gameState.isGameOver() && (
          <GamePointsBreakdown gameState={gameState} />
        )}
        <GameInputBox
          key={gameState.gameStateId}
          gameId={gameId}
          gameState={gameState}
          gameInputs={gameInputs}
          viewingPlayer={viewingPlayer}
        />
        <Players
          viewingPlayer={viewingPlayer}
          gameState={gameState}
          showRealtimePoints={
            gameState.gameOptions.realtimePoints ||
            // Game options used to be on the game object.
            // Keeping this for backwards compatibility.
            !!(gameJSON as any)?.gameOptions?.realtimePoints
          }
        />
        {viewingPlayer && (
          <ViewerUI player={viewingPlayer} gameState={gameState} />
        )}
        {gameState.gameOptions.pearlbrook && (
          <River gameState={gameState} viewingPlayer={viewingPlayer} />
        )}
        <LocationsAndEvents
          gameState={gameState}
          viewingPlayer={viewingPlayer}
        />
      </GameUpdater>
    </div>
  );
};

export default Game;
