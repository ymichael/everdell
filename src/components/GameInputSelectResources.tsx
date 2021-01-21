import * as React from "react";

import { GameInputSelectResources as TGameInputSelectResources } from "../model/types";
import { Player } from "../model/player";
import { ResourcesForm } from "./CardPayment";

const GameInputSelectResources: React.FC<{
  name: string;
  gameInput: TGameInputSelectResources;
  viewingPlayer: Player;
}> = ({ name, gameInput, viewingPlayer }) => {
  return (
    <ResourcesForm
      name={name}
      excludeResource={gameInput.excludeResource}
      specificResource={gameInput.specificResource}
    />
  );
};

export default GameInputSelectResources;
