import * as React from "react";
import isEqual from "lodash/isEqual";

import styles from "../styles/gameBoard.module.css";

import { CardName, ResourceType } from "../model/types";
import { Player } from "../model/player";

import CardPayment from "./CardPayment";
import Card from "./Card";
import { ItemWrapper } from "./common";
import { useField } from "formik";

const GameInputPlayCard: React.FC<{
  options: { card: CardName; fromMeadow: boolean }[];
  viewingPlayer: Player;
}> = ({ options = [], viewingPlayer }) => {
  const [field, meta, helpers] = useField("gameInput.clientOptions");
  return (
    <div>
      <div role="group">
        <p>Choose a card to play:</p>
        <div className={styles.items}>
          {options.map(({ card, fromMeadow }, idx) => {
            const isSelected =
              meta.value &&
              meta.value.card === card &&
              meta.value.fromMeadow === fromMeadow &&
              meta.value._idx === idx;
            return (
              <div key={idx} className={styles.clickable}>
                <div
                  key={idx}
                  onClick={() => {
                    helpers.setValue({
                      _idx: idx,
                      card,
                      fromMeadow,
                      paymentOptions: {
                        cardToUse: null,
                        resources: {
                          [ResourceType.BERRY]: 0,
                          [ResourceType.TWIG]: 0,
                          [ResourceType.RESIN]: 0,
                          [ResourceType.PEBBLE]: 0,
                        },
                      },
                    });
                  }}
                >
                  <ItemWrapper
                    isHighlighted={isSelected}
                    footerChildren={
                      <div className={styles.item_footer_text}>
                        {fromMeadow ? "(Meadow)" : " "}
                      </div>
                    }
                  >
                    <Card name={card} />
                  </ItemWrapper>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {meta.value && (
        <CardPayment
          name={"gameInput.clientOptions.paymentOptions"}
          clientOptions={meta.value}
          viewingPlayer={viewingPlayer}
        />
      )}
    </div>
  );
};

export default GameInputPlayCard;
