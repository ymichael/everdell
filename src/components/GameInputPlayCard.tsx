import * as React from "react";
import { useField } from "formik";

import styles from "../styles/gameBoard.module.css";

import { CardName, ResourceType, TPlayableCard } from "../model/types";
import { Player } from "../model/player";
import { Card as CardModel } from "../model/card";

import CardPayment from "./CardPayment";
import Card from "./Card";
import { ItemWrapper } from "./common";

const GameInputPlayCard: React.FC<{
  options: TPlayableCard[];
  viewingPlayer: Player;
}> = ({ options = [], viewingPlayer }) => {
  const [_field, meta, helpers] = useField("gameInput.clientOptions");
  const resetPaymentOptions = (
    cardName: CardName,
    state: "DEFAULT" | "COST" | "ZERO",
    overrides: any = {}
  ) => {
    const card = CardModel.fromName(cardName);
    const canUseAssociatedCard =
      card.isCritter &&
      card.associatedCard.type === "CARD" &&
      viewingPlayer.hasUnoccupiedConstruction(card.associatedCard.cardName);

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
          ...((state === "DEFAULT" && !canUseAssociatedCard) || state === "COST"
            ? card.baseCost
            : {}),
        },
      },
    });
  };
  return (
    <div role="group">
      <div className={styles.items}>
        {options.map(({ card: cardName, source }, idx) => {
          const isSelected =
            meta.value &&
            meta.value.card === cardName &&
            meta.value.source === source &&
            meta.value._idx === idx;
          return (
            <div key={idx} className={styles.clickable}>
              <div
                key={idx}
                data-cy={`play-card-item:${cardName}`}
                onClick={() => {
                  resetPaymentOptions(cardName, "DEFAULT", {
                    _idx: idx,
                    source,
                  });
                }}
              >
                <ItemWrapper
                  isHighlighted={isSelected}
                  footerChildren={
                    <div className={styles.item_footer_text}>
                      {source === "MEADOW"
                        ? "(Meadow)"
                        : source === "STATION"
                        ? "(Station)"
                        : " "}
                    </div>
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
            resetPaymentOptions(meta.value.card, state);
          }}
          clientOptions={meta.value}
          viewingPlayer={viewingPlayer}
        />
      )}
    </div>
  );
};

export default GameInputPlayCard;
