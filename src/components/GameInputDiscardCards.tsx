import * as React from "react";
import { useRef } from "react";

import { GameInputDiscardCards as TGameInputDiscardCards } from "../model/types";
import { Player } from "../model/player";

import { Form, useField } from "formik";

const GameInputDiscardCards: React.FC<{
  gameInput: TGameInputDiscardCards;
  viewingPlayer: Player;
}> = ({ gameInput, viewingPlayer }) => {
  const [field, meta, helpers] = useField(
    "gameInput.clientOptions.cardsToDiscard"
  );
  const selectedCardIdx = useRef<any>({});
  return (
    <Form>
      <p>
        Discard cards for {gameInput.locationContext || gameInput.cardContext}
      </p>
      <>
        {viewingPlayer.cardsInHand.map((card, idx) => {
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

export default GameInputDiscardCards;
