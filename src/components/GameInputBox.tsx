import * as React from "react";
import omit from "lodash/omit";
import isEqual from "lodash/isEqual";
import { FormikProps, Formik, Form, Field, FieldArray, useField } from "formik";

import styles from "../styles/GameInputBox.module.css";
import { GameState } from "../model/gameState";
import {
  ResourceType,
  GameInputType,
  GameInput,
  CardName,
} from "../model/types";
import { Player } from "../model/player";
import { Card as CardModel } from "../model/card";
import { GameBlock } from "./common";
import { ResourceTypeIcon } from "./assets";
import Card from "./Card";

const GameInputBoxWaiting: React.FC<{ activePlayer: Player }> = ({
  activePlayer,
}) => {
  return (
    <GameBlock title={"Game Input"}>
      <p>Waiting for {activePlayer.name}</p>
    </GameBlock>
  );
};

const gameInputSortOrder: Record<GameInputType, number> = {
  [GameInputType.MULTI_STEP]: -1,
  [GameInputType.CLAIM_EVENT]: 0,
  [GameInputType.PLAY_CARD]: 1,
  [GameInputType.PLACE_WORKER]: 2,
  [GameInputType.VISIT_DESTINATION_CARD]: 3,
  [GameInputType.PREPARE_FOR_SEASON]: 4,
  [GameInputType.GAME_END]: 5,
};

const ResourceTypeValueInput: React.FC<{
  resourceType: ResourceType;
  name: string;
}> = ({ resourceType, name }) => {
  const [field, meta, helpers] = useField(name);
  return (
    <div className={styles.resource_type_value_input_wrapper}>
      <div className={styles.resource_type_value_input_icon}>
        <ResourceTypeIcon resourceType={resourceType} />
      </div>
      <input
        type="number"
        defaultValue={meta.value}
        onChange={(e) => {
          helpers.setValue(e.target.value);
        }}
        className={styles.resource_type_value_input_input}
      />
    </div>
  );
};

const CardPaymentForm: React.FC<{
  gameInput: GameInput;
  name: string;
}> = ({ gameInput, name }) => {
  if (gameInput.inputType !== GameInputType.PLAY_CARD) {
    return <></>;
  }
  const card = CardModel.fromName(gameInput.card);
  const [field, meta, helpers] = useField(name);
  return (
    <div className={styles.card_payment_form}>
      <p>Resources to spend:</p>
      <div className={styles.resource_type_value_list}>
        <ResourceTypeValueInput
          name={`${name}.resources.BERRY`}
          resourceType={ResourceType.BERRY}
        />
        <ResourceTypeValueInput
          name={`${name}.resources.TWIG`}
          resourceType={ResourceType.TWIG}
        />
        <ResourceTypeValueInput
          name={`${name}.resources.RESIN`}
          resourceType={ResourceType.RESIN}
        />
        <ResourceTypeValueInput
          name={`${name}.resources.PEBBLE`}
          resourceType={ResourceType.PEBBLE}
        />
      </div>
      {card.isCritter && card.associatedCard && (
        <>
          <p>Use Associated Construction:</p>
          <label>
            <Field type={"checkbox"} name={`${name}.useAssociatedCard`} />
            Use {card.associatedCard} to play {card.name}
          </label>
        </>
      )}
      <p>Card to use:</p>
      {[
        CardName.QUEEN,
        CardName.INNKEEPER,
        CardName.INN,
        CardName.CRANE,
        "None",
      ].map((cardToUse, idx) => (
        <label key={idx}>
          <Field
            type="radio"
            name="gameInput.paymentOptions.cardToUse"
            value={cardToUse}
          />
          {cardToUse}
        </label>
      ))}
    </div>
  );
};

const GameInputPlayCardSelector: React.FC<{
  gameInputs?: GameInput[];
}> = ({ gameInputs = [] }) => {
  const [field, meta, helpers] = useField("gameInput");
  return (
    <div className={styles.selector}>
      <div role="group">
        <p>Choose a card to play:</p>
        <div className={styles.play_card_list}>
          {gameInputs.map((gameInput, idx) => {
            if (gameInput.inputType !== GameInputType.PLAY_CARD) {
              return <></>;
            }
            const isSelected =
              meta.value &&
              meta.value.inputType === gameInput.inputType &&
              meta.value.card === gameInput.card &&
              meta.value.fromMeadow === gameInput.fromMeadow &&
              meta.value._idx === idx;
            return (
              <div key={idx} className={styles.play_card_list_item_wrapper}>
                <div
                  key={idx}
                  className={[
                    styles.play_card_list_item,
                    isSelected && styles.play_card_list_item_selected,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => {
                    helpers.setValue({
                      ...gameInput,
                      _idx: idx,
                      clientOptions: {},
                      paymentOptions: {
                        resources: {
                          [ResourceType.BERRY]: 0,
                          [ResourceType.TWIG]: 0,
                          [ResourceType.RESIN]: 0,
                          [ResourceType.PEBBLE]: 0,
                        },
                      },
                    });
                  }}
                >
                  <Card name={gameInput.card} />
                  {gameInput.fromMeadow && (
                    <div className={styles.play_card_list_item_label}>
                      (Meadow)
                    </div>
                  )}
                </div>
                {isSelected && (
                  <div className={styles.card_selected_overlay_check}>✔</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {meta.value && (
        <CardPaymentForm
          gameInput={meta.value as GameInput}
          name={"gameInput.paymentOptions"}
        />
      )}
    </div>
  );
};

const GameInputDefaultSelector: React.FC<{
  gameInputs?: GameInput[];
}> = ({ gameInputs = [] }) => {
  const [field, meta, helpers] = useField("gameInput");
  return (
    <div role="group" className={styles.selector}>
      {gameInputs.map((gameInput, idx) => {
        return (
          <div key={idx}>
            <label>
              <input
                type="radio"
                name="gameInput"
                onChange={() => {
                  helpers.setValue(gameInput);
                }}
              />
              {JSON.stringify(
                omit(gameInput, ["playerId", "inputType"]),
                null,
                2
              )}
            </label>
          </div>
        );
      })}
    </div>
  );
};

const GameInputBox: React.FC<{
  gameId: string;
  gameState: any;
  viewingPlayer: any;
}> = ({ gameId, gameState, viewingPlayer }) => {
  const gameStateImpl = GameState.fromJSON(gameState);
  const activePlayerImpl = gameStateImpl.getActivePlayer();

  if (gameState.activePlayerId !== viewingPlayer.playerId) {
    return <GameInputBoxWaiting activePlayer={activePlayerImpl} />;
  }

  const gameInputs = gameStateImpl.getPossibleGameInputs();
  const inputTypeToInputs: Partial<Record<GameInputType, GameInput[]>> = {};
  gameInputs.forEach((gameInput) => {
    inputTypeToInputs[gameInput.inputType] =
      inputTypeToInputs[gameInput.inputType] || [];
    (inputTypeToInputs[gameInput.inputType] as GameInput[]).push(gameInput);
  });
  const inputTypesOrdered: GameInputType[] = Object.keys(
    inputTypeToInputs
  ) as GameInputType[];
  inputTypesOrdered.sort((a, b) =>
    gameInputSortOrder[a] < gameInputSortOrder[b] ? -1 : 1
  );

  return (
    <GameBlock title={"Game Input"}>
      <div>
        <p>Perform an action:</p>
        <Formik
          initialValues={{
            selectedInputType: inputTypesOrdered[0],
            gameInput: null,
          }}
          onSubmit={async (values) => {
            const response = await fetch("/api/game-action", {
              method: "POST",
              cache: "no-cache",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                gameId,
                playerId: viewingPlayer.playerId,
                playerSecret: viewingPlayer.playerSecret,
                gameInput: values.gameInput,
              }),
            });
            const json = await response.json();
            if (!json.success) {
              alert(json.error);
            }
          }}
        >
          {({ values, setFieldValue }) => {
            return (
              <Form>
                <pre>{JSON.stringify(values, null, 2)}</pre>
                <div role="group">
                  {inputTypesOrdered.map((inputType) => {
                    return (
                      <div key={inputType}>
                        <label>
                          <Field
                            type="radio"
                            name="selectedInputType"
                            value={inputType}
                            onChange={() => {
                              setFieldValue("selectedInputType", inputType);
                              setFieldValue("gameInput", null);
                            }}
                          />
                          {inputType}
                        </label>
                        {inputType === values.selectedInputType &&
                          (inputType === GameInputType.PLAY_CARD ? (
                            <GameInputPlayCardSelector
                              gameInputs={inputTypeToInputs[inputType]}
                            />
                          ) : (
                            <GameInputDefaultSelector
                              gameInputs={inputTypeToInputs[inputType]}
                            />
                          ))}
                      </div>
                    );
                  })}
                </div>
                <p>
                  <button type="submit">Submit</button>
                </p>
              </Form>
            );
          }}
        </Formik>
      </div>
    </GameBlock>
  );
};

export default GameInputBox;
