import * as React from "react";

import { GameState } from "../model/gameState";
import { Player } from "../model/player";

const GameInputBoxWaiting: React.FC<{ activePlayer: Player }> = ({
  activePlayer,
}) => {
  return (
    <div>
      <h3>Game Input Box:</h3>
      <p>Waiting for {activePlayer.name}</p>
    </div>
  );
};

const GameInputBox: React.FC<any> = ({ gameState, viewingPlayer }) => {
  const gameStateImpl = GameState.fromJSON(gameState);
  const activePlayerImpl = gameStateImpl.getActivePlayer();

  if (gameState.activePlayerId !== viewingPlayer.playerId) {
    return <GameInputBoxWaiting activePlayer={activePlayerImpl} />;
  }

  return (
    <div>
      <h3>Game Input Box:</h3>
      <>
        <p>Perform an action:</p>
        <pre>
          {JSON.stringify(gameStateImpl.getPossibleGameInputs(), null, 2)}
        </pre>
      </>
    </div>
  );
};

export default GameInputBox;
