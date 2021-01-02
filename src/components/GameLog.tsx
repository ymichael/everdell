import * as React from "react";
import { useEffect, useRef } from "react";
import styles from "../styles/GameLog.module.css";

import { GameLogEntry } from "../model/types";
import { GameBlock } from "./common";

const GameLog: React.FC<{ logs: GameLogEntry[] }> = ({ logs }) => {
  const logsElRef = useRef<HTMLDivElement>(null);
  const lastLogElRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logsElRef.current && lastLogElRef.current) {
      logsElRef.current.scrollTop = lastLogElRef.current.offsetTop;
    }
  }, []);
  return (
    <GameBlock title={"Game Log"}>
      <div className={styles.logs} ref={logsElRef}>
        {logs.map(({ text }, idx) => {
          return (
            <div
              key={text}
              className={styles.log}
              ref={idx == logs.length - 1 ? lastLogElRef : null}
            >
              <span className={styles.log_prefix}>{">> "}</span>
              <span className={styles.log_text}>{text}</span>
            </div>
          );
        })}
      </div>
    </GameBlock>
  );
};

export default GameLog;
