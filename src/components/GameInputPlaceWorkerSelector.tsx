import * as React from "react";
import { useRef } from "react";

import { GameInputSelectPlayedCards as TGameInputSelectPlayedCards } from "../model/types";
import { Player } from "../model/player";
import Card from "./Card";

import { Form, useField } from "formik";
import styles from "../styles/GameInputBox.module.css";
import { GameInputType, GameInput } from "../model/types";
import Location from "./Location";

const GameInputPlaceWorkerSelector: React.FC<{
  gameInputs?: GameInput[];
  viewingPlayer: Player;
}> = ({ gameInputs = [], viewingPlayer }) => {
  const [field, meta, helpers] = useField("gameInput");
  return (
    <div className={styles.selector}>
      <div role="group">
        <p>Choose a location to place a worker:</p>
        <div className={styles.play_card_list}>
          {gameInputs.map((gameInput, idx) => {
            if (gameInput.inputType !== GameInputType.PLACE_WORKER) {
              return <></>;
            }

            const isSelected =
              meta.value &&
              meta.value.inputType === gameInput.inputType &&
              meta.value._idx === idx;

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
                    helpers.setValue({
                      ...gameInput,
                      _idx: idx,
                      clientOptions: {},
                    });
                  }}
                >
                  {gameInput.clientOptions.location && (
                    <Location name={gameInput.clientOptions.location} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameInputPlaceWorkerSelector;
