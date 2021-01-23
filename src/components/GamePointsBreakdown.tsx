import * as React from "react";
import styles from "../styles/GamePointsBreakdown.module.css";

import { ResourceType } from "../model/types";
import { GameState } from "../model/gameState";

import { GameBlock, Description } from "./common";

const GamePointsBreakdown: React.FC<{
  gameState: GameState;
}> = ({ gameState }) => {
  return (
    <GameBlock title={"Points Breakdown"}>
      <div>
        <table className={styles.summary_table}>
          <thead>
            <tr>
              <th>{"Player"}</th>
              <th>{"Card Points"}</th>
              <th>{"Event Points"}</th>
              <th>{"Journey Points"}</th>
              <th>
                <Description textParts={[{ type: "symbol", symbol: "VP" }]} />
              </th>
              <th className={styles.total_cell}>{"Total"}</th>
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
                  <td>{player.getPointsFromJourney(gameState)}</td>
                  <td>{player.getNumResourcesByType(ResourceType.VP)}</td>
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
