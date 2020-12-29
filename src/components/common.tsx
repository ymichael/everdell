import * as React from "react";
import styles from "../styles/common.module.css";

export const GameBlockTitle: React.FC = ({ children }) => {
  return <div className={styles.title}>{children}</div>;
};

export const GameBlock: React.FC<{ title: string }> = ({ title, children }) => {
  return (
    <div className={styles.block}>
      <GameBlockTitle>{title}</GameBlockTitle>
      {children}
    </div>
  );
};
