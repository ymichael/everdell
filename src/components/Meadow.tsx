import * as React from "react";
import styles from "../styles/Meadow.module.css";
import { CardName } from "../model/types";
import Card from "./Card";

const Meadow: React.FC<{ meadowCards: CardName[] }> = ({ meadowCards }) => {
  return (
    <div className={styles.container}>
      <h3>Meadow</h3>
      <div className={styles.cards}>
        {meadowCards.map((cardName, idx) => (
          <Card key={idx} name={cardName} />
        ))}
      </div>
    </div>
  );
};

export default Meadow;
