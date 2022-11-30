import * as React from "react";

import styles from "../styles/gameBoard.module.css";

import { GameInputSelectCardsWithSource } from "../model/types";
import Card, { EmptyCard } from "./Card";
import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";
import { ItemWrapper } from "./common";
import { assertUnreachable } from "../utils";

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
                  : cardWithSource.source === "RESERVED"
                  ? "(Reserved)"
                  : cardWithSource.source === "HAND"
                  ? " "
                  : assertUnreachable(
                      cardWithSource.source,
                      "Unexpected source"
                    )}
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
