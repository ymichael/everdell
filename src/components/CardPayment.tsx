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
} from "../model/types";
import { ResourceTypeIcon } from "./assets";

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
}> = ({ name }) => {
  return (
    <>
      <div className={styles.resource_input_list}>
        <ResourceTypeValueInput
          name={`${name}.BERRY`}
          resourceType={ResourceType.BERRY}
        />
        <ResourceTypeValueInput
          name={`${name}.TWIG`}
          resourceType={ResourceType.TWIG}
        />
        <ResourceTypeValueInput
          name={`${name}.RESIN`}
          resourceType={ResourceType.RESIN}
        />
        <ResourceTypeValueInput
          name={`${name}.PEBBLE`}
          resourceType={ResourceType.PEBBLE}
        />
      </div>
    </>
  );
};

const OptionToUseAssociatedCard: React.FC<{
  name: string;
  cardName: CardName;
  viewingPlayer: Player;
}> = ({ cardName, name, viewingPlayer }) => {
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
  return (
    <>
      <p>Use Associated Construction:</p>
      <label>
        <Field type={"checkbox"} name={name} />
        Use {card.associatedCard} to play {card.name}
      </label>
    </>
  );
};

const CardToUseForm: React.FC<{
  name: string;
  viewingPlayer: Player;
}> = ({ name, viewingPlayer }) => {
  const [field, meta, helpers] = useField(name);
  return (
    <>
      <p>Card to use:</p>
      {[CardName.QUEEN, CardName.INNKEEPER, CardName.INN, CardName.CRANE, null]
        .filter(
          (cardToUse) => !cardToUse || viewingPlayer.hasCardInCity(cardToUse)
        )
        .map((cardToUse, idx) => {
          return (
            <label key={idx}>
              <Field
                type="radio"
                name={name}
                value={cardToUse || "NONE"}
                checked={cardToUse === meta.value}
                onChange={() => {
                  helpers.setValue(cardToUse);
                }}
              />
              {cardToUse || "NONE"}
            </label>
          );
        })}
    </>
  );
};

const CardToDungeonForm: React.FC<{
  name: string;
  viewingPlayer: Player;
}> = ({ name, viewingPlayer }) => {
  const [field, meta, helpers] = useField(name);
  return (
    <>
      <p>TODO Card to Dungeon:</p>
    </>
  );
};

const CardPayment: React.FC<{
  name: string;
  clientOptions: GameInputPlayCard["clientOptions"];
  viewingPlayer: Player;
}> = ({ clientOptions, name, viewingPlayer }) => {
  return (
    <div className={styles.card_payment_form}>
      <ResourcesForm name={`${name}.resources`} />
      {clientOptions.card && (
        <OptionToUseAssociatedCard
          name={`${name}.useAssociatedCard`}
          cardName={clientOptions.card}
          viewingPlayer={viewingPlayer}
        />
      )}
      <CardToUseForm name={`${name}.cardToUse`} viewingPlayer={viewingPlayer} />
      <CardToDungeonForm
        name={`${name}.cardToDungeon`}
        viewingPlayer={viewingPlayer}
      />
    </div>
  );
};

export default CardPayment;
