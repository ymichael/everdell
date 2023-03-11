import * as React from "react";
import { Form } from "formik";
import isEqual from "lodash/isEqual";
import omit from "lodash/omit";

import styles from "../styles/GameInputBox.module.css";
import { GameState } from "../model/gameState";
import { GameInputType, GameInput } from "../model/types";
import { Player } from "../model/player";

import { GameBlock } from "./common";

import { GameInputBoxContainer, renderGameInputLabel } from "./gameInputCommon";
import GameInputSelectPlayer from "./GameInputSelectPlayer";
import GameInputSelectResources from "./GameInputSelectResources";
import GameInputPlayedCardsSelector from "./GameInputPlayedCardsSelector";
import GameInputCardsSelector from "./GameInputCardsSelector";
import GameInputPlaceWorkerSelector from "./GameInputPlaceWorkerSelector";
import GameInputClaimEventSelector from "./GameInputClaimEventSelector";
import GameInputSelectRiverDestinationSelector from "./GameInputSelectRiverDestinationSelector";
import GameInputPlaceAmbassadorSelector from "./GameInputPlaceAmbassadorSelector";
import GameInputPlayAdornmentSelector from "./GameInputPlayAdornmentSelector";
import GameInputSelectPaymentForCard from "./GameInputSelectPaymentForCard";
import GameInputSelectWorkerPlacement from "./GameInputSelectWorkerPlacement";
import GameInputSelectOptionGeneric from "./GameInputSelectOptionGeneric";
import GameInputSelectCardWithSourceSelector from "./GameInputSelectCardWithSourceSelector";
import GameInputSelectTrainCarTileSelector from "./GameInputSelectTrainCarTileSelector";
// import GameInputVisitorSelector from "./GameInputVisitorSelector";
import GameInputPlayCard from "./GameInputPlayCard";

import { assertUnreachable } from "../utils";

const GameInputBoxText: React.FC<{
  title?: string;
  text: string;
}> = ({ title = "Game Input", text }) => {
  return (
    <GameBlock title={title}>
      <p id={"js-game-input-box-text"}>{text}</p>
    </GameBlock>
  );
};

const defaultOrder = 10;
const gameInputSortOrder: Partial<Record<GameInputType, number>> = {
  [GameInputType.CLAIM_EVENT]: 1,
  [GameInputType.PLAY_CARD]: 2,
  [GameInputType.PLAY_ADORNMENT]: 2.5,
  [GameInputType.PLACE_WORKER]: 3,
  [GameInputType.PLACE_AMBASSADOR]: 3.5,
  [GameInputType.VISIT_DESTINATION_CARD]: 4,
  [GameInputType.PREPARE_FOR_SEASON]: defaultOrder + 1,
  [GameInputType.GAME_END]: defaultOrder + 2,
  [GameInputType.UNDO]: defaultOrder + 3,
};

const GameInputBoxInner = ({
  gameInput,
  gameState,
  viewingPlayer,
}: {
  gameInput: GameInput;
  gameState: GameState;
  viewingPlayer: Player;
}) => {
  return (
    <div>
      {gameInput.inputType === GameInputType.PLACE_WORKER ? (
        <GameInputPlaceWorkerSelector
          name={"gameInput.clientOptions.location"}
          viewingPlayer={viewingPlayer}
          locations={gameState.getPlayableLocations()}
        />
      ) : gameInput.inputType === GameInputType.PLAY_CARD ? (
        <GameInputPlayCard
          viewingPlayer={viewingPlayer}
          options={gameState.getPlayableCards()}
        />
      ) : gameInput.inputType === GameInputType.CLAIM_EVENT ? (
        <GameInputClaimEventSelector
          name={"gameInput.clientOptions.event"}
          events={gameState.getClaimableEvents()}
        />
      ) : gameInput.inputType === GameInputType.PREPARE_FOR_SEASON ? (
        <></>
      ) : gameInput.inputType === GameInputType.GAME_END ? (
        <></>
      ) : gameInput.inputType === GameInputType.UNDO ? (
        <></>
      ) : gameInput.inputType === GameInputType.DISCARD_CARDS ? (
        <GameInputCardsSelector
          name={"gameInput.clientOptions.cardsToDiscard"}
          options={viewingPlayer.getCardsInHand()}
        />
      ) : gameInput.inputType === GameInputType.SELECT_RESOURCES ? (
        <GameInputSelectResources
          name={"gameInput.clientOptions.resources"}
          gameInput={gameInput}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_PLAYER ? (
        <GameInputSelectPlayer
          name={"gameInput.clientOptions.selectedPlayer"}
          gameInput={gameInput}
          gameState={gameState}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_PLAYED_CARDS ? (
        <GameInputPlayedCardsSelector
          name={"gameInput.clientOptions.selectedCards"}
          gameState={gameState}
          viewingPlayer={viewingPlayer}
          chooseOne={false}
          options={gameInput.cardOptions}
        />
      ) : gameInput.inputType === GameInputType.SELECT_CARDS ? (
        <GameInputCardsSelector
          name={"gameInput.clientOptions.selectedCards"}
          options={gameInput.cardOptions}
        />
      ) : gameInput.inputType === GameInputType.SELECT_PAYMENT_FOR_CARD ? (
        <GameInputSelectPaymentForCard
          name={"gameInput.clientOptions.paymentOptions.resources"}
          gameInput={gameInput}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_WORKER_PLACEMENT ? (
        <GameInputSelectWorkerPlacement
          name={"gameInput.clientOptions.selectedOption"}
          options={gameInput.options}
          gameState={gameState}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.SELECT_OPTION_GENERIC ? (
        <GameInputSelectOptionGeneric
          name={"gameInput.clientOptions.selectedOption"}
          gameInput={gameInput}
          viewingPlayer={viewingPlayer}
        />
      ) : gameInput.inputType === GameInputType.VISIT_DESTINATION_CARD ? (
        <GameInputPlayedCardsSelector
          name={"gameInput.clientOptions.playedCard"}
          gameState={gameState}
          viewingPlayer={viewingPlayer}
          chooseOne={true}
          options={gameState.getVisitableDestinationCards()}
        />
      ) : gameInput.inputType === GameInputType.SELECT_LOCATION ? (
        <GameInputPlaceWorkerSelector
          name={"gameInput.clientOptions.selectedLocation"}
          viewingPlayer={viewingPlayer}
          locations={gameInput.locationOptions}
        />
      ) : gameInput.inputType === GameInputType.PLACE_AMBASSADOR ? (
        <GameInputPlaceAmbassadorSelector
          name={"gameInput.clientOptions.loc"}
          gameState={gameState}
          viewingPlayer={viewingPlayer}
          options={gameState.getPlayableAmbassadorLocations()}
        />
      ) : gameInput.inputType === GameInputType.PLAY_ADORNMENT ? (
        <GameInputPlayAdornmentSelector
          name={"gameInput.clientOptions.adornment"}
          adornments={gameState.getPlayableAdornments()}
        />
      ) : gameInput.inputType === GameInputType.SELECT_PLAYED_ADORNMENT ? (
        <GameInputPlayAdornmentSelector
          name={"gameInput.clientOptions.adornment"}
          adornments={gameInput.adornmentOptions}
        />
      ) : gameInput.inputType === GameInputType.SELECT_RIVER_DESTINATION ? (
        <GameInputSelectRiverDestinationSelector
          name={"gameInput.clientOptions.riverDestination"}
          options={gameInput.options}
        />
      ) : gameInput.inputType === GameInputType.PLAY_TRAIN_TICKET ? (
        <>
          <p className={styles.description}>
            Select a deployed worker to reactivate
          </p>
          <GameInputSelectWorkerPlacement
            name={"gameInput.clientOptions.selectedOption"}
            options={viewingPlayer.getRecallableWorkers()}
            gameState={gameState}
            viewingPlayer={viewingPlayer}
          />
        </>
      ) : gameInput.inputType === GameInputType.SELECT_CARDS_WITH_SOURCE ? (
        <GameInputSelectCardWithSourceSelector
          name={"gameInput.clientOptions.selectedCards"}
          chooseOne={
            gameInput.minToSelect === gameInput.maxToSelect &&
            gameInput.maxToSelect === 1
          }
          valueOnSelect={(item) => [item]}
          options={gameInput.cardOptions}
        />
      ) : gameInput.inputType === GameInputType.RESERVE_CARD ? (
        <GameInputSelectCardWithSourceSelector
          name={"gameInput.clientOptions.selectedOption"}
          chooseOne={true}
          options={gameState.getCardsWithSource(false, false)}
        />
      ) : gameInput.inputType === GameInputType.SELECT_TRAIN_CAR_TILE ? (
        <GameInputSelectTrainCarTileSelector
          name={"gameInput.clientOptions.trainCarTileIdx"}
          options={gameInput.options}
        />
      ) : gameInput.inputType === GameInputType.SELECT_VISITOR ? (
        // <GameInputSelectVisitorSelector
        //   name={"gameInput.clientOptions.trainCarTileIdx"}
        //   options={gameInput.options}
        // />
        <div>TODO</div>
      ) : (
        <>
          {assertUnreachable(
            gameInput,
            `Unexpected game input: ${JSON.stringify(gameInput, null, 2)}`
          )}
        </>
      )}
    </div>
  );
};

const getInitialSelectedGameInput = (
  gameInput: GameInput,
  gameState: GameState
): GameInput => {
  if (gameInput.inputType === GameInputType.CLAIM_EVENT) {
    const claimableEvents = gameState.getClaimableEvents();
    if (claimableEvents.length === 1) {
      return {
        ...gameInput,
        clientOptions: {
          event: claimableEvents[0],
        },
      };
    }
  }
  return gameInput;
};

const GameInputBox: React.FC<{
  gameId: string;
  title?: string;
  devDebug?: boolean;
  gameState: GameState;
  gameInputs: GameInput[];
  viewingPlayer: Player | null;
}> = ({
  title = "Game Input",
  devDebug = false,
  gameId,
  gameState,
  gameInputs,
  viewingPlayer,
}) => {
  const activePlayer = gameState.getActivePlayer();
  if (gameState.isGameOver()) {
    return <GameInputBoxText title={title} text={`Game Over!`} />;
  }
  if (!viewingPlayer) {
    return (
      <GameInputBoxText title={title} text={`${activePlayer.name}'s turn`} />
    );
  }
  if (gameState.activePlayerId !== viewingPlayer.playerId) {
    return (
      <GameInputBoxText
        title={title}
        text={`Waiting for ${activePlayer.name}`}
      />
    );
  }

  gameInputs.sort((a, b) =>
    (gameInputSortOrder[a.inputType] || defaultOrder) <
    (gameInputSortOrder[b.inputType] || defaultOrder)
      ? -1
      : 1
  );

  if (gameInputs.length === 0) {
    return <pre>{JSON.stringify(gameState, null, 2)}</pre>;
  }

  return (
    <GameInputBoxContainer
      title={title}
      gameId={gameId}
      devDebug={devDebug}
      viewingPlayer={viewingPlayer}
      initialValues={{
        gameInput: getInitialSelectedGameInput(gameInputs[0], gameState),
      }}
    >
      {({ values, setFieldValue, isSubmitting }) => {
        const selectedGameInput = values.gameInput;

        // For inputs that require selecting multiple things, update the button
        // text to say how many have been selected.
        let submitLabel = "Submit";
        if (selectedGameInput) {
          if (
            selectedGameInput.inputType === GameInputType.SELECT_CARDS ||
            selectedGameInput.inputType === GameInputType.SELECT_PLAYED_CARDS
          ) {
            const numSelected =
              selectedGameInput.clientOptions.selectedCards.length;
            submitLabel = `${numSelected} Selected`;
          } else if (
            selectedGameInput.inputType === GameInputType.DISCARD_CARDS
          ) {
            const numSelected =
              selectedGameInput.clientOptions.cardsToDiscard.length;
            submitLabel = `${numSelected} Selected`;
          }
        }

        return (
          <Form>
            {false && <pre>{JSON.stringify(values, null, 2)}</pre>}
            <div role="group">
              {gameInputs.map((gameInput, idx) => {
                const isSelected = isEqual(
                  omit(values.gameInput, ["clientOptions"]),
                  omit(gameInput, ["clientOptions"])
                );
                return (
                  <div key={idx} className={styles.input_type_radio}>
                    <label>
                      <input
                        id={`js-game-input-type-${gameInput.inputType}`}
                        type="radio"
                        name="selectedInputType"
                        value={idx}
                        checked={isSelected}
                        onChange={() => {
                          setFieldValue(
                            "gameInput",
                            getInitialSelectedGameInput(gameInput, gameState)
                          );
                        }}
                      />
                      <span className={styles.input_type_radio_span}>
                        {renderGameInputLabel(gameInput, gameState.gameOptions)}
                      </span>
                    </label>
                    {isSelected && (
                      <div className={styles.input_type_form_nested}>
                        <GameInputBoxInner
                          gameInput={gameInput}
                          gameState={gameState}
                          viewingPlayer={viewingPlayer}
                        />
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
              {submitLabel}
            </button>
          </Form>
        );
      }}
    </GameInputBoxContainer>
  );
};

export default GameInputBox;
