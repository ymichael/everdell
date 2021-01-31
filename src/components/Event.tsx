import * as React from "react";

import styles from "../styles/event.module.css";

import { Event as EventModel } from "../model/event";
import { EventName, EventType } from "../model/types";

import { Description, ItemWrapper } from "./common";

export const EventInner: React.FC<{
  name: EventName;
}> = ({ name }) => {
  const event = EventModel.fromName(name as any);
  return (
    <>
      <div className={styles.event}>
        {event.type === EventType.BASIC ? (
          <div className={styles.event_basic}>
            <Description textParts={event.eventRequirementsDescription || []} />
          </div>
        ) : (
          <>
            <div className={styles.event_row}>
              <div className={styles.event_header}>
                {event.requiredCards ? (
                  <>
                    <Description
                      textParts={[
                        {
                          type: "text",
                          text: event.requiredCards[0],
                        },
                        { type: "text", text: ", " },
                        {
                          type: "text",
                          text: event.requiredCards[1],
                        },
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
                <Description textParts={event.eventRequirementsDescription} />
              </div>
            )}
            {event.eventDescription && (
              <div className={styles.event_row}>
                <Description textParts={event.eventDescription} />
              </div>
            )}
          </>
        )}
        {event.baseVP ? (
          <div className={styles.base_vp}>
            <Description
              textParts={[{ type: "points", value: event.baseVP }]}
            />
          </div>
        ) : null}
      </div>
    </>
  );
};

export const Event = ({
  name,
  claimedBy = null,
}: {
  name: EventName;
  claimedBy?: string | null;
}) => {
  return (
    <div data-cy={`event:${name}`}>
      <ItemWrapper
        isHighlighted={!!claimedBy}
        footerChildren={
          claimedBy && (
            <div className={styles.claimed_by}>
              <span className={styles.claimed_label}>{"Claimed: "}</span>
              <span className={styles.claimed_by_text}>{claimedBy}</span>
            </div>
          )
        }
      >
        <EventInner name={name} />
      </ItemWrapper>
    </div>
  );
};

export default Event;
