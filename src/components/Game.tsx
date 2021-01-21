import * as React from "react";
import { useState, useCallback } from "react";
import { unstable_batchedUpdates } from "react-dom";

import { GameBoard, LocationsAndEvents } from "./gameBoard";
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
  gameState.players = gameState.players.map((player) => {
    if (player.playerId === viewingPlayer.playerId) {
      return viewingPlayer;
    } else {
      return player;
    }
  });
  const viewingPlayerImpl = Player.fromJSON(viewingPlayer);
  const gameStateImpl = GameState.fromJSON(gameState);
  return (
    <div className={styles.container}>
      <GameUpdater
        gameId={gameId}
        playerId={playerId}
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
          <GamePointsBreakdown
            gameState={gameStateImpl}
            viewingPlayer={viewingPlayerImpl}
          />
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
          showRealtimePoints={game.gameOptions.realtimePoints}
        />
        <ViewerUI player={viewingPlayerImpl} />
        <LocationsAndEvents
          gameState={gameStateImpl}
          viewingPlayer={viewingPlayerImpl}
        />
      </GameUpdater>
    </div>
  );
};

export default Game;
