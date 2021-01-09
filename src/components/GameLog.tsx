import * as React from "react";
import { useEffect, useRef } from "react";
import styles from "../styles/GameLog.module.css";

import { GameLogEntry } from "../model/types";
import { Description, GameBlock } from "./common";

const GameLog: React.FC<{ logs: GameLogEntry[]; fixedHeight?: boolean }> = ({
  logs,
  fixedHeight = true,
}) => {
  const logsElRef = useRef<HTMLDivElement>(null);
  const lastLogElRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logsElRef.current && lastLogElRef.current) {
      logsElRef.current.scrollTop = lastLogElRef.current.offsetTop;
    }
  }, [logs.length]);
  return (
    <GameBlock title={"Game Log"}>
      <div
        className={[styles.logs, fixedHeight && styles.logs_height]
          .filter(Boolean)
          .join(" ")}
        ref={logsElRef}
      >
        {logs.map(({ entry }, idx) => {
          return (
            <div
              key={idx}
              className={styles.log}
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
    </GameBlock>
  );
};

export default GameLog;
