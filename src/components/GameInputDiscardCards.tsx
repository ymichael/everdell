import * as React from "react";
import { useRef } from "react";
import { useField } from "formik";

import styles from "../styles/gameBoard.module.css";

import { GameInputDiscardCards as TGameInputDiscardCards } from "../model/types";
import { Player } from "../model/player";

import Card from "./Card";
import { ItemWrapper } from "./common";

const GameInputDiscardCards: React.FC<{
  name: string;
  gameInput: TGameInputDiscardCards;
  viewingPlayer: Player;
}> = ({ name, gameInput, viewingPlayer }) => {
  const [field, meta, helpers] = useField(name);
  const selectedCardIdx = useRef<any>({});
  return (
    <div className={styles.items}>
      {viewingPlayer.cardsInHand.map((card, idx) => {
        const isSelected = !!selectedCardIdx.current[idx];
        return (
          <div
            className={styles.clickable}
            key={idx}
            onClick={() => {
              if (isSelected) {
                const newValue = [...meta.value];
                newValue.splice(newValue.indexOf(card), 1);
                helpers.setValue(newValue);

                selectedCardIdx.current[idx] = false;
              } else {
                helpers.setValue(meta.value.concat([card]));
                selectedCardIdx.current[idx] = true;
              }
            }}
          >
            <ItemWrapper isHighlighted={isSelected}>
              <Card name={card} />
            </ItemWrapper>
          </div>
        );
      })}
    </div>
  );
};

export default GameInputDiscardCards;
