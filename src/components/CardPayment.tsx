import * as React from "react";
import { Field, useField } from "formik";

import { Card as CardModel } from "../model/card";
import { Player } from "../model/player";
import {
  ResourceType,
  CardName,
  GameInput,
  GameInputType,
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
        type="number"
        value={meta.value}
        onChange={(e) => {
          helpers.setValue(e.target.value);
        }}
        className={styles.resource_input_el}
      />
    </div>
  );
};

export const ResourcesToSpend: React.FC<{
  name: string;
  viewingPlayer: Player;
}> = ({ name, viewingPlayer }) => {
  return (
    <>
      <p>Resources to spend:</p>
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
  gameInput: GameInput & { inputType: GameInputType.PLAY_CARD };
  name: string;
  viewingPlayer: Player;
}> = ({ gameInput, name, viewingPlayer }) => {
  const card = CardModel.fromName(gameInput.card);
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
  gameInput: GameInput & { inputType: GameInputType.PLAY_CARD };
  name: string;
  viewingPlayer: Player;
}> = ({ gameInput, name, viewingPlayer }) => {
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
                name="gameInput.paymentOptions.cardToUse"
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
  gameInput: GameInput & { inputType: GameInputType.PLAY_CARD };
  name: string;
  viewingPlayer: Player;
}> = ({ gameInput, name, viewingPlayer }) => {
  const [field, meta, helpers] = useField(name);
  return (
    <>
      <p>TODO Card to Dungeon:</p>
    </>
  );
};

const CardPayment: React.FC<{
  gameInput: GameInput;
  name: string;
  viewingPlayer: Player;
}> = ({ gameInput, name, viewingPlayer }) => {
  if (gameInput.inputType !== GameInputType.PLAY_CARD) {
    return <></>;
  }
  const card = CardModel.fromName(gameInput.card);

  return (
    <div className={styles.card_payment_form}>
      <ResourcesToSpend
        name={`${name}.resources`}
        viewingPlayer={viewingPlayer}
      />
      <OptionToUseAssociatedCard
        gameInput={gameInput}
        name={`${name}.useAssociatedCard`}
        viewingPlayer={viewingPlayer}
      />
      <CardToUseForm
        gameInput={gameInput}
        name={`${name}.cardToUse`}
        viewingPlayer={viewingPlayer}
      />
      <CardToDungeonForm
        gameInput={gameInput}
        name={`${name}.cardToDungeon`}
        viewingPlayer={viewingPlayer}
      />
    </div>
  );
};

export default CardPayment;
