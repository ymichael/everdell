import * as React from "react";
import { useRef } from "react";

import { GameInputSelectResources as TGameInputSelectResources } from "../model/types";
import { Player } from "../model/player";
import { ResourcesToSpend } from "./CardPayment";
import { Form } from "formik";

const GameInputSelectResources: React.FC<{
  gameInput: TGameInputSelectResources;
  viewingPlayer: Player;
}> = ({ gameInput, viewingPlayer }) => {
  return (
    <Form>
      <p>
        Select Resources for{" "}
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

export default GameInputSelectResources;
