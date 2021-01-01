import * as React from "react";
import { GameInputDiscardCards as TGameInputDiscardCards } from "../model/types";

const GameInputDiscardCards: React.FC<{
  gameInput: TGameInputDiscardCards;
}> = ({ gameInput }) => {
  return <pre>{JSON.stringify(gameInput, null, 2)}</pre>;
};

export default GameInputDiscardCards;
