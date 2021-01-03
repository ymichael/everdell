import * as React from "react";
import { Card as CardModel } from "../model/card";
import styles from "../styles/card.module.css";
import {
  ResourceType,
  CardCost,
  CardType,
  CardName,
  PlayedCardInfo,
} from "../model/types";
import { Player } from "../model/player";
import { Resource, Description, CardTypeSymbol } from "./common";
import { sumResources } from "../model/gameStatePlayHelpers";

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
      return "HUSBAND / WIFE";
    } else if (card.name == CardName.EVERTREE) {
      return "ANY";
    } else {
      throw new Error(
        "Associated card is null and card is not Farm or Evertree"
      );
    }
  }
};

const resourceTypeList = [
  ResourceType.BERRY,
  ResourceType.TWIG,
  ResourceType.PEBBLE,
  ResourceType.RESIN,
  "CARD" as const,
];

const CardDescription = ({ card }: { card: CardModel }) => {
  if (card.cardDescription) {
    return <Description description={card.cardDescription} />;
  }
  if (card.resourcesToGain) {
    const totalResources = sumResources(card.resourcesToGain);
    for (let i = 0; i < resourceTypeList.length; i++) {
      if (card.resourcesToGain[resourceTypeList[i]] === totalResources) {
        return (
          <Description
            description={[`Gain ${totalResources} `, resourceTypeList[i], "."]}
          />
        );
      }
    }
  }
  return <></>;
};

const Card: React.FC<{ name: CardName }> = ({ name }) => {
  const card = CardModel.fromName(name as any);
  const colorClass = colorClassMap[card.cardType];
  const rarityLabel = getRarityLabel(card);
  const associatedCard = getAssociatedCard(card);
  return (
    <>
      <div className={styles.card}>
        <div className={styles.card_header_row}>
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
          <div className={[styles.card_header, colorClass].join(" ")}>
            {name}
          </div>
        </div>
        <div className={styles.info_row}>
          <div className={styles.card_cost}>
            {Object.entries(card.baseCost).map(([resourceType, count], idx) => {
              return (
                <div className={styles.card_cost_item} key={idx}>
                  <Resource resourceType={resourceType as ResourceType} />
                  <span className={styles.card_cost_value}> {count}</span>
                </div>
              );
            })}
          </div>
          <div className={styles.card_description}>
            <CardDescription card={card} />
          </div>
        </div>
        <div className={styles.card_bottom_row}>
          <div className={styles.rarity_label}>{rarityLabel}</div>

          <div className={styles.associated_card}>
            <span className={colorClass}>{associatedCard}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default Card;

export const PlayedCard: React.FC<{
  playedCard: PlayedCardInfo;
  cardOwner: Player;
  viewerId: string;
}> = ({ playedCard, cardOwner, viewerId }) => {
  const {
    cardOwnerId,
    cardName,
    usedForCritter,
    resources = {},
    workers = [],
    pairedCards = [],
  } = playedCard;
  const card = CardModel.fromName(cardName);
  return (
    <div className={styles.played_card_wrapper}>
      <div className={styles.played_card_card}>
        <Card name={cardName} />
      </div>
      <div className={styles.played_card_meta}>
        <p>Card Owner: {viewerId === cardOwnerId ? "You" : cardOwner.name}</p>
        {card.isConstruction && (
          <p>usedForCritter: {JSON.stringify(usedForCritter)}</p>
        )}
        {"workers" in playedCard && <p>Workers: {JSON.stringify(workers)}</p>}
        {"resources" in playedCard && (
          <p>Resources: {JSON.stringify(resources)}</p>
        )}
      </div>
    </div>
  );
};
