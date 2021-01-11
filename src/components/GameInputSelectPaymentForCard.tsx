import * as React from "react";
import { useRef } from "react";

import {
  GameInputSelectPaymentForCard as TGameInputSelectPaymentForCard,
  LocationName,
  CardName,
} from "../model/types";
import { Player } from "../model/player";

import { ResourcesForm } from "./CardPayment";

const GameInputSelectPaymentForCard: React.FC<{
  name: string;
  gameInput: TGameInputSelectPaymentForCard;
  viewingPlayer: Player;
}> = ({ name, gameInput, viewingPlayer }) => {
  return (
    <>
      <p>
        {`Play ${gameInput.card}`}
        {gameInput.locationContext ===
        LocationName.FOREST_DRAW_TWO_MEADOW_PLAY_ONE_FOR_ONE_LESS
          ? " for 1 fewer resource"
          : gameInput.cardContext === CardName.INN
          ? " for 3 fewer resources"
          : ""}
      </p>
      <ResourcesForm name={name} />
    </>
  );
};

export default GameInputSelectPaymentForCard;
