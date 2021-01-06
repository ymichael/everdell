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
    <div className={styles.associated_card}>
      <label>
        <Field type={"checkbox"} name={name} />
        Use {card.associatedCard} to play {card.name}
      </label>
    </div>
  );
};

const CardToUseForm: React.FC<{
  name: string;
  viewingPlayer: Player;
}> = ({ name, viewingPlayer }) => {
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
  viewingPlayer: Player;
}> = ({ name, viewingPlayer }) => {
  const [field, meta, helpers] = useField(name);
  return viewingPlayer.canInvokeDungeon() ? (
    <p>
      {"Dungeon: "}
      <select
        onChange={(e) => {
          helpers.setValue(e.target.value || null);
        }}
      >
        <option value={""}>None</option>
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
  clientOptions: GameInputPlayCard["clientOptions"];
  viewingPlayer: Player;
}> = ({ clientOptions, name, viewingPlayer }) => {
  return (
    <div className={styles.card_payment_form}>
      {clientOptions.card && (
        <OptionToUseAssociatedCard
          name={`${name}.useAssociatedCard`}
          cardName={clientOptions.card}
          viewingPlayer={viewingPlayer}
        />
      )}
      <ResourcesForm name={`${name}.resources`} />
      <CardToUseForm name={`${name}.cardToUse`} viewingPlayer={viewingPlayer} />
      <CardToDungeonForm
        name={`${name}.cardToDungeon`}
        viewingPlayer={viewingPlayer}
      />
    </div>
  );
};

export default CardPayment;
