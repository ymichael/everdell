import * as React from "react";
import { Card } from "../model/card";

const Test: React.FC = () => {
  var name = "POSTAL_PIGEON";
  var card = Card.fromName(name as any);
  var cost = card.baseCost; // [ResourceType.BERRY]: 2,

  return (
    <>
      <div>Testing</div>
      {card.name}
      <div></div>
      {JSON.stringify(card.baseCost, null, 2)}
      <pre>{JSON.stringify(card, null, 2)}</pre>
    </>
  );
};

export default Test;
