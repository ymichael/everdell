import * as React from "react";
import { useEffect, useState, useRef } from "react";
import isEqual from "lodash/isEqual";

import styles from "../styles/GameLog.module.css";

import EntityList from "./EntityList";
import { GameLogEntry } from "../model/types";
import { GameState } from "../model/gameState";
import { GameStateJSON } from "../model/jsonTypes";
import { Description, GameBlock } from "./common";

const GameLog: React.FC<{
  logs: GameLogEntry[];
  gameStateJSON?: GameStateJSON | null;
  fixedHeight?: boolean;
}> = ({ gameStateJSON = null, logs, fixedHeight = true }) => {
  const [selectedEntry, setSelectedEntry] = useState<
    GameLogEntry["entry"] | null
  >(null);
  const logsElRef = useRef<HTMLDivElement>(null);
  const lastLogElRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logsElRef.current && lastLogElRef.current) {
      logsElRef.current.scrollTop = lastLogElRef.current.offsetTop;
    }
  }, [logs.length]);

  let activePlayerEl = null;
  if (gameStateJSON) {
    const gameStateImpl = GameState.fromJSON(gameStateJSON);
    const activePlayerImpl = gameStateImpl.getActivePlayer();
    activePlayerEl = (
      <>
        <div className={styles.log_stat}>
          {gameStateImpl.isGameOver() ? (
            <span>Game Over</span>
          ) : (
            <>
              <span>Active: </span>
              <span>{activePlayerImpl.name}</span>
            </>
          )}
        </div>
        {" / "}
      </>
    );
  }

  return (
    <GameBlock title={"Game Log"}>
      {gameStateJSON && (
        <div className={styles.log_stats}>
          {activePlayerEl}
          <div className={styles.log_stat}>
            <span>Deck: </span>
            <span>{gameStateJSON.deck.numCards}</span>
          </div>
          {" / "}
          <div className={styles.log_stat}>
            <span>Discard: </span>
            <span>{gameStateJSON.discardPile.numCards}</span>
          </div>
        </div>
      )}
      <div
        className={[styles.logs, fixedHeight && styles.logs_height]
          .filter(Boolean)
          .join(" ")}
        ref={logsElRef}
      >
        <div className={styles.logs_inner}>
          {logs.map(({ entry }, idx) => {
            const isSelected = selectedEntry && isEqual(selectedEntry, entry);
            return (
              <div
                key={idx}
                className={[styles.log, isSelected && styles.log_selected].join(
                  " "
                )}
                onClick={() => {
                  setSelectedEntry(isSelected ? null : entry);
                }}
                ref={idx == logs.length - 1 ? lastLogElRef : null}
              >
                <span className={styles.log_prefix}>{">> "}</span>
                <span>
                  <Description textParts={entry} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
      {selectedEntry && (
        <div className={styles.log_entities}>
          <EntityList textParts={selectedEntry} />
        </div>
      )}
    </GameBlock>
  );
};

export default GameLog;
