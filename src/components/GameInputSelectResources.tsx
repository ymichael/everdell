import * as React from "react";
import { useRef } from "react";

import { GameInputSelectResources as TGameInputSelectResources } from "../model/types";
import { Player } from "../model/player";
import { ResourcesForm } from "./CardPayment";

const GameInputSelectResources: React.FC<{
  gameInput: TGameInputSelectResources;
  viewingPlayer: Player;
}> = ({ gameInput, viewingPlayer }) => {
  return (
    <>
      <p>
        Select Resources for{" "}
        {gameInput.locationContext ||
          gameInput.eventContext ||
          gameInput.cardContext}
      </p>
      <ResourcesForm name={"gameInput.clientOptions.resources"} />
    </>
  );
};

export default GameInputSelectResources;
