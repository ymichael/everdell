import * as React from "react";
import { useRef } from "react";

import { GameInputSelectPlayer as TGameInputSelectPlayer } from "../model/types";
import { Player } from "../model/player";
import { ResourcesToSpend } from "./CardPayment";
import { Form } from "formik";

const GameInputSelectPlayer: React.FC<{
  gameInput: TGameInputSelectPlayer;
  viewingPlayer: Player;
}> = ({ gameInput, viewingPlayer }) => {
  return (
    <Form>
      <p>
        Select Player for{" "}
        {gameInput.locationContext ||
          gameInput.eventContext ||
          gameInput.cardContext}
      </p>
      <>
        <ResourcesToSpend name={"gameInput.clientOptions.resources"} />
      </>
      <button type="submit">Submit</button>
    </Form>
  );
};

export default GameInputSelectPlayer;
