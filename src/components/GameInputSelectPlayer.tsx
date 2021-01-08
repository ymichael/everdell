import * as React from "react";
import { useRef } from "react";

import { GameInputSelectPlayer as TGameInputSelectPlayer } from "../model/types";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";
import { ResourcesForm } from "./CardPayment";
import { Form, Field } from "formik";

const GameInputSelectPlayer: React.FC<{
  gameInput: TGameInputSelectPlayer;
  gameState: GameState;
  viewingPlayer: Player;
}> = ({ gameInput, gameState, viewingPlayer }) => {
  return (
    <Form>
      <p>
        Select Player for{" "}
        {gameInput.locationContext ||
          gameInput.eventContext ||
          gameInput.cardContext}
      </p>
      <>
        {gameInput.playerOptions.map((playerId) => {
          return (
            <label key={playerId}>
              <Field
                type="radio"
                name="gameInput.clientOptions.selectedPlayer"
                value={playerId}
              />
              {gameState.getPlayer(playerId).name}
            </label>
          );
        })}
        {!gameInput.mustSelectOne && (
          <label>
            <Field
              type="radio"
              name="gameInput.clientOptions.selectedPlayer"
              value={""}
            />
            {"null"}
          </label>
        )}
      </>
    </Form>
  );
};

export default GameInputSelectPlayer;
