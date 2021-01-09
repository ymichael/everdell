import * as React from "react";
import { Form, Field } from "formik";
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
import { GameBlock } from "./common";

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
import GameInputVisitDestinationCard from "./GameInputVisitDestinationCard";
import GameInputSelectOptionGeneric from "./GameInputSelectOptionGeneric";
import GameInputPlayCard from "./GameInputPlayCard";

import { assertUnreachable } from "../utils";

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
        return (
          <Form>
            <pre>{JSON.stringify(values, null, 2)}</pre>
            <div role="group">
              {gameInputs.map((gameInput, idx) => {
                return (
                  <div key={`${gameInput.inputType}-${idx}`}>
                    <label>
                      <Field
                        type="radio"
                        name="selectedInputType"
                        value={gameInput.inputType}
                        onChange={() => {
                          setFieldValue(
                            "selectedInputType",
                            gameInput.inputType
                          );
                          setFieldValue("gameInput", gameInput);
                        }}
                      />
                      {gameInput.inputType}
                    </label>

                    {gameInput.inputType === values.selectedInputType && (
                      <div className={styles.input_type_form}>
                        {gameInput.inputType === GameInputType.PLACE_WORKER ? (
                          <GameInputPlaceWorkerSelector
                            name={"gameInput.clientOptions.location"}
                            viewingPlayer={viewingPlayer}
                            locations={gameStateImpl.getPlayableLocations()}
                          />
                        ) : gameInput.inputType === GameInputType.PLAY_CARD ? (
                          <GameInputPlayCard
                            viewingPlayer={viewingPlayer}
                            options={gameStateImpl.getPlayableCards()}
                          />
                        ) : gameInput.inputType ===
                          GameInputType.CLAIM_EVENT ? (
                          <GameInputClaimEventSelector
                            name={"gameInput.clientOptions.event"}
                            viewingPlayer={viewingPlayer}
                            events={gameStateImpl.getClaimableEvents()}
                          />
                        ) : gameInput.inputType ===
                          GameInputType.PREPARE_FOR_SEASON ? (
                          <></>
                        ) : gameInput.inputType === GameInputType.GAME_END ? (
                          <></>
                        ) : gameInput.inputType ===
                          GameInputType.DISCARD_CARDS ? (
                          <GameInputDiscardCards
                            name={"gameInput.clientOptions.cardsToDiscard"}
                            gameInput={gameInput}
                            viewingPlayer={viewingPlayer}
                          />
                        ) : gameInput.inputType ===
                          GameInputType.SELECT_RESOURCES ? (
                          <GameInputSelectResources
                            name={"gameInput.clientOptions.resources"}
                            gameInput={gameInput}
                            viewingPlayer={viewingPlayer}
                          />
                        ) : gameInput.inputType ===
                          GameInputType.SELECT_PLAYER ? (
                          <GameInputSelectPlayer
                            name={"gameInput.clientOptions.selectedPlayer"}
                            gameInput={gameInput}
                            gameState={gameStateImpl}
                            viewingPlayer={viewingPlayer}
                          />
                        ) : gameInput.inputType ===
                          GameInputType.SELECT_PLAYED_CARDS ? (
                          <GameInputSelectPlayedCards
                            name={"gameInput.clientOptions.selectedCards"}
                            gameInput={gameInput}
                            gameState={gameStateImpl}
                            viewingPlayer={viewingPlayer}
                          />
                        ) : gameInput.inputType ===
                          GameInputType.SELECT_CARDS ? (
                          <GameInputSelectCards
                            name={"gameInput.clientOptions.selectedCards"}
                            gameInput={gameInput}
                            viewingPlayer={viewingPlayer}
                          />
                        ) : gameInput.inputType ===
                          GameInputType.SELECT_PAYMENT_FOR_CARD ? (
                          <GameInputSelectPaymentForCard
                            name={"gameInput.clientOptions.resources"}
                            gameInput={gameInput}
                            viewingPlayer={viewingPlayer}
                          />
                        ) : gameInput.inputType ===
                          GameInputType.SELECT_WORKER_PLACEMENT ? (
                          <GameInputSelectWorkerPlacement
                            name={"gameInput.clientOptions.selectedOption"}
                            gameInput={gameInput}
                            gameState={gameStateImpl}
                            viewingPlayer={viewingPlayer}
                          />
                        ) : gameInput.inputType ===
                          GameInputType.SELECT_OPTION_GENERIC ? (
                          <GameInputSelectOptionGeneric
                            name={"gameInput.clientOptions.selectedOption"}
                            gameInput={gameInput}
                            viewingPlayer={viewingPlayer}
                          />
                        ) : gameInput.inputType ===
                          GameInputType.VISIT_DESTINATION_CARD ? (
                          <GameInputVisitDestinationCard
                            name={"gameInput.clientOptions.playedCard"}
                            gameState={gameStateImpl}
                            destinations={gameStateImpl.getVisitableDestinationCards()}
                            viewingPlayer={viewingPlayer}
                          />
                        ) : gameInput.inputType ===
                          GameInputType.SELECT_LOCATION ? (
                          <GameInputPlaceWorkerSelector
                            name={"gameInput.clientOptions.selectedLocation"}
                            viewingPlayer={viewingPlayer}
                            locations={gameInput.locationOptions}
                          />
                        ) : (
                          <>
                            {assertUnreachable(
                              gameInput,
                              `Unexpected game input: ${JSON.stringify(
                                gameInput,
                                null,
                                2
                              )}`
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              className={styles.button}
              disabled={isSubmitting}
              type="submit"
            >
              Submit
            </button>
          </Form>
        );
      }}
    </GameInputBoxContainer>
  );
};

export default GameInputBox;
