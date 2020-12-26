import * as React from "react";
import { Card as CardModel } from "../model/card";
import styles from "../styles/card.module.css";
import { ResourceType, CardCost, CardType, CardName } from "../model//types";

const Card: React.FC<{ name: CardName }> = ({ name }) => {
  //var name = "POSTAL_PIGEON";
  var card = CardModel.fromName(name as any);
  var cardType = card.cardType;
  // var cost = card.baseCost; // [ResourceType.BERRY]: 2,
  var colorClass = styles.color_destination;
  if (cardType == CardType.GOVERNANCE) {
    colorClass = styles.color_governance;
  } else if (cardType == CardType.PROSPERITY) {
    colorClass = styles.color_prosperity;
  } else if (cardType == CardType.PRODUCTION) {
    colorClass = styles.color_production;
  } else if (cardType == CardType.TRAVELER) {
    colorClass = styles.color_traveler;
  } else if (cardType == CardType.DESTINATION) {
    colorClass = styles.color_destination;
  }
  var rarity = card.isUnique ? "Rare" : "Common";
  var category = card.isCritter ? "Critter" : "Construction";
  var rarityLabel = rarity + " " + category;

  return (
    <>
      <div className={styles.container}>
        <div
          className={[
            styles.circle,
            colorClass,
            styles.card_header_symbol,
          ].join(" ")}
        ></div>
        <div
          className={[
            styles.circle,
            styles.color_victory_point,
            styles.card_header_vp,
          ].join(" ")}
        >
          2
        </div>
        <div className={styles.card_border}>
          <div className={[styles.card_header, colorClass].join(" ")}>
            {name}
          </div>
          <div className={styles.cost}></div>
          <div className={styles.rarity_label}>{rarityLabel}</div>

          <div className={[styles.associated_card, colorClass].join(" ")}>
            {card.associatedCard}
          </div>
        </div>
      </div>
    </>
  );
};

export default Card;

//<pre>{JSON.stringify(card, null, 2)}</pre>

/*
this.name = name;
    this.baseCost = baseCost;
    this.baseVP = baseVP;
    this.cardType = cardType;
    this.isUnique = isUnique;
    this.isCritter = !isConstruction;
    this.isConstruction = isConstruction;
    this.associatedCard = associatedCard;

*/
