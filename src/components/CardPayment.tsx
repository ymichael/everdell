import * as React from "react";
import { Field, useField } from "formik";

import { Card as CardModel } from "../model/card";
import { toGameText } from "../model/gameText";
import { Player } from "../model/player";
import { assertUnreachable } from "../utils";
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
    <div className={styles.option_row}>
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
    </div>
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
  let associatedCardName: CardName | null = null;
  if (
    card.associatedCard.type === "CARD" &&
    viewingPlayer.hasUnoccupiedConstruction(card.associatedCard.cardName)
  ) {
    associatedCardName = card.associatedCard.cardName;
  }
  const hasUnusedEvertree = viewingPlayer.hasUnoccupiedConstruction(
    CardName.EVERTREE
  );
  const canUseAssociatedCard =
    card.isCritter && (associatedCardName || hasUnusedEvertree);
  if (!canUseAssociatedCard) {
    return <></>;
  }

  const isChecked = !!meta.value;
  return (
    <div className={styles.option_row}>
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
            associatedCardName
              ? CardModel.fromName(associatedCardName).getGameTextPart()
              : CardModel.fromName(CardName.EVERTREE).getGameTextPart(),
            { type: "text", text: " to play " },
            card.getGameTextPart(),
            { type: "text", text: " for free." },
          ]}
        />
      </label>
    </div>
  );
};

const OptionToUseGoldenLeaf: React.FC<{
  name: string;
  cardName: CardName;
  viewingPlayer: Player;
  resetPaymentOptions: (state: "DEFAULT" | "COST" | "ZERO") => void;
}> = ({ cardName, name, resetPaymentOptions, viewingPlayer }) => {
  const [_field, meta, helpers] = useField(name);
  const card = CardModel.fromName(cardName);
  if (!card.isCritter || viewingPlayer.numGoldenLeaf <= 0) {
    return <></>;
  }

  const cardOptions = viewingPlayer.getUnoccupiedConstructionUsingGoldenLeaf(
    cardName
  );
  if (cardOptions.length === 0) {
    return <></>;
  }

  return (
    <div className={styles.option_row}>
      {"Occupy "}
      <select
        value={meta.value || "None"}
        onChange={(e) => {
          resetPaymentOptions(e.target.value === "None" ? "DEFAULT" : "ZERO");
          helpers.setValue(e.target.value !== "None" ? e.target.value : null);
        }}
      >
        <option value={"None"}>None</option>
        {cardOptions.map((cardName, idx) => {
          return (
            <option key={idx} value={cardName}>
              {cardName}
            </option>
          );
        })}
      </select>
      <Description
        textParts={toGameText([" with GOLDEN_LEAF to play for free."])}
      />
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
  let cardsToUse = [
    CardName.QUEEN as const,
    CardName.INNKEEPER as const,
    CardName.CRANE as const,
    CardName.INVENTOR as const,
  ];
  cardsToUse = cardsToUse.filter((cardToUse) => {
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
      {cardsToUse.map((cardToUse, idx) => {
        const isChecked = cardToUse === meta.value;
        return (
          <div className={styles.option_row}>
            <label key={idx}>
              <Field
                type="checkbox"
                name={name}
                value={cardToUse || "NONE"}
                checked={isChecked}
                onChange={() => {
                  resetPaymentOptions(!cardToUse ? "DEFAULT" : "ZERO");
                  helpers.setValue(isChecked ? null : cardToUse);
                }}
              />
              <Description
                textParts={toGameText([
                  "Use ",
                  CardModel.fromName(cardToUse).getGameTextPart(),
                  { type: "text", text: " to " },
                  cardToUse === CardName.INNKEEPER
                    ? " to play for 3 fewer BERRY."
                    : cardToUse === CardName.INVENTOR ||
                      cardToUse === CardName.CRANE
                    ? " to play for 3 fewer ANY."
                    : cardToUse === CardName.QUEEN
                    ? " to play for free."
                    : assertUnreachable(cardToUse, "Unexpected cardToUse"),
                ])}
              />
            </label>
          </div>
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
    <div className={styles.option_row}>
      {"Dungeon "}
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
      <Description textParts={toGameText([" to play for 3 fewer ANY."])} />
    </div>
  ) : null;
};

const SelectedCardInfo = ({
  clientOptions,
}: {
  clientOptions: GameInputPlayCard["clientOptions"];
}) => {
  if (!clientOptions.card || !clientOptions.source) {
    return null;
  }
  const card = CardModel.fromName(clientOptions.card);
  return (
    <div className={[styles.option_row, styles.header].join(" ")}>
      <Description
        textParts={
          clientOptions.source === "HAND"
            ? toGameText(["Play ", card, " from your hand:"])
            : clientOptions.source === "MEADOW"
            ? toGameText(["Play ", card, " from your the Meadow:"])
            : clientOptions.source === "STATION"
            ? toGameText(["Play ", card, " from your the Station:"])
            : clientOptions.source === "RESERVED"
            ? toGameText(["Play your reserved ", card, " for 1 fewer ANY."])
            : assertUnreachable(clientOptions.source, "Unexpected source")
        }
      />
    </div>
  );
};

const CardPayment: React.FC<{
  name: string;
  resetPaymentOptions: (state: "DEFAULT" | "COST" | "ZERO") => void;
  clientOptions: GameInputPlayCard["clientOptions"];
  viewingPlayer: Player;
}> = ({ clientOptions, name, resetPaymentOptions, viewingPlayer }) => {
  return (
    <div className={styles.card_payment_form}>
      <SelectedCardInfo clientOptions={clientOptions} />
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
      {clientOptions.card && (
        <OptionToUseGoldenLeaf
          name={`${name}.occupyCardWithGoldenLeaf`}
          cardName={clientOptions.card}
          viewingPlayer={viewingPlayer}
          resetPaymentOptions={resetPaymentOptions}
        />
      )}
    </div>
  );
};

export default CardPayment;
