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
} from "../model/types";
import { Player } from "../model/player";
import { Description, CardTypeSymbol } from "./common";
import { sumResources } from "../model/gameStatePlayHelpers";

const makeEventName = (eventName: string) => {
  if (eventName.startsWith("SPECIAL")) {
    return eventName.substring(8, eventName.length);
  } else {
    return eventName.substring(6, eventName.length);
  }
};

const EventRequirements = ({ event }: { event: EventModel }) => {
  if (event.requiredCards) {
    return (
      <>
        {event.requiredCards[0]}, {event.requiredCards[1]}
      </>
    );
  }
  return <>event requirements</>;
};

const EventDescription = ({ event }: { event: EventModel }) => {
  if (event.eventDescription) {
    return <Description description={event.eventDescription} />;
  }
  return <>event description</>;
};

const Event: React.FC<{ name: EventName }> = ({ name }) => {
  const event = EventModel.fromName(name as any);
  const justEventName = makeEventName(name);
  return (
    <>
      <div className={styles.event}>
        <div className={styles.event_header}>{justEventName}</div>
        <div className={styles.event_requirements}>
          <EventRequirements event={event}></EventRequirements>
        </div>

        {/* <div className={styles.info_row}> */}
        {/*   <EventDescription event={event} /> */}
        {/* </div> */}
      </div>
    </>
  );
};

export default Event;
