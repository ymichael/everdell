import * as React from "react";
import styles from "../styles/Meadow.module.css";
import { CardName } from "../model/types";
import Card from "./Card";
import { GameBlock } from "./common";

const Meadow: React.FC<{ meadowCards: CardName[] }> = ({ meadowCards }) => {
  return (
    <GameBlock title={"Meadow"}>
      <div className={styles.cards}>
        {meadowCards.map((cardName, idx) => (
          <Card key={idx} name={cardName} />
        ))}
      </div>
    </GameBlock>
  );
};

export default Meadow;
