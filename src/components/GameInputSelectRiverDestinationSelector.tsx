import * as React from "react";

import { RiverDestinationName } from "../model/types";

import RiverDestination from "./RiverDestination";
import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";

const GameInputSelectRiverDestinationSelector: React.FC<{
  name: string;
  options: RiverDestinationName[];
}> = ({ options, name }) => {
  return (
    <GameInputSelectItemWrapper
      name={name}
      items={options}
      chooseOne={true}
      renderItem={(name) => {
        return (
          <div data-cy={`river-destination-item:${name}`}>
            <RiverDestination name={name} />
          </div>
        );
      }}
    />
  );
};

export default GameInputSelectRiverDestinationSelector;
