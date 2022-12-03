import * as React from "react";

import { TrainCarTileName } from "../model/types";
import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";
import TrainCarTile from "./TrainCarTile";
import { ItemWrapper } from "./common";

const GameInputSelectTrainCarTileSelector: React.FC<{
  name: string;
  options: TrainCarTileName[];
}> = ({ name, options }) => {
  return (
    <GameInputSelectItemWrapper
      name={name}
      items={options.map((name, idx) => ({ name, idx }))}
      chooseOne={true}
      valueOnSelect={({ idx }) => idx}
      renderItem={({ name, idx }) => {
        return (
          <div data-cy={`select-train-car-tile:${name}:${idx}`}>
            <ItemWrapper>
              <TrainCarTile name={name} label={`Station ${idx + 1}`} />
            </ItemWrapper>
          </div>
        );
      }}
    />
  );
};

export default GameInputSelectTrainCarTileSelector;
