import * as React from "react";

import { GameInputSelectCards as TGameInputSelectCards } from "../model/types";

import Card from "./Card";
import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";

const GameInputSelectCards: React.FC<{
  name: string;
  gameInput: TGameInputSelectCards;
}> = ({ name, gameInput }) => {
  return (
    <GameInputSelectItemWrapper
      name={name}
      items={gameInput.cardOptions}
      chooseOne={false}
      renderItem={(card) => (
        <div data-cy={`select-card-item:${card}`}>
          <Card name={card} />
        </div>
      )}
    />
  );
};

export default GameInputSelectCards;
