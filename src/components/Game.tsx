import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { unstable_batchedUpdates } from "react-dom";

import { GameBoard, Locations, Events } from "./gameBoard";
import Players from "./Players";
import ViewerUI from "./ViewerUI";
import GameInputBox from "./GameInputBox";
import GameLog from "./GameLog";
import GameUpdater from "./GameUpdater";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";
import { CardName, GameInput } from "../model/types";
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
        <GameLog logs={gameState.gameLog} />
        <GameInputBox
          gameId={gameId}
          gameState={gameState}
          gameInputs={gameInputs}
          viewingPlayer={viewingPlayerImpl}
        />
        <Players viewingPlayer={viewingPlayerImpl} gameState={gameState} />
        <ViewerUI player={viewingPlayerImpl} />
        <Locations
          gameState={gameStateImpl}
          viewingPlayer={viewingPlayerImpl}
        />
        <Events gameState={gameStateImpl} />
      </GameUpdater>
    </div>
  );
};

export default Game;
