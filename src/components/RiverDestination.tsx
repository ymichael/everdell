import * as React from "react";

import styles from "../styles/RiverDestination.module.css";

import {
  RiverDestination as RiverDestinationModel,
  RiverDestinationSpot as RiverDestinationSpotModel,
} from "../model/riverDestination";
import {
  ResourceType,
  RiverDestinationName,
  RiverDestinationSpotName,
} from "../model/types";

import { Description, ItemWrapper } from "./common";
import { useTranslation } from "next-i18next";

const RiverDestinationInner = ({ name }: { name: RiverDestinationName }) => {
  const riverDestination = RiverDestinationModel.fromName(name);
  const { t } = useTranslation("common");

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        {t(riverDestination.name)}
        {riverDestination.name !== RiverDestinationName.SHOAL && (
          <div className={styles.location_type}>{t(riverDestination.type)}</div>
        )}
      </div>
      <div className={styles.description}>
        <Description textParts={riverDestination.description} />
      </div>
    </div>
  );
};

const RiverDestinationHidden = () => {
  return (
    <div data-cy={`river-destination-hidden`} className={styles.hidden_item}>
      <div></div>
      <Description
        textParts={[
          { type: "text", text: "Visit to gain 1 " },
          { type: "resource", resourceType: ResourceType.PEARL },
          { type: "text", text: " and reveal hidden " },
          { type: "em", text: "River Destination" },
          { type: "text", text: "." },
        ]}
      />
      <div></div>
    </div>
  );
};

const RiverDestination = ({ name }: { name: RiverDestinationName }) => {
  return (
    <ItemWrapper>
      <RiverDestinationInner name={name} />
    </ItemWrapper>
  );
};

export const RiverDestinationSpot = ({
  name,
  destination = null,
  ambassadors = null,
}: {
  name: RiverDestinationSpotName;
  destination?: RiverDestinationName | null;
  ambassadors?: string[] | null;
}) => {
  const isShoal = name == RiverDestinationSpotName.SHOAL;
  destination = isShoal ? RiverDestinationName.SHOAL : destination;
  const isUnavailable = !!(ambassadors && !isShoal && ambassadors.length !== 0);
  return (
    <div data-cy={`river-destination-spot:${name}`}>
      <ItemWrapper
        isHighlighted={isUnavailable}
        footerChildren={
          <div className={styles.spot_name}>
            <Description
              textParts={RiverDestinationSpotModel.fromName(name).shortName}
            />
            {ambassadors && ambassadors.length !== 0 && (
              <div className={styles.ambassadors}>
                <span>Ambassadors: </span>
                <span className={styles.ambassador}>
                  {ambassadors.join(", ")}
                </span>
              </div>
            )}
          </div>
        }
      >
        <div className={styles.spot}>
          {destination ? (
            <RiverDestinationInner name={destination} />
          ) : (
            <RiverDestinationHidden />
          )}
        </div>
      </ItemWrapper>
    </div>
  );
};

export default RiverDestination;
