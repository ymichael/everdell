import * as React from "react";

import { GameInputSelectCardsWithSource } from "../model/types";
import Card, { EmptyCard } from "./Card";
import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";
import { ItemWrapper, CardWithSourceFooter } from "./common";

const GameInputSelectCardWithSourceSelector: React.FC<{
  name: string;
  chooseOne: boolean;
  options: GameInputSelectCardsWithSource["cardOptions"];
  valueOnSelect?: (t: any) => any;
}> = ({ name, chooseOne, options, valueOnSelect }) => {
  return (
    <GameInputSelectItemWrapper
      name={name}
      items={options}
      chooseOne={chooseOne}
      valueOnSelect={valueOnSelect}
      renderItem={(cardWithSource) => {
        return (
          <div
            data-cy={
              cardWithSource === "FROM_DECK"
                ? `select-card-with-source:from-deck`
                : `select-card-with-source:${cardWithSource.card}:${
                    cardWithSource.source
                  }:${
                    typeof cardWithSource.sourceIdx === "number"
                      ? cardWithSource.sourceIdx
                      : ""
                  }`
            }
          >
            <ItemWrapper
              footerChildren={
                <CardWithSourceFooter cardWithSource={cardWithSource} />
              }
            >
              {cardWithSource === "FROM_DECK" ? (
                <EmptyCard />
              ) : (
                <Card name={cardWithSource.card} />
              )}
            </ItemWrapper>
          </div>
        );
      }}
    />
  );
};

export default GameInputSelectCardWithSourceSelector;
