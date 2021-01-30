import * as React from "react";

import { EventName } from "../model/types";

import { EventInner as Event } from "./Event";
import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";

const GameInputClaimEventSelector: React.FC<{
  name: string;
  events: EventName[];
}> = ({ events = [], name }) => {
  return (
    <GameInputSelectItemWrapper
      name={name}
      items={events}
      chooseOne={true}
      renderItem={(event) => (
        <div data-cy={`claim-event-item:${event}`}>
          <Event name={event} />
        </div>
      )}
    />
  );
};

export default GameInputClaimEventSelector;
