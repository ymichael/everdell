import * as React from "react";
import { Card as CardModel } from "../model/card";
import Image from "next/image";
import styles from "../styles/card.module.css";
import { ResourceType, CardCost, CardType, CardName } from "../model//types";

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
  var rarity = card.isUnique ? "Rare" : "Common";
  var category = card.isCritter ? "Critter" : "Construction";
  return rarity + " " + category;
};

const getCardBaseCost = (cardCost: CardCost) => {
  var totalCost = [];
  for (var resource in cardCost) {
    //    if (cost[resource as ResourceType]) {
    totalCost.push(cardCost[resource as keyof CardCost] + " " + resource);
    //}
  }
  return totalCost;
};

const Card: React.FC<{ name: CardName }> = ({ name }) => {
  //var name = "POSTAL_PIGEON";
  var card = CardModel.fromName(name as any);

  var colorClass = colorClassMap[card.cardType];

  var rarityLabel = getRarityLabel(card);

  var totalCost = getCardBaseCost(card.baseCost);

  return (
    <>
      <div className={styles.container}>
        <div
          className={[
            styles.circle,
            colorClass,
            styles.card_header_symbol,
          ].join(" ")}
        >
          {card.cardType === CardType.PRODUCTION ? (
            <Image src="/images/production.png" layout="fill" />
          ) : card.cardType === CardType.GOVERNANCE ? (
            <Image src="/images/governance.png" layout="fill" />
          ) : card.cardType === CardType.DESTINATION ? (
            <Image src="/images/destination.png" layout="fill" />
          ) : card.cardType === CardType.PROSPERITY ? (
            <Image src="/images/prosperity.png" layout="fill" />
          ) : card.cardType === CardType.TRAVELER ? (
            <Image src="/images/traveler.png" layout="fill" />
          ) : (
            <></>
          )}
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
    </>
  );
};

export default Card;
