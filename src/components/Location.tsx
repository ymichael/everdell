import * as React from "react";
import styles from "../styles/location.module.css";

import { Card as CardModel } from "../model/card";
import { Location as LocationModel } from "../model/location";
import { sumResources } from "../model/gameStatePlayHelpers";
import {
  ProductionResourceMap,
  ResourceType,
  LocationName,
  LocationType,
} from "../model/types";
import { Description } from "./common";

const colorClassMap = {
  BASIC: styles.color_basic,
  FOREST: styles.color_forest,
  HAVEN: styles.color_haven,
  JOURNEY: styles.color_journey,
};

const resourceTypeList = [
  ResourceType.BERRY,
  ResourceType.TWIG,
  ResourceType.PEBBLE,
  ResourceType.RESIN,
  "CARD" as const,
];

const LocationDescription = ({ location }: { location: LocationModel }) => {
  if (location.description) {
    return <Description description={location.description} />;
  }

  if (sumResources(location.resourcesToGain) !== 0) {
    const description: string[] = [];
    const resourcesToGainKeys = Object.keys(location.resourcesToGain);
    for (let i = 0; i < resourcesToGainKeys.length; i++) {
      const resource = resourcesToGainKeys[i] as keyof ProductionResourceMap;
      const numResource = location.resourcesToGain[resource];
      if (numResource) {
        if (description.length !== 0) {
          if (i === resourcesToGainKeys.length - 1) {
            description.push(" & ");
          } else {
            description.push(", ");
          }
        }
        description.push(`${numResource} `, resource);
      }
    }
    return <Description description={description} />;
  }
  return <>{location.name}</>;
};

const Location: React.FC<{ name: LocationName }> = ({ name }) => {
  const location = LocationModel.fromName(name as any);
  const colorClass = colorClassMap[location.type];
  return (
    <>
      <div className={[styles.location, colorClass].join(" ")}>
        <div className={styles.location_top}></div>
        <div className={styles.location_center}>
          <LocationDescription location={location} />
        </div>
        <div className={styles.location_bot}>
          <div className={styles.location_type}>{location.type}</div>
        </div>
      </div>
    </>
  );
};

export default Location;
