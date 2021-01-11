import * as React from "react";
import { useRef } from "react";

import { GameInputSelectPaymentForCard as TGameInputSelectPaymentForCard } from "../model/types";
import { Player } from "../model/player";

import { ResourcesForm } from "./CardPayment";

const GameInputSelectPaymentForCard: React.FC<{
  name: string;
  gameInput: TGameInputSelectPaymentForCard;
  viewingPlayer: Player;
}> = ({ name, gameInput, viewingPlayer }) => {
  return (
    <>
      <p>Play for {gameInput.card}:</p>
      <ResourcesForm name={name} />
    </>
  );
};

export default GameInputSelectPaymentForCard;
