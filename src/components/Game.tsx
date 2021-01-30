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
  game: GameJSON;
  gameInputs: GameInput[];
  viewingPlayer: PlayerJSON | null;
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
  const { playerId = null, playerSecret = null } = viewingPlayer || {};
  gameState.players = gameState.players.map((player) => {
    if (viewingPlayer && player.playerId === viewingPlayer.playerId) {
      return viewingPlayer;
    } else {
      return player;
    }
  });
  const viewingPlayerImpl = viewingPlayer
    ? Player.fromJSON(viewingPlayer)
    : null;
  const gameStateImpl = GameState.fromJSON(gameState);
  return (
    <div className={styles.container}>
      <GameUpdater
        gameId={gameId}
        playerId={playerId}
        isGameOver={gameStateImpl.isGameOver()}
        activePlayerId={gameState.activePlayerId}
        playerSecret={playerSecret as string}
        gameStateId={gameState.gameStateId}
        onUpdate={updateGameAndViewingPlayer}
      >
        <GameBoard
          gameState={gameStateImpl}
          viewingPlayer={viewingPlayerImpl}
        />
        {gameStateImpl.isGameOver() && (
          <GamePointsBreakdown gameState={gameStateImpl} />
        )}
        <GameInputBox
          key={gameState.gameStateId}
          gameId={gameId}
          gameState={gameState}
          gameInputs={gameInputs}
          viewingPlayer={viewingPlayerImpl}
        />
        <Players
          viewingPlayer={viewingPlayerImpl}
          gameStateJSON={gameState}
          showRealtimePoints={
            gameState.gameOptions.realtimePoints ||
            // Game options used to be on the game object.
            // Keeping this for backwards compatibility.
            !!(game as any)?.gameOptions?.realtimePoints
          }
        />
        {viewingPlayerImpl && <ViewerUI player={viewingPlayerImpl} />}
        {gameStateImpl.gameOptions.pearlbrook && (
          <River gameState={gameStateImpl} viewingPlayer={viewingPlayerImpl} />
        )}
        <LocationsAndEvents
          gameState={gameStateImpl}
          viewingPlayer={viewingPlayerImpl}
        />
      </GameUpdater>
    </div>
  );
};

export default Game;
