import * as React from "react";
import { useRef } from "react";

import { GameInputSelectPaymentForCard as TGameInputSelectPaymentForCard } from "../model/types";
import { Player } from "../model/player";
import { ResourcesForm } from "./CardPayment";
import { Form } from "formik";

const GameInputSelectPaymentForCard: React.FC<{
  gameInput: TGameInputSelectPaymentForCard;
  viewingPlayer: Player;
}> = ({ gameInput, viewingPlayer }) => {
  return (
    <Form>
      <p>Play {gameInput.card} for 3 fewer resources</p>
      <>
        <ResourcesForm name={"gameInput.clientOptions.resources"} />
      </>
    </Form>
  );
};

export default GameInputSelectPaymentForCard;
