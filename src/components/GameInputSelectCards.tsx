import * as React from "react";
import { useRef } from "react";
import { useField } from "formik";

import styles from "../styles/gameBoard.module.css";

import {
  CardName,
  GameInputSelectCards as TGameInputSelectCards,
} from "../model/types";
import { Player } from "../model/player";

import Card from "./Card";
import { ItemWrapper } from "./common";

const GameInputSelectCards: React.FC<{
  name: string;
  gameInput: TGameInputSelectCards;
  viewingPlayer: Player;
}> = ({ name, gameInput, viewingPlayer }) => {
  const [_field, meta, helpers] = useField(name);
  const selectedCardIdx = useRef<any>({});
  return (
    <div className={styles.items}>
      {gameInput.cardOptions.map((card: CardName, idx: number) => {
        const isSelected = !!selectedCardIdx.current[idx];
        return (
          <div
            className={styles.clickable}
            data-cy={`select-card-item:${card}`}
            key={idx}
            onClick={() => {
              if (isSelected) {
                const newValue = [...meta.value];
                newValue.splice(newValue.indexOf(card), 1);
                helpers.setValue(newValue);

                selectedCardIdx.current[idx] = false;
              } else {
                if (gameInput.maxToSelect === 1) {
                  helpers.setValue([card]);
                  selectedCardIdx.current = {};
                } else {
                  helpers.setValue(meta.value.concat([card]));
                }
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

export default GameInputSelectCards;
