import * as React from "react";
import { useField } from "formik";

import styles from "../styles/gameBoard.module.css";

import {
  CardName,
  ResourceType,
  CardWithSource,
  GameInputPlayCard as TGameInputPlayCard,
} from "../model/types";
import { Player } from "../model/player";
import { Card as CardModel } from "../model/card";

import CardPayment from "./CardPayment";
import Card from "./Card";
import { ItemWrapper, CardWithSourceFooter } from "./common";

const GameInputPlayCard: React.FC<{
  options: CardWithSource[];
  viewingPlayer: Player;
}> = ({ options = [], viewingPlayer }) => {
  const [_field, meta, helpers] = useField("gameInput.clientOptions");
  const resetPaymentOptions = (
    cardName: CardName,
    state: "DEFAULT" | "COST" | "ZERO",
    overrides: Pick<
      TGameInputPlayCard["clientOptions"],
      "source" | "sourceIdx"
    > & {
      _idx?: number;
    }
  ) => {
    const card = CardModel.fromName(cardName);
    const canUseAssociatedCard =
      card.isCritter &&
      card.associatedCard.type === "CARD" &&
      viewingPlayer.hasUnoccupiedConstruction(card.associatedCard.cardName);
    const isReserved = overrides.source === "RESERVED";
    helpers.setValue({
      ...meta.value,
      ...overrides,
      card: cardName,
      paymentOptions: {
        cardToUse: null,
        cardToDungeon: null,
        useAssociatedCard: state === "DEFAULT" ? canUseAssociatedCard : false,
        resources: {
          [ResourceType.BERRY]: 0,
          [ResourceType.TWIG]: 0,
          [ResourceType.RESIN]: 0,
          [ResourceType.PEBBLE]: 0,
          ...((state === "DEFAULT" && !canUseAssociatedCard && !isReserved) ||
          state === "COST"
            ? card.baseCost
            : {}),
        },
      },
    });
  };
  return (
    <div role="group">
      <div className={styles.items}>
        {options.map((cardWithSource, idx) => {
          const { card: cardName, source, sourceIdx } = cardWithSource;
          const isSelected =
            meta.value &&
            meta.value.card === cardName &&
            meta.value.source === source &&
            meta.value.sourceIdx === sourceIdx;
          meta.value._idx === idx;
          return (
            <div key={idx} className={styles.clickable}>
              <div
                key={idx}
                data-cy={`play-card-item:${cardName}:${source}:${
                  typeof sourceIdx === "number" ? sourceIdx : ""
                }`}
                onClick={() => {
                  resetPaymentOptions(cardName, "DEFAULT", {
                    source,
                    sourceIdx,
                    _idx: idx,
                  });
                }}
              >
                <ItemWrapper
                  isHighlighted={isSelected}
                  footerChildren={
                    <CardWithSourceFooter cardWithSource={cardWithSource} />
                  }
                >
                  <Card name={cardName} />
                </ItemWrapper>
              </div>
            </div>
          );
        })}
      </div>
      {meta.value?.card && (
        <CardPayment
          name={"gameInput.clientOptions.paymentOptions"}
          resetPaymentOptions={(state: "DEFAULT" | "COST" | "ZERO") => {
            resetPaymentOptions(meta.value.card, state, {
              source: meta.value?.source,
              sourceIdx: meta.value?.sourceIdx,
            });
          }}
          clientOptions={meta.value}
          viewingPlayer={viewingPlayer}
        />
      )}
    </div>
  );
};

export default GameInputPlayCard;
