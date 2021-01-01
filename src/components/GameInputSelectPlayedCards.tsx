// GameInputSelectPlayedCards
import * as React from "react";
import { useRef } from "react";

import { GameInputSelectPlayedCards as TGameInputSelectPlayedCards } from "../model/types";
import { Player } from "../model/player";
import Card from "./Card";

import { Form, useField } from "formik";

const GameInputSelectPlayedCards: React.FC<{
  gameInput: TGameInputSelectPlayedCards;
  viewingPlayer: Player;
}> = ({ gameInput, viewingPlayer }) => {
  const [field, meta, helpers] = useField(
    "gameInput.clientOptions.selectedCards"
  );
  const selectedCardIdx = useRef<any>({});
  return (
    <Form>
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
      <button type="submit">Submit</button>
    </Form>
  );
};

export default GameInputSelectPlayedCards;

// {viewingPlayer.getAllPlayedCards().map((card, idx) => {
//             return (
//               <li
//                 key={idx}
//                 onClick={() => {
//                   const isSelected = !!selectedCardIdx.current[idx];
//                   if (isSelected) {
//                     const newValue = [...meta.value];
//                     newValue.splice(newValue.indexOf(card), 1);
//                     helpers.setValue(newValue);
//
//                     selectedCardIdx.current[idx] = false;
//                   } else {
//                     helpers.setValue(meta.value.concat([card]));
//                     selectedCardIdx.current[idx] = true;
//                   }
//                 }}
//               >
//                 {card}
//               </li>
//             );
//           })}
