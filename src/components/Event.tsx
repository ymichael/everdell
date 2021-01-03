import * as React from "react";
import { Event as EventModel } from "../model/event";
import styles from "../styles/event.module.css";
import {
  ResourceType,
  CardCost,
  CardType,
  CardName,
  PlayedCardInfo,
  EventName,
  EventType,
} from "../model/types";
import { Player } from "../model/player";
import { Description, CardTypeSymbol } from "./common";
import { sumResources } from "../model/gameStatePlayHelpers";

const Event: React.FC<{
  name: EventName;
  claimedBy?: string | null;
}> = ({ name, claimedBy = null }) => {
  const event = EventModel.fromName(name as any);
  return (
    <>
      <div className={styles.event}>
        {event.type === EventType.BASIC ? (
          <div className={styles.event_basic}>
            <Description
              description={event.eventRequirementsDescription || []}
            />
          </div>
        ) : (
          <>
            <div className={styles.event_row}>
              <div className={styles.event_header}>
                {event.requiredCards ? (
                  <>
                    <Description
                      description={[
                        event.requiredCards[0],
                        ", ",
                        event.requiredCards[1],
                      ]}
                    />
                  </>
                ) : (
                  name
                )}
              </div>
            </div>
            {event.eventRequirementsDescription && (
              <div className={styles.event_row}>
                <Description description={event.eventRequirementsDescription} />
              </div>
            )}
            {event.eventDescription && (
              <div className={styles.event_row}>
                <Description description={event.eventDescription} />
              </div>
            )}
          </>
        )}
        {event.baseVP ? (
          <Description description={[`${event.baseVP} `, "VP"]} />
        ) : null}
      </div>
    </>
  );
};

export default Event;
