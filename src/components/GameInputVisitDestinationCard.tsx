import * as React from "react";
import { useRef } from "react";

import { PlayedCardInfo } from "../model/types";
import { Player } from "../model/player";

import { useField } from "formik";
import styles from "../styles/GameInputBox.module.css";
import { GameInputType, GameInput } from "../model/types";

import isEqual from "lodash/isEqual";

const GameInputVisitDestinationCard: React.FC<{
  name: string;
  destinations: PlayedCardInfo[];
  viewingPlayer: Player;
}> = ({ name, destinations = [], viewingPlayer }) => {
  const [field, meta, helpers] = useField(name);
  return (
    <div className={styles.selector}>
      <div role="group">
        <p>Select a card to visit:</p>
        <div className={styles.play_card_list}>
          {destinations.map((playedCard, idx) => {
            const isSelected = isEqual(meta.value, playedCard);
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
                    helpers.setValue(playedCard);
                  }}
                >
                  <div>{JSON.stringify(playedCard)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameInputVisitDestinationCard;
