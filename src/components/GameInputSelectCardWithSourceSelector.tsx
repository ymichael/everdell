import * as React from "react";

import styles from "../styles/gameBoard.module.css";

import { GameInputSelectCardsWithSource } from "../model/types";
import Card, { EmptyCard } from "./Card";
import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";
import { ItemWrapper } from "./common";

const GameInputSelectCardWithSourceSelector: React.FC<{
  name: string;
  chooseOne: boolean;
  options: GameInputSelectCardsWithSource["cardOptions"];
}> = ({ name, chooseOne, options }) => {
  return (
    <GameInputSelectItemWrapper
      name={name}
      items={options}
      chooseOne={chooseOne}
      valueOnSelect={(item) => [item]}
      renderItem={(cardWithSource) => {
        return (
          <ItemWrapper
            footerChildren={
              <div
                className={styles.item_footer_text}
                data-cy={
                  cardWithSource === "FROM_DECK"
                    ? `select-card-with-source:from-deck`
                    : `select-card-with-source:${cardWithSource.card}:${
                        cardWithSource.source
                      }:${cardWithSource.sourceIdx!}`
                }
              >
                {cardWithSource === "FROM_DECK"
                  ? "From Deck"
                  : cardWithSource.source === "MEADOW"
                  ? "(Meadow)"
                  : cardWithSource.source === "STATION"
                  ? `(Station ${cardWithSource.sourceIdx! + 1})`
                  : " "}
              </div>
            }
          >
            {cardWithSource === "FROM_DECK" ? (
              <EmptyCard />
            ) : (
              <Card name={cardWithSource.card} />
            )}
          </ItemWrapper>
        );
      }}
    />
  );
};

export default GameInputSelectCardWithSourceSelector;
