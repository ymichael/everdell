import * as React from "react";
import { useRef } from "react";
import styles from "../styles/gameBoard.module.css";
import { GameInputDiscardCards as TGameInputDiscardCards } from "../model/types";
import { Player } from "../model/player";
import Card from "./Card";
import { ItemWrapper } from "./common";
import { useField } from "formik";

const textLabel = (gameInput: TGameInputDiscardCards) => {
  let numLabel = "";
  if (gameInput.minCards === gameInput.maxCards) {
    numLabel = `${gameInput.maxCards} `;
  } else if (gameInput.minCards === 0) {
    numLabel = `up to ${gameInput.maxCards} `;
  }
  const prefix = `Discard ${numLabel}cards`;
  if (gameInput.locationContext) {
    return `${prefix} for ${gameInput.locationContext}:`;
  }
  if (gameInput.cardContext) {
    return `${prefix} for ${gameInput.cardContext}:`;
  }
  return prefix;
};

const GameInputDiscardCards: React.FC<{
  gameInput: TGameInputDiscardCards;
  viewingPlayer: Player;
}> = ({ gameInput, viewingPlayer }) => {
  const [field, meta, helpers] = useField(
    "gameInput.clientOptions.cardsToDiscard"
  );
  const selectedCardIdx = useRef<any>({});
  return (
    <>
      <p>{textLabel(gameInput)}</p>
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
    </>
  );
};

export default GameInputDiscardCards;
