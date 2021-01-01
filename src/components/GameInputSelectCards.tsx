import * as React from "react";
import { useRef } from "react";

import {
  CardName,
  GameInputSelectCards as TGameInputSelectCards,
} from "../model/types";
import { Player } from "../model/player";

import { Form, useField } from "formik";

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
      <p>
        Select cards for {gameInput.locationContext || gameInput.cardContext}
      </p>
      <>
        <ul>
          {gameInput.cardOptions.map((card: CardName, idx: number) => {
            return (
              <li
                key={idx}
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
              >
                {card}
              </li>
            );
          })}
        </ul>
      </>
      <button type="submit">Submit</button>
    </Form>
  );
};

export default GameInputSelectCards;
