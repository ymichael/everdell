import * as React from "react";
import styles from "../styles/gameBoard.module.css";
import {
  CardName,
  LocationNameToPlayerIds,
  LocationName,
} from "../model/types";
import Card from "./Card";
import Location from "./Location";
import { GameBlock } from "./common";

export const Meadow: React.FC<{ meadowCards: CardName[] }> = ({
  meadowCards,
}) => {
  return (
    <GameBlock title={"Meadow"}>
      <div className={styles.items}>
        {meadowCards.map((cardName, idx) => (
          <Card key={idx} name={cardName} />
        ))}
      </div>
    </GameBlock>
  );
};

export const Locations: React.FC<{ locationsMap: LocationNameToPlayerIds }> = ({
  locationsMap,
}) => {
  return (
    <GameBlock title={"Locations"}>
      <div className={styles.items}>
        {Object.keys(locationsMap).map((locationName, idx) => (
          <Location key={idx} name={locationName as LocationName} />
        ))}
      </div>
    </GameBlock>
  );
};
