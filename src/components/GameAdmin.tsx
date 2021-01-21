import * as React from "react";
import { GameJSON } from "../model/jsonTypes";
import { GameState } from "../model/gameState";
import { GameBlock } from "./common";

import { Meadow } from "./gameBoard";
import GameInputBox from "./GameInputBox";

import styles from "../styles/GameAdmin.module.css";

const GameAdmin = ({
  game,
  devDebugMode,
}: {
  game: GameJSON;
  devDebugMode: boolean;
}) => {
  return (
    <div className={styles.container}>
      <GameBlock title={"Game Created"}>
        <p>Copy links to share with other players:</p>
        <ul>
          {game.gameState.players.map((p: any, idx: number) => (
            <li key={idx}>
              <a href={`/game/${game.gameId}?playerSecret=${p.playerSecret}`}>
                {p.name}{" "}
              </a>
            </li>
          ))}
        </ul>
        <i>Game ID: {game.gameId}</i>
      </GameBlock>
      {devDebugMode && (
        <>
          <hr />
          <GameAdminDebugOnly game={game} />
        </>
      )}
    </div>
  );
};

const GameAdminDebugOnly: React.FC<{ game: GameJSON }> = ({ game }) => {
  const gameStateImpl = GameState.fromJSON(game.gameState);
  const gameInputs = gameStateImpl.getPossibleGameInputs();
  return (
    <>
      {gameStateImpl.players.map((player, idx) => (
        <React.Fragment key={idx}>
          <GameInputBox
            title={`Game Input: ${player.name}`}
            devDebug={true}
            gameId={game.gameId}
            gameInputs={gameInputs}
            gameState={game.gameState}
            viewingPlayer={player}
          />
          <pre>{JSON.stringify(player.toJSON(true), null, 2)}</pre>
        </React.Fragment>
      ))}
      <Meadow meadowCards={game.gameState.meadowCards} />
    </>
  );
};

export default GameAdmin;
