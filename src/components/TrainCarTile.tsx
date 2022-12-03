import * as React from "react";

import { TrainCarTile as TrainCarTileModel } from "../model/trainCarTile";
import { TrainCarTileName } from "../model/types";
import { ItemWrapper } from "./common";
import styles from "../styles/TrainCarTile.module.css";

import { Description } from "./common";

export const TrainCarTile = ({
  name,
  label,
}: {
  name: TrainCarTileName | null;
  label?: string;
}) => {
  return name ? (
    <ItemWrapper
      footerChildren={<span className={styles.label}>{label ?? "Bonus"}</span>}
    >
      <div data-cy={`trainCarTile:${name}`} className={styles.trainCarTile}>
        <Description textParts={TrainCarTileModel.fromName(name).shortName} />
      </div>
    </ItemWrapper>
  ) : (
    <ItemWrapper footerChildren={<span className={styles.label}>Empty</span>}>
      <div data-cy={`trainCarTile:empty`} className={styles.trainCarTile}></div>
    </ItemWrapper>
  );
};

export default TrainCarTile;
