import * as React from "react";

import { CardName } from "../model/types";
import Card from "./Card";
import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";

const GameInputCardsSelector: React.FC<{
  name: string;
  options: CardName[];
}> = ({ name, options }) => {
  return (
    <GameInputSelectItemWrapper
      name={name}
      items={options}
      chooseOne={false}
      renderItem={(card) => (
        <div data-cy={`select-card-item:${card}`}>
          <Card name={card} />
        </div>
      )}
    />
  );
};

export default GameInputCardsSelector;
