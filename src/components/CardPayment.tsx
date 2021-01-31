import * as React from "react";
import { Field, useField } from "formik";

import { Card as CardModel } from "../model/card";
import { Player } from "../model/player";
import { ResourceType, CardName, GameInputPlayCard } from "../model/types";
import { ResourceTypeIcon, Description } from "./common";

import styles from "../styles/CardPayment.module.css";

const ResourceTypeValueInput: React.FC<{
  resourceType: ResourceType;
  name: string;
}> = ({ resourceType, name }) => {
  const [_field, meta, helpers] = useField(name);
  return (
    <div className={styles.resource_input}>
      <div className={styles.resource_icon}>
        <ResourceTypeIcon resourceType={resourceType} />
      </div>
      <input
        type="text"
        data-cy={`resource-value-input:${resourceType}`}
        value={meta.value}
        onClick={(e) => (e.target as any).select()}
        onBlur={(e) => {
          let val = 0;
          try {
            val = parseInt(e.target.value);
          } catch (e) {
            val = 0;
          }
          helpers.setValue(val || 0);
        }}
        onChange={(e) => {
          helpers.setValue(e.target.value);
        }}
        className={styles.resource_input_el}
      />
    </div>
  );
};

export const ResourcesForm: React.FC<{
  name: string;
  excludeResource?: ResourceType | null;
  specificResource?: ResourceType | null;
}> = ({ name, excludeResource = null, specificResource = null }) => {
  return (
    <>
      <div className={styles.resource_input_list}>
        {[
          ResourceType.BERRY,
          ResourceType.TWIG,
          ResourceType.RESIN,
          ResourceType.PEBBLE,
        ].map((resource) => {
          if (specificResource) {
            return specificResource === resource ? (
              <ResourceTypeValueInput
                key={resource}
                name={`${name}.${resource}`}
                resourceType={resource}
              />
            ) : null;
          } else if (excludeResource) {
            return excludeResource !== resource ? (
              <ResourceTypeValueInput
                key={resource}
                name={`${name}.${resource}`}
                resourceType={resource}
              />
            ) : null;
          } else {
            return (
              <ResourceTypeValueInput
                key={resource}
                name={`${name}.${resource}`}
                resourceType={resource}
              />
            );
          }
        })}
      </div>
    </>
  );
};

const OptionToUseAssociatedCard: React.FC<{
  name: string;
  cardName: CardName;
  viewingPlayer: Player;
  resetPaymentOptions: (state: "DEFAULT" | "COST" | "ZERO") => void;
}> = ({ cardName, name, resetPaymentOptions, viewingPlayer }) => {
  const [_field, meta, helpers] = useField(name);
  const card = CardModel.fromName(cardName);
  const hasUnusedAssociatedCard =
    card.associatedCard &&
    viewingPlayer.hasUnusedByCritterConstruction(card.associatedCard);
  const hasUnusedEvertree = viewingPlayer.hasUnusedByCritterConstruction(
    CardName.EVERTREE
  );
  const canUseAssociatedCard =
    card.isCritter && (hasUnusedAssociatedCard || hasUnusedEvertree);
  if (!canUseAssociatedCard) {
    return <></>;
  }

  const isChecked = !!meta.value;
  return (
    <div className={styles.associated_card}>
      <label>
        <input
          type={"checkbox"}
          checked={isChecked}
          onChange={() => {
            resetPaymentOptions(
              isChecked ? "COST" : hasUnusedEvertree ? "ZERO" : "DEFAULT"
            );
            helpers.setValue(!isChecked);
          }}
        />
        <Description
          textParts={[
            { type: "text", text: "Use " },
            hasUnusedAssociatedCard
              ? CardModel.fromName(card.associatedCard!).getGameTextPart()
              : CardModel.fromName(CardName.EVERTREE).getGameTextPart(),
            { type: "text", text: " to play " },
            CardModel.fromName(card.name).getGameTextPart(),
          ]}
        />
      </label>
    </div>
  );
};

const CardToUseForm: React.FC<{
  name: string;
  cardName: CardName;
  resetPaymentOptions: (state: "DEFAULT" | "COST" | "ZERO") => void;
  viewingPlayer: Player;
}> = ({ name, cardName, resetPaymentOptions, viewingPlayer }) => {
  const [_field, meta, helpers] = useField(name);
  const card = CardModel.fromName(cardName);
  const cardsToUse: CardName[] = [
    CardName.QUEEN,
    CardName.INNKEEPER,
    CardName.CRANE,
  ].filter((cardToUse) => {
    if (!viewingPlayer.hasCardInCity(cardToUse)) {
      return false;
    }
    if (cardToUse === CardName.INNKEEPER) {
      if (!card.isCritter) {
        return false;
      }
    }
    if (cardToUse === CardName.QUEEN) {
      if (card.baseVP > 3) {
        return false;
      }
      if (viewingPlayer.numAvailableWorkers < 1) {
        return false;
      }
      if (
        !viewingPlayer.canPlaceWorkerOnCard(
          viewingPlayer.getFirstPlayedCard(CardName.QUEEN)
        )
      ) {
        return false;
      }
    }
    if (cardToUse === CardName.CRANE) {
      if (!card.isConstruction) {
        return false;
      }
    }
    return true;
  });
  return cardsToUse.length !== 0 ? (
    <>
      <p>Card to use:</p>
      {[...cardsToUse, null].map((cardToUse, idx) => {
        return (
          <label key={idx}>
            <Field
              type="radio"
              name={name}
              value={cardToUse || "NONE"}
              checked={cardToUse === meta.value}
              onChange={() => {
                resetPaymentOptions(!cardToUse ? "DEFAULT" : "ZERO");
                helpers.setValue(cardToUse);
              }}
            />
            {cardToUse || "NONE"}
          </label>
        );
      })}
    </>
  ) : null;
};

const CardToDungeonForm: React.FC<{
  name: string;
  resetPaymentOptions: (state: "DEFAULT" | "COST" | "ZERO") => void;
  viewingPlayer: Player;
}> = ({ name, resetPaymentOptions, viewingPlayer }) => {
  const [_field, meta, helpers] = useField(name);
  return viewingPlayer.canInvokeDungeon() ? (
    <p>
      {"Dungeon: "}
      <select
        value={meta.value || "None"}
        onChange={(e) => {
          resetPaymentOptions(e.target.value === "None" ? "DEFAULT" : "ZERO");
          helpers.setValue(e.target.value !== "None" ? e.target.value : null);
        }}
      >
        <option value={"None"}>None</option>
        {viewingPlayer.getPlayedCritters().map(({ cardName }, idx) => {
          return (
            <option key={idx} value={cardName}>
              {cardName}
            </option>
          );
        })}
      </select>
    </p>
  ) : null;
};

const CardPayment: React.FC<{
  name: string;
  resetPaymentOptions: (state: "DEFAULT" | "COST" | "ZERO") => void;
  clientOptions: GameInputPlayCard["clientOptions"];
  viewingPlayer: Player;
}> = ({ clientOptions, name, resetPaymentOptions, viewingPlayer }) => {
  return (
    <div className={styles.card_payment_form}>
      {clientOptions.card && (
        <OptionToUseAssociatedCard
          name={`${name}.useAssociatedCard`}
          cardName={clientOptions.card}
          viewingPlayer={viewingPlayer}
          resetPaymentOptions={resetPaymentOptions}
        />
      )}
      <ResourcesForm name={`${name}.resources`} />
      {clientOptions.card && (
        <CardToUseForm
          name={`${name}.cardToUse`}
          cardName={clientOptions.card}
          viewingPlayer={viewingPlayer}
          resetPaymentOptions={resetPaymentOptions}
        />
      )}
      <CardToDungeonForm
        name={`${name}.cardToDungeon`}
        viewingPlayer={viewingPlayer}
        resetPaymentOptions={resetPaymentOptions}
      />
    </div>
  );
};

export default CardPayment;
