import * as React from "react";

const GameInputBox: React.FC<any> = ({ gameState, viewingPlayer }) => {
  const activePlayer = gameState.players.find(
    (p: any) => p.playerId === gameState.activePlayerId
  );

  return (
    <div>
      <h3>Game Input Box:</h3>
      {gameState.activePlayerId !== viewingPlayer.playerId ? (
        <p>Waiting for {activePlayer.name}</p>
      ) : (
        <>
          <p>Perform an action:</p>
        </>
      )}
    </div>
  );
};

export default GameInputBox;
