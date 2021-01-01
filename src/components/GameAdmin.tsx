import * as React from "react";
import { GameJSON } from "../model/jsonTypes";
import { Player } from "../model/player";
import { GameBlock } from "./common";

import Meadow from "./Meadow";
import GameInputBox from "./GameInputBox";

const GameAdmin = ({
  game,
  devDebugMode,
}: {
  game: GameJSON;
  devDebugMode: boolean;
}) => {
  return (
    <>
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
          {game.gameState.players.map((pJSON, idx) => (
            <React.Fragment key={idx}>
              <GameInputBox
                title={`Game Input:: ${pJSON.name}`}
                gameId={game.gameId}
                gameState={game.gameState}
                viewingPlayer={Player.fromJSON(pJSON)}
              />
              <pre>{JSON.stringify(pJSON, null, 2)}</pre>
            </React.Fragment>
          ))}
          <Meadow meadowCards={game.gameState.meadowCards} />
        </>
      )}
    </>
  );
};

export default GameAdmin;
