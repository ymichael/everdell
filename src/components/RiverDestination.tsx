import * as React from "react";

import styles from "../styles/RiverDestination.module.css";

import { RiverDestination as RiverDestinationModel } from "../model/riverDestination";
import { RiverDestinationName } from "../model/types";

import { Description, ItemWrapper } from "./common";

export const RiverDestination = ({ name }: { name: RiverDestinationName }) => {
  const riverDestination = RiverDestinationModel.fromName(name);
  return (
    <ItemWrapper>
      <div className={styles.item}>
        <div className={styles.header}>
          {riverDestination.name}
          {riverDestination.name !== RiverDestinationName.SHOAL && (
            <div className={styles.location_type}>{riverDestination.type}</div>
          )}
        </div>
        <div className={styles.description}>
          <Description textParts={riverDestination.description} />
        </div>
      </div>
    </ItemWrapper>
  );
};

export default RiverDestination;
