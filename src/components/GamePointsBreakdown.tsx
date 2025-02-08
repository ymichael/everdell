import * as React from "react";
import styles from "../styles/GamePointsBreakdown.module.css";

import { ResourceType } from "../model/types";
import { GameState } from "../model/gameState";

import { GameBlock, Description } from "./common";
import { useTranslation } from "next-i18next";

const GamePointsBreakdown: React.FC<{
  gameState: GameState;
}> = ({ gameState }) => {
  const { t } = useTranslation("common");
  return (
    <GameBlock title={"Points Breakdown"}>
      <div>
        <table className={styles.summary_table}>
          <thead>
            <tr>
              <th>{t("Player")}</th>
              <th>{t("Card Points")}</th>
              <th>{t("Event Points")}</th>
              {gameState.gameOptions.pearlbrook && (
                <>
                  <th>{t("Adornment Points")}</th>
                  <th>{t("Wonder Points")}</th>
                </>
              )}
              <th>{t("Journey Points")}</th>
              <th>
                <Description textParts={[{ type: "symbol", symbol: "VP" }]} />
              </th>
              {gameState.gameOptions.pearlbrook && (
                <th>
                  <Description
                    textParts={[
                      { type: "resource", resourceType: ResourceType.PEARL },
                    ]}
                  />
                </th>
              )}
              <th className={styles.total_cell}>{t("Total")}</th>
            </tr>
          </thead>
          <tbody>
            {gameState.players.map((player) => {
              return (
                <tr>
                  <td>
                    <Description textParts={[player.getGameTextPart()]} />
                  </td>
                  <td>{player.getPointsFromCards(gameState)}</td>
                  <td>{player.getPointsFromEvents(gameState)}</td>
                  {gameState.gameOptions.pearlbrook && (
                    <>
                      <td>{player.getPointsFromAdornments(gameState)}</td>
                      <td>{player.getPointsFromWonders(gameState)}</td>
                    </>
                  )}
                  <td>{player.getPointsFromJourney(gameState)}</td>
                  <td>{player.getNumResourcesByType(ResourceType.VP)}</td>
                  {gameState.gameOptions.pearlbrook && (
                    <td>
                      &nbsp;
                      {player.getNumResourcesByType(ResourceType.PEARL) * 2}
                    </td>
                  )}
                  <td className={styles.total_cell}>
                    {player.getPoints(gameState)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div></div>
    </GameBlock>
  );
};

export default GamePointsBreakdown;
