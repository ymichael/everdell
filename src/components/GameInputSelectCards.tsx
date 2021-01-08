import * as React from "react";
import { useRef } from "react";
import styles from "../styles/gameBoard.module.css";
import {
  CardName,
  GameInputType,
  GameInputSelectCards as TGameInputSelectCards,
} from "../model/types";
import { Player } from "../model/player";
import Card from "./Card";
import { ItemWrapper } from "./common";
import { useField } from "formik";

const textLabel = (gameInput: TGameInputSelectCards) => {
  let numLabel = "";
  if (gameInput.minToSelect === gameInput.maxToSelect) {
    numLabel = `${gameInput.maxToSelect} `;
  } else if (gameInput.minToSelect === 0) {
    numLabel = `up to ${gameInput.maxToSelect} `;
  }
  const prefix = `Select ${numLabel}cards`;
  if (gameInput.locationContext) {
    return `${prefix} for ${gameInput.locationContext}:`;
  }
  if (gameInput.cardContext) {
    return `${prefix} for ${gameInput.cardContext}:`;
  }
  if (gameInput.prevInputType === GameInputType.PREPARE_FOR_SEASON) {
    return `${prefix} from the Meadow:`;
  }
  return prefix;
};

const GameInputSelectCards: React.FC<{
  gameInput: TGameInputSelectCards;
  viewingPlayer: Player;
}> = ({ gameInput, viewingPlayer }) => {
  const [field, meta, helpers] = useField(
    "gameInput.clientOptions.selectedCards"
  );
  const selectedCardIdx = useRef<any>({});
  return (
    <>
      <p>{textLabel(gameInput)}</p>
      <div className={styles.items}>
        {gameInput.cardOptions.map((card: CardName, idx: number) => {
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
    </>
  );
};

export default GameInputSelectCards;
