import * as React from "react";

import { AdornmentName } from "../model/types";
import { AdornmentInner as Adornment } from "./Adornment";
import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";

const GameInputPlayAdornmentSelector: React.FC<{
  name: string;
  adornments: AdornmentName[];
}> = ({ adornments, name }) => {
  return (
    <GameInputSelectItemWrapper
      name={name}
      items={adornments}
      chooseOne={true}
      renderItem={(name) => (
        <div data-cy={`play-adornment-item:${name}`}>
          <Adornment name={name} />
        </div>
      )}
    />
  );
};

export default GameInputPlayAdornmentSelector;
