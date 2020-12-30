import * as React from "react";
import { Card as CardModel } from "../model/card";
import { CardTypeSymbol, ResourceTypeIcon } from "./assets";
import styles from "../styles/card.module.css";
import { ResourceType, CardCost, CardType, CardName } from "../model/types";

var colorClassMap = {
  GOVERNANCE: styles.color_governance,
  PROSPERITY: styles.color_prosperity,
  PRODUCTION: styles.color_production,
  DESTINATION: styles.color_destination,
  TRAVELER: styles.color_traveler,
};

// determine rarity label, which is unique vs. common and
// critter vs. construction
const getRarityLabel = (card: CardModel) => {
  var rarity = card.isUnique ? "Unique" : "Common";
  var category = card.isCritter ? "Critter" : "Construction";
  return rarity + " " + category;
};

// handle the farm and evertree
const getAssociatedCard = (card: CardModel) => {
  if (card.associatedCard) {
    return card.associatedCard;
  } else {
    if (card.name == CardName.FARM) {
      return "Husband / Wife";
    } else if (card.name == CardName.EVERTREE) {
      return "Any Critter";
    } else {
      throw new Error(
        "Associated card is null and card is not Farm or Evertree"
      );
    }
  }
};

const Card: React.FC<{ name: CardName }> = ({ name }) => {
  const card = CardModel.fromName(name as any);
  const colorClass = colorClassMap[card.cardType];
  const rarityLabel = getRarityLabel(card);
  const associatedCard = getAssociatedCard(card);
  return (
    <>
      <div className={styles.container}>
        <div className={[styles.circle, styles.card_header_symbol].join(" ")}>
          <CardTypeSymbol cardType={card.cardType} />
        </div>
        <div
          className={[
            styles.circle,
            styles.color_victory_point,
            styles.card_header_vp,
          ].join(" ")}
        >
          <span className={styles.card_header_vp_number}>{card.baseVP}</span>
        </div>
        <div className={[styles.card_header, colorClass].join(" ")}>{name}</div>
        <div className={styles.cost}>
          {Object.entries(card.baseCost).map(([resourceType, count], idx) => {
            return (
              <div className={styles.card_cost_row} key={idx}>
                <span className={styles.card_cost_icon}>
                  <ResourceTypeIcon
                    resourceType={resourceType as ResourceType}
                  />
                </span>{" "}
                <span className={styles.card_cost_value}>{count}</span>
              </div>
            );
          })}
        </div>
        <div className={styles.rarity_label}>{rarityLabel}</div>

        <div className={[styles.associated_card, colorClass].join(" ")}>
          {associatedCard}
        </div>
      </div>
    </>
  );
};

export default Card;
