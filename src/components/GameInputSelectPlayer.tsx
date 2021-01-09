import * as React from "react";
import { useRef } from "react";
import { Form, Field } from "formik";

import { GameInputSelectPlayer as TGameInputSelectPlayer } from "../model/types";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";

const GameInputSelectPlayer: React.FC<{
  gameInput: TGameInputSelectPlayer;
  name: string;
  gameState: GameState;
  viewingPlayer: Player;
}> = ({ name, gameInput, gameState, viewingPlayer }) => {
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
              <Field type="radio" name={name} value={playerId} />
              {gameState.getPlayer(playerId).name}
            </label>
          );
        })}
        {!gameInput.mustSelectOne && (
          <label>
            <Field type="radio" name={name} value={""} />
            {"null"}
          </label>
        )}
      </>
    </Form>
  );
};

export default GameInputSelectPlayer;
