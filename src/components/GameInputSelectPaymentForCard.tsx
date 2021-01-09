import * as React from "react";
import { useRef } from "react";
import { Form } from "formik";

import { GameInputSelectPaymentForCard as TGameInputSelectPaymentForCard } from "../model/types";
import { Player } from "../model/player";

import { ResourcesForm } from "./CardPayment";

const GameInputSelectPaymentForCard: React.FC<{
  name: string;
  gameInput: TGameInputSelectPaymentForCard;
  viewingPlayer: Player;
}> = ({ name, gameInput, viewingPlayer }) => {
  return (
    <Form>
      <p>Play {gameInput.card} for 3 fewer resources</p>
      <ResourcesForm name={name} />
    </Form>
  );
};

export default GameInputSelectPaymentForCard;
