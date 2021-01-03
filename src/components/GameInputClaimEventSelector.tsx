import * as React from "react";
import { useRef } from "react";

import { EventName } from "../model/types";
import { Player } from "../model/player";
import Card from "./Card";

import { Form, useField } from "formik";
import styles from "../styles/GameInputBox.module.css";
import { GameInputType, GameInput } from "../model/types";
import Event from "./Event";

const GameInputClaimEventSelector: React.FC<{
  events: EventName[];
  viewingPlayer: Player;
}> = ({ events = [], viewingPlayer }) => {
  const [field, meta, helpers] = useField("gameInput.clientOptions.event");
  return (
    <div className={styles.selector}>
      <div role="group">
        <p>Claim an Event:</p>
        <div className={styles.play_card_list}>
          {events.map((event, idx) => {
            const isSelected = meta.value === event;
            return (
              <div key={idx} className={styles.play_card_list_item_wrapper}>
                <div
                  key={idx}
                  className={[
                    styles.play_card_list_item,
                    isSelected && styles.play_card_list_item_selected,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    helpers.setValue(event);
                  }}
                >
                  <Event name={event} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameInputClaimEventSelector;
