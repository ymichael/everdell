import * as React from "react";
import { GameJSON } from "../model/jsonTypes";
import { GameState } from "../model/gameState";
import { GameBlock } from "./common";

import { Meadow } from "./gameBoard";
import GameInputBox from "./GameInputBox";

import styles from "../styles/GameAdmin.module.css";
import { useTranslation } from "next-i18next";

const GameAdmin = ({
  gameJSON,
  devDebugMode,
}: {
  gameJSON: GameJSON;
  devDebugMode: boolean;
}) => {
  const { t } = useTranslation("common");

  const gameState = GameState.fromJSON(gameJSON.gameState);
  return (
    <div id={"js-game-admin"} className={styles.container}>
      <GameBlock title={t("Game Created")}>
        <div className={styles.label}>
          {t('Copy links to share with other players:')}
        </div>
        <ul className={styles.links}>
          {gameState.players.map((p: any, idx: number) => (
            <li key={idx}>
              <a
                href={`/game/${gameJSON.gameId}?playerSecret=${p.playerSecret}`}
              >
                {p.name}{" "}
              </a>
            </li>
          ))}
        </ul>

        <div className={styles.footer}>
          <i>
            Game ID: {gameJSON.gameId}
            &nbsp;&middot;&nbsp;
            <a target="_blank" href={`/game/${gameJSON.gameId}`}>
              spectator link
            </a>
          </i>
        </div>
      </GameBlock>
      {devDebugMode && (
        <>
          <hr />
          <GameAdminDebugOnly gameJSON={gameJSON} />
        </>
      )}
    </div>
  );
};

const GameAdminDebugOnly: React.FC<{ gameJSON: GameJSON }> = ({ gameJSON }) => {
  const gameState = GameState.fromJSON(gameJSON.gameState);
  const gameInputs = gameState.getPossibleGameInputs();
  return (
    <>
      {gameState.players.map((player, idx) => (
        <React.Fragment key={idx}>
          <GameInputBox
            title={`Game Input: ${player.name}`}
            devDebug={true}
            gameId={gameJSON.gameId}
            gameInputs={gameInputs}
            gameState={gameState}
            viewingPlayer={player}
          />
          <pre>{JSON.stringify(player.toJSON(true), null, 2)}</pre>
        </React.Fragment>
      ))}
      <Meadow meadowCards={gameState.meadowCards} />
    </>
  );
};

export default GameAdmin;
