import * as React from "react";

import omit from "lodash/omit";
import { GameState } from "../model/gameState";
import { GameInputType, GameInput } from "../model/types";
import { Formik, Form, Field, FieldArray } from "formik";
import { Player } from "../model/player";
import { GameBlock } from "./common";

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

const GameInputBox: React.FC<any> = ({ gameId, gameState, viewingPlayer }) => {
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
      <>
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
                gameInput: JSON.parse(values.gameInput as any),
              }),
            });
            const json = await response.json();
            if (!json.success) {
              alert(json.error);
            }
          }}
          render={({ values }) => {
            return (
              <Form>
                <div role="group">
                  {inputTypesOrdered.map((inputType) => {
                    return (
                      <div key={inputType}>
                        <label>
                          <Field
                            type="radio"
                            name="selectedInputType"
                            value={inputType}
                          />
                          {inputType}
                        </label>
                        {inputType === values.selectedInputType && (
                          <div role="group" style={{ padding: 20 }}>
                            {inputTypeToInputs[inputType]?.map(
                              (gameInput, idx) => {
                                return (
                                  <div key={idx}>
                                    <label>
                                      <Field
                                        type="radio"
                                        name="gameInput"
                                        value={JSON.stringify(gameInput)}
                                      />
                                      {JSON.stringify(
                                        omit(gameInput, [
                                          "playerId",
                                          "inputType",
                                        ]),
                                        null,
                                        2
                                      )}
                                    </label>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        )}
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
        />
      </>
    </GameBlock>
  );
};

export default GameInputBox;
