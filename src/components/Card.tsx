import * as React from "react";
import { Card as CardModel } from "../model/card";
import styles from "../styles/card.module.css";
import { ResourceType, CardCost, CardType, CardName } from "../model//types";

const Card: React.FC<{ name: CardName }> = ({ name }) => {
  //var name = "POSTAL_PIGEON";
  var card = CardModel.fromName(name as any);
  var cardType = card.cardType;

  // Determine the color of the card
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

  // determine rarity label, which is unique vs. common and
  // critter vs. construction
  var rarity = card.isUnique ? "Rare" : "Common";
  var category = card.isCritter ? "Critter" : "Construction";
  var rarityLabel = rarity + " " + category;

  // figure out the basic cost of the card
  var cost = card.baseCost; // [ResourceType.BERRY]: 2,
  var totalCost = [];
  for (var resource in cost) {
    //    if (cost[resource as ResourceType]) {
    totalCost.push(cost[resource as keyof CardCost] + " " + resource);
    //}
  }

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
          {card.baseVP}
        </div>
        <div className={styles.card_border}>
          <div className={[styles.card_header, colorClass].join(" ")}>
            {name}
          </div>
          <div className={styles.cost}>
            <ul>
              {totalCost.map(function (totalCost, index) {
                return <li key={index}> {totalCost}</li>;
              })}
            </ul>
          </div>
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
