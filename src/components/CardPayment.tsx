import * as React from "react";
import { Field, useField } from "formik";

import { Card as CardModel } from "../model/card";
import { Player } from "../model/player";
import {
  ResourceType,
  CardName,
  GameInput,
  GameInputType,
  GameInputPlayCard,
  CardPaymentOptions,
} from "../model/types";
import { ResourceTypeIcon } from "./common";

import styles from "../styles/CardPayment.module.css";

const ResourceTypeValueInput: React.FC<{
  resourceType: ResourceType;
  name: string;
}> = ({ resourceType, name }) => {
  const [field, meta, helpers] = useField(name);
  return (
    <div className={styles.resource_input}>
      <div className={styles.resource_icon}>
        <ResourceTypeIcon resourceType={resourceType} />
      </div>
      <input
        type="text"
        value={meta.value}
        onClick={(e) => (e.target as any).select()}
        onBlur={(e) => {
          let val = 0;
          try {
            val = parseInt(e.target.value);
          } catch (e) {}
          helpers.setValue(parseInt(e.target.value) || 0);
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
  const [field, meta, helpers] = useField(name);
  const card = CardModel.fromName(cardName);
  if (
    !(
      card.isCritter &&
      ((card.associatedCard &&
        viewingPlayer.hasUnusedByCritterConstruction(card.associatedCard)) ||
        viewingPlayer.hasUnusedByCritterConstruction(CardName.EVERTREE))
    )
  ) {
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
            resetPaymentOptions(isChecked ? "COST" : "DEFAULT");
            helpers.setValue(!isChecked);
          }}
        />
        Use {card.associatedCard} to play {card.name}
      </label>
    </div>
  );
};

const CardToUseForm: React.FC<{
  name: string;
  resetPaymentOptions: (state: "DEFAULT" | "COST" | "ZERO") => void;
  viewingPlayer: Player;
}> = ({ name, resetPaymentOptions, viewingPlayer }) => {
  const [field, meta, helpers] = useField(name);
  const cardsToUse: (CardName | null)[] = [
    CardName.QUEEN,
    CardName.INNKEEPER,
    CardName.INN,
    CardName.CRANE,
  ].filter((cardToUse) => !cardToUse || viewingPlayer.hasCardInCity(cardToUse));
  return cardsToUse.length !== 0 ? (
    <>
      <p>Card to use:</p>
      {cardsToUse.concat([null]).map((cardToUse, idx) => {
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
  const [field, meta, helpers] = useField(name);
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
      <CardToUseForm
        name={`${name}.cardToUse`}
        viewingPlayer={viewingPlayer}
        resetPaymentOptions={resetPaymentOptions}
      />
      <CardToDungeonForm
        name={`${name}.cardToDungeon`}
        viewingPlayer={viewingPlayer}
        resetPaymentOptions={resetPaymentOptions}
      />
    </div>
  );
};

export default CardPayment;
