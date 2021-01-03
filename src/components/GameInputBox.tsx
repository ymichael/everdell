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
import GameInputClaimEventSelector from "./GameInputClaimEventSelector";
import GameInputSelectPaymentForCard from "./GameInputSelectPaymentForCard";
import GameInputSelectWorkerPlacement from "./GameInputSelectWorkerPlacement";

const GameInputBoxText: React.FC<{
  title?: string;
  text: string;
}> = ({ title = "Game Input", text }) => {
  return (
    <GameBlock title={title}>
      <p>{text}</p>
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
  options: { card: CardName; fromMeadow: boolean }[];
  viewingPlayer: Player;
}> = ({ options = [], viewingPlayer }) => {
  const [field, meta, helpers] = useField("gameInput.clientOptions");
  return (
    <div className={styles.selector}>
      <div role="group">
        <p>Choose a card to play:</p>
        <div className={styles.play_card_list}>
          {options.map(({ card, fromMeadow }, idx) => {
            const isSelected =
              meta.value &&
              meta.value.card === card &&
              meta.value.fromMeadow === fromMeadow &&
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
                      _idx: idx,
                      card,
                      fromMeadow,
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
                  <Card name={card} />
                  {fromMeadow && (
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
          name={"gameInput.clientOptions.paymentOptions"}
          clientOptions={meta.value}
          viewingPlayer={viewingPlayer}
        />
      )}
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
  if (gameStateImpl.getRemainingPlayers().length === 0) {
    return <GameInputBoxText title={title} text={`Game Over!`} />;
  }
  if (gameState.activePlayerId !== viewingPlayer.playerId) {
    return (
      <GameInputBoxText
        title={title}
        text={`Waiting for ${activePlayerImpl.name}`}
      />
    );
  }

  gameInputs.sort((a, b) =>
    (gameInputSortOrder[a.inputType] || 10) <
    (gameInputSortOrder[b.inputType] || 10)
      ? -1
      : 1
  );

  return (
    <GameInputBoxContainer
      title={title}
      gameId={gameId}
      devDebug={devDebug}
      viewingPlayer={viewingPlayer}
      initialValues={{
        selectedInputType: gameInputs[0]?.inputType,
        gameInput: gameInputs[0],
      }}
    >
      {({ values, setFieldValue, isSubmitting }) => {
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
          } else if (
            gameInput.inputType === GameInputType.SELECT_WORKER_PLACEMENT
          ) {
            return (
              <>
                <pre>{JSON.stringify(values, null, 2)}</pre>
                <GameInputSelectWorkerPlacement
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
              {gameInputs.map((gameInput) => {
                const { inputType } = gameInput;
                return (
                  <div key={inputType}>
                    <label>
                      <Field
                        type="radio"
                        name="selectedInputType"
                        value={inputType}
                        onChange={() => {
                          setFieldValue("selectedInputType", inputType);
                          setFieldValue("gameInput", gameInput);
                        }}
                      />
                      {inputType}
                    </label>
                    {inputType === values.selectedInputType &&
                      (inputType === GameInputType.PLACE_WORKER ? (
                        <GameInputPlaceWorkerSelector
                          viewingPlayer={viewingPlayer}
                          locations={gameStateImpl.getPlayableLocations()}
                        />
                      ) : inputType === GameInputType.PLAY_CARD ? (
                        <GameInputPlayCardSelector
                          viewingPlayer={viewingPlayer}
                          options={gameStateImpl.getPlayableCards()}
                        />
                      ) : inputType === GameInputType.CLAIM_EVENT ? (
                        <GameInputClaimEventSelector
                          viewingPlayer={viewingPlayer}
                          events={gameStateImpl.getClaimableEvents()}
                        />
                      ) : (
                        <>TODO</>
                      ))}
                  </div>
                );
              })}
            </div>
            <p>
              <button disabled={isSubmitting} type="submit">
                Submit
              </button>
            </p>
          </Form>
        );
      }}
    </GameInputBoxContainer>
  );
};

export default GameInputBox;
