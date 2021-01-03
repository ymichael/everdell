import * as React from "react";
import { useRef } from "react";

import { GameInputSelectPlayedCards as TGameInputSelectPlayedCards } from "../model/types";
import { Player } from "../model/player";
import Card from "./Card";

import { useField } from "formik";

const GameInputSelectPlayedCards: React.FC<{
  name: string;
  gameInput: TGameInputSelectPlayedCards;
  viewingPlayer: Player;
}> = ({ name, gameInput, viewingPlayer }) => {
  const [field, meta, helpers] = useField(name);
  const selectedCardIdx = useRef<any>({});
  return (
    <>
      <p>Select {gameInput.maxToSelect} cards</p>
      <>
        <ul>
          {gameInput.cardOptions.map((cardInfo, idx) => {
            return (
              <li
                key={idx}
                onClick={() => {
                  const isSelected = !!selectedCardIdx.current[idx];
                  if (isSelected) {
                    const newValue = [...meta.value];
                    newValue.splice(newValue.indexOf(cardInfo), 1);
                    helpers.setValue(newValue);

                    selectedCardIdx.current[idx] = false;
                  } else {
                    helpers.setValue(meta.value.concat([cardInfo]));
                    selectedCardIdx.current[idx] = true;
                  }
                }}
              >
                <Card name={cardInfo.cardName} />
              </li>
            );
          })}
        </ul>
      </>
    </>
  );
};

export default GameInputSelectPlayedCards;
