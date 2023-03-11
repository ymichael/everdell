import * as React from "react";

import { VisitorName } from "../model/types";
// import Visitor from "./Visitor";
// import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";

const GameInputVisitorSelector: React.FC<{
  name: string;
  options: VisitorName[];
}> = ({ name, options }) => {
  return (
    // <GameInputSelectItemWrapper
    //   name={name}
    //   items={options}
    //   chooseOne={false}
    //   renderItem={(visitor) => (
    //     <div data-cy={`select-visitor-item:${visitor}`}>
    //       <Visitor name={visitor} />
    //     </div>
    //   )}
    // />
    <div />
  );
};

export default GameInputVisitorSelector;
