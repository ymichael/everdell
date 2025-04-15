import * as React from "react";
import styles from "../styles/location.module.css";

import { Player } from "../model/player";
import { GameState } from "../model/gameState";
import { Location as LocationModel } from "../model/location";
import {
  Season,
  LocationName,
  LocationType,
  LocationOccupancy,
} from "../model/types";
import { Description, ItemWrapper } from "./common";
import { useTranslation } from "next-i18next";

const colorClassMap = {
  BASIC: styles.color_basic,
  FOREST: styles.color_forest,
  HAVEN: styles.color_haven,
  JOURNEY: styles.color_journey,
  KNOLL: styles.color_knoll,
  STATION: styles.color_station,
};

export const LocationInner: React.FC<{ name: LocationName }> = ({ name }) => {
  const location = LocationModel.fromName(name as any);
  const colorClass = colorClassMap[location.type];
  const { t } = useTranslation("common");
  return (
    <>
      <div className={[styles.location, colorClass].join(" ")}>
        <div className={styles.location_top}></div>
        <div className={styles.location_center}>
          <Description textParts={location.description || location.shortName} />
        </div>
        <div className={styles.location_bot}>
          <div className={styles.location_bot_spacer}> </div>
          <div className={styles.location_type}>{t(location.type)}</div>
          <div className={styles.location_occupancy}>
            {location.occupancy === LocationOccupancy.UNLIMITED
              ? "1+"
              : location.occupancy === LocationOccupancy.UNLIMITED_MAX_ONE
              ? t("1 / PLAYER")
              : ""}
          </div>
        </div>
      </div>
    </>
  );
};

const Location: React.FC<{
  name: LocationName;
  playerWorkers?: string[];
  viewingPlayer?: Player | null;
  gameState?: GameState | null;
}> = ({ name, playerWorkers = [], viewingPlayer = null, gameState = null }) => {
  const location = LocationModel.fromName(name);
  const { t } = useTranslation("common");
  let acceptingWorkers = true;

  if (location.occupancy === LocationOccupancy.EXCLUSIVE) {
    acceptingWorkers = playerWorkers.length === 0;
  }
  if (viewingPlayer) {
    if (location.type === LocationType.JOURNEY) {
      if (viewingPlayer.currentSeason === Season.AUTUMN) {
        acceptingWorkers =
          location.occupancy === LocationOccupancy.EXCLUSIVE
            ? playerWorkers.length === 0
            : true;
      } else {
        acceptingWorkers = false;
      }
    }
  }
  if (gameState) {
    if (location.occupancy === LocationOccupancy.EXCLUSIVE_FOUR) {
      acceptingWorkers =
        playerWorkers.length < (gameState.players.length < 4 ? 1 : 2);
    }
  }
  return (
    <ItemWrapper
      isHighlighted={!acceptingWorkers}
      footerChildren={
        playerWorkers.length !== 0 && (
          <div className={styles.location_workers}>
            <span>{t("Workers: ")}</span>
            <span className={styles.location_worker}>
              {playerWorkers.join(", ")}
            </span>
          </div>
        )
      }
    >
      <LocationInner name={name} />
    </ItemWrapper>
  );
};

export default Location;
