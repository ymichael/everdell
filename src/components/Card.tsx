import * as React from "react";
import { Card as CardModel } from "../model/card";
import styles from "../styles/card.module.css";
import { ResourceType, CardName, PlayedCardInfo, ExpansionType } from "../model/types";
import { Player } from "../model/player";
import { resourceMapToGameText, toGameText } from "../model/gameText";
import {
  GameIcon,
  AmbassadorSpotIcon,
  WorkerSpotIcon,
  Description,
  CardTypeSymbol,
} from "./common";
import { sumResources } from "../model/gameStatePlayHelpers";

const colorClassMap = {
  GOVERNANCE: styles.color_governance,
  PROSPERITY: styles.color_prosperity,
  PRODUCTION: styles.color_production,
  DESTINATION: styles.color_destination,
  TRAVELER: styles.color_traveler,
};

function romanize(num: number): string {
  if (isNaN(num)) return "";
  const digits = String(+num).split(""),
    key = [
      "",
      "C",
      "CC",
      "CCC",
      "CD",
      "D",
      "DC",
      "DCC",
      "DCCC",
      "CM",
      "",
      "X",
      "XX",
      "XXX",
      "XL",
      "L",
      "LX",
      "LXX",
      "LXXX",
      "XC",
      "",
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
    ];
  let roman = "",
    i = 3;
  while (i--) roman = (key[+(digits.pop() as any) + i * 10] || "") + roman;
  return Array(+digits.join("") + 1).join("M") + roman;
}

// determine rarity label, which is unique vs. common and
// critter vs. construction
const getRarityLabel = (card: CardModel) => {
  const rarity = card.expansion === ExpansionType.LEGENDS ? "Legendary" : card.isUnique ? "Unique" : "Common";
  const category = card.isCritter ? "Critter" : "Construction";
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
      return "Any";
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
    return <Description textParts={card.cardDescription} />;
  }
  if (card.resourcesToGain) {
    const totalResources = sumResources(card.resourcesToGain);
    for (let i = 0; i < resourceTypeList.length; i++) {
      if (card.resourcesToGain[resourceTypeList[i]] === totalResources) {
        const resourceType = resourceTypeList[i];
        return (
          <Description
            textParts={[
              {
                type: "text",
                text: `Gain ${totalResources} `,
              },
              resourceType === "CARD"
                ? { type: "symbol", symbol: "CARD" }
                : { type: "resource", resourceType: resourceType },
              {
                type: "text",
                text: ".",
              },
            ]}
          />
        );
      }
    }
  }
  return <></>;
};

const AssociatedCard = ({
  card,
  usedForCritter = false,
}: {
  card: CardModel;
  usedForCritter?: boolean;
}) => {
  const colorClass = colorClassMap[card.cardType];
  const associatedCard = getAssociatedCard(card);
  return (
    <div
      className={[
        styles.associated_card,
        usedForCritter && styles.associated_card_used,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={
          card.isCritter ? styles.color_associated_card_critter : colorClass
        }
      >
        {associatedCard}
      </span>
    </div>
  );
};

const Card: React.FC<{ name: CardName; usedForCritter?: boolean }> = ({
  name,
  usedForCritter = false,
}) => {
  const card = CardModel.fromName(name as any);
  const colorClass = colorClassMap[card.cardType];
  const rarityLabel = getRarityLabel(card);
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
            <span>{name}</span>
            {card.expansion && (
              <span className={styles.expansion}>{card.expansion}</span>
            )}
          </div>
        </div>
        <div className={styles.info_row}>
          <div className={styles.card_cost}>
            {Object.entries(card.baseCost).map(([resourceType, count], idx) => {
              return (
                <div className={styles.card_cost_item} key={idx}>
                  <GameIcon type={resourceType as ResourceType} />
                  <span className={styles.card_cost_value}> {count}</span>
                </div>
              );
            })}
          </div>
          {card.name === CardName.FERRY && (
            <div className={styles.worker_spot_row}>
              <div className={styles.worker_spot}>
                <AmbassadorSpotIcon />
              </div>
            </div>
          )}
          {card.maxWorkerSpots !== 0 && (
            <div className={styles.worker_spot_row}>
              <div className={styles.worker_spot}>
                <WorkerSpotIcon />
              </div>
              {card.maxWorkerSpots == 2 && (
                <div className={styles.worker_spot}>
                  <WorkerSpotIcon locked={true} />
                </div>
              )}
            </div>
          )}
          <div className={styles.card_description}>
            <CardDescription card={card} />
          </div>
        </div>
        <div className={styles.card_bottom_row}>
          <div className={styles.rarity_label}>
            {rarityLabel}
            &nbsp;&middot;&nbsp;{romanize(card.numInDeck)}
          </div>
          <AssociatedCard card={card} usedForCritter={usedForCritter} />
        </div>
      </div>
    </>
  );
};

export default Card;

export const PlayedCard: React.FC<{
  playedCard: PlayedCardInfo;
  cardOwner: Player;
  viewerId: string | null;
}> = ({ playedCard, cardOwner, viewerId }) => {
  const {
    cardOwnerId,
    cardName,
    usedForCritter,
    resources = {},
    workers = [],
    pairedCards = [],
    ambassador = null,
    shareSpaceWith = null,
  } = playedCard;
  const card = CardModel.fromName(cardName);
  return (
    <div className={styles.played_card_wrapper}>
      <div className={styles.played_card_card}>
        <Card
          name={cardName}
          usedForCritter={card.isConstruction && usedForCritter}
        />
      </div>
      <div className={styles.played_card_meta}>
        <div>
          Card Owner: {viewerId === cardOwnerId ? "You" : cardOwner.name}
        </div>
        {"workers" in playedCard && (
          <div>Workers on card: {workers.length}</div>
        )}
        {"ambassador" in playedCard && (
          <div>Ambassadors on card: {ambassador ? "1" : "0"}</div>
        )}
        {"shareSpaceWith" in playedCard && shareSpaceWith && (
          <div>Share space: {shareSpaceWith}</div>
        )}
        {"pairedCards" in playedCard && (
          <div>
            Beneath Card:{" "}
            <Description textParts={toGameText(`${pairedCards.length} CARD`)} />
          </div>
        )}
        {"resources" in playedCard && (
          <div>
            On Card:{" "}
            <Description textParts={resourceMapToGameText(resources)} />
          </div>
        )}
      </div>
    </div>
  );
};
