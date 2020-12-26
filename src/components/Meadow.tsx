import * as React from "react";
import styles from "../styles/Meadow.module.css";
import { CardName } from "../model/types";

const Meadow: React.FC<{ meadowCards: CardName[] }> = ({ meadowCards }) => {
  return (
    <div className={styles.container}>
      <h3>Meadow</h3>
      <ul>
        {meadowCards.map((cardName) => (
          <li>{cardName}</li>
        ))}
      </ul>
    </div>
  );
};

export default Meadow;
