import * as React from "react";
import { useRef } from "react";
import { useField } from "formik";

import styles from "../styles/gameBoard.module.css";

import { EventName } from "../model/types";
import { Player } from "../model/player";
import { GameInputType, GameInput } from "../model/types";

import { EventInner as Event } from "./Event";
import { ItemWrapper } from "./common";

const GameInputClaimEventSelector: React.FC<{
  name: string;
  events: EventName[];
  viewingPlayer: Player;
}> = ({ events = [], name, viewingPlayer }) => {
  const [field, meta, helpers] = useField(name);
  return (
    <div role="group">
      <p>Claim an Event:</p>
      <div className={styles.items}>
        {events.map((event, idx) => {
          const isSelected = meta.value === event;
          return (
            <div
              key={idx}
              className={styles.clickable}
              onClick={() => {
                if (isSelected) {
                  helpers.setValue(null);
                } else {
                  helpers.setValue(event);
                }
              }}
            >
              <ItemWrapper isHighlighted={isSelected}>
                <Event name={event} />
              </ItemWrapper>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GameInputClaimEventSelector;
