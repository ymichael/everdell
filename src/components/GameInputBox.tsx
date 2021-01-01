import * as React from "react";
import omit from "lodash/omit";
import isEqual from "lodash/isEqual";
import { FormikProps, Formik, Form, Field, FieldArray, useField } from "formik";
import CardPayment from "./CardPayment";

import styles from "../styles/GameInputBox.module.css";
import { GameState } from "../model/gameState";
import {
  ResourceType,
  GameInputType,
  GameInput,
  CardName,
} from "../model/types";
import { GameStateJSON } from "../model/jsonTypes";
import { Player } from "../model/player";
import { Card as CardModel } from "../model/card";
import { GameBlock } from "./common";
import { ResourceTypeIcon } from "./assets";
import Card from "./Card";
import Location from "./Location";

import { GameInputBoxContainer } from "./gameInputCommon";
import GameInputDiscardCards from "./GameInputDiscardCards";
import GameInputSelectResources from "./GameInputSelectResources";
import GameInputSelectPlayer from "./GameInputSelectPlayer";
import GameInputSelectPlayedCards from "./GameInputSelectPlayedCards";
import GameInputSelectCards from "./GameInputSelectCards";
import GameInputPlaceWorkerSelector from "./GameInputPlaceWorkerSelector";
import GameInputSelectPaymentForCard from "./GameInputSelectPaymentForCard";

const GameInputBoxWaiting: React.FC<{
  title?: string;
  activePlayer: Player;
}> = ({ activePlayer, title = "Game Input" }) => {
  return (
    <GameBlock title={title}>
      <p>Waiting for {activePlayer.name}</p>
    </GameBlock>
  );
};

const gameInputSortOrder: Partial<Record<GameInputType, number>> = {
  [GameInputType.CLAIM_EVENT]: 0,
  [GameInputType.PLAY_CARD]: 1,
  [GameInputType.PLACE_WORKER]: 2,
  [GameInputType.VISIT_DESTINATION_CARD]: 3,
  [GameInputType.PREPARE_FOR_SEASON]: 4,
  [GameInputType.GAME_END]: 5,
};

const GameInputPlayCardSelector: React.FC<{
  gameInputs?: GameInput[];
  viewingPlayer: Player;
}> = ({ gameInputs = [], viewingPlayer }) => {
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
                        cardToUse: null,
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
        <CardPayment
          gameInput={meta.value as GameInput}
          name={"gameInput.paymentOptions"}
          viewingPlayer={viewingPlayer}
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
    <div role="group" className={styles.default_selector}>
      {gameInputs.map((gameInput, idx) => {
        return (
          <div key={idx}>
            <label>
              <input
                type="radio"
                name="gameInput"
                checked={isEqual(meta.value, gameInput)}
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
  title?: string;
  devDebug?: boolean;
  gameState: GameStateJSON;
  gameInputs: GameInput[];
  viewingPlayer: Player;
}> = ({
  title = "Game Input",
  devDebug = false,
  gameId,
  gameState,
  gameInputs,
  viewingPlayer,
}) => {
  const gameStateImpl = GameState.fromJSON(gameState);
  const activePlayerImpl = gameStateImpl.getActivePlayer();

  if (gameState.activePlayerId !== viewingPlayer.playerId) {
    return (
      <GameInputBoxWaiting title={title} activePlayer={activePlayerImpl} />
    );
  }

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
    (gameInputSortOrder[a] || 10) < (gameInputSortOrder[b] || 10) ? -1 : 1
  );

  return (
    <GameInputBoxContainer
      title={title}
      gameId={gameId}
      devDebug={devDebug}
      viewingPlayer={viewingPlayer}
      initialValues={{
        selectedInputType: inputTypesOrdered[0],
        gameInput: gameInputs.length === 1 ? gameInputs[0] : null,
      }}
    >
      {({ values, setFieldValue }) => {
        if (gameInputs.length === 1) {
          const gameInput = gameInputs[0];
          if (gameInput.inputType === GameInputType.DISCARD_CARDS) {
            return (
              <>
                <pre>{JSON.stringify(values, null, 2)}</pre>
                <GameInputDiscardCards
                  gameInput={gameInput}
                  viewingPlayer={viewingPlayer}
                />
              </>
            );
          } else if (gameInput.inputType === GameInputType.SELECT_RESOURCES) {
            return (
              <>
                <pre>{JSON.stringify(values, null, 2)}</pre>
                <GameInputSelectResources
                  gameInput={gameInput}
                  viewingPlayer={viewingPlayer}
                />
              </>
            );
          } else if (gameInput.inputType === GameInputType.SELECT_PLAYER) {
            return (
              <>
                <pre>{JSON.stringify(values, null, 2)}</pre>
                <GameInputSelectPlayer
                  gameInput={gameInput}
                  gameState={gameStateImpl}
                  viewingPlayer={viewingPlayer}
                />
              </>
            );
          } else if (
            gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS
          ) {
            return (
              <>
                <pre>{JSON.stringify(values, null, 2)}</pre>
                <GameInputSelectPlayedCards
                  gameInput={gameInput}
                  viewingPlayer={viewingPlayer}
                />
              </>
            );
          } else if (gameInput.inputType === GameInputType.SELECT_CARDS) {
            return (
              <>
                <pre>{JSON.stringify(values, null, 2)}</pre>
                <GameInputSelectCards
                  gameInput={gameInput}
                  viewingPlayer={viewingPlayer}
                />
              </>
            );
          } else if (
            gameInput.inputType === GameInputType.SELECT_PAYMENT_FOR_CARD
          ) {
            return (
              <>
                <pre>{JSON.stringify(values, null, 2)}</pre>
                <GameInputSelectPaymentForCard
                  gameInput={gameInput}
                  viewingPlayer={viewingPlayer}
                />
              </>
            );
          }
        }
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
                      (inputType === GameInputType.PLACE_WORKER ? (
                        <GameInputPlaceWorkerSelector
                          viewingPlayer={viewingPlayer}
                          gameInputs={inputTypeToInputs[inputType]}
                        />
                      ) : inputType === GameInputType.PLAY_CARD ? (
                        <GameInputPlayCardSelector
                          viewingPlayer={viewingPlayer}
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
    </GameInputBoxContainer>
  );
};

export default GameInputBox;
