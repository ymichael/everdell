import * as React from "react";
import { useRef } from "react";

import {
  CardName,
  GameInputType,
  GameInputSelectCards as TGameInputSelectCards,
} from "../model/types";
import { Player } from "../model/player";

import { Form, useField } from "formik";

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
    <Form>
      <p>{textLabel(gameInput)}</p>
      <>
        {gameInput.cardOptions.map((card: CardName, idx: number) => {
          return (
            <p key={idx}>
              <label>
                <input
                  type={"checkbox"}
                  onClick={() => {
                    const isSelected = !!selectedCardIdx.current[idx];
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
                />
                {card}
              </label>
            </p>
          );
        })}
      </>
      <button type="submit">Submit</button>
    </Form>
  );
};

export default GameInputSelectCards;
