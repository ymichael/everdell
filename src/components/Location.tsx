import * as React from "react";
import styles from "../styles/location.module.css";

import { Card as CardModel } from "../model/card";
import { Location as LocationModel } from "../model/location";
import { CardTypeSymbol, ResourceTypeIcon } from "./assets";
import { LocationName, LocationType } from "../model/types";
import { Description } from "./common";

const colorClassMap = {
  BASIC: styles.color_basic,
  FOREST: styles.color_forest,
  HAVEN: styles.color_haven,
  JOURNEY: styles.color_journey,
};

const Location: React.FC<{ name: LocationName }> = ({ name }) => {
  const location = LocationModel.fromName(name as any);
  const colorClass = colorClassMap[location.type];
  return (
    <>
      <div className={[styles.location, colorClass].join(" ")}>
        <div className={styles.location_top}></div>
        <div className={styles.location_center}>
          <Description description={location.description || [location.name]} />
        </div>
        <div className={styles.location_bot}>
          <div className={styles.location_type}>{location.type}</div>
        </div>
      </div>
    </>
  );
};

export default Location;
