import * as React from "react";

import { GameInputSelectOptionGeneric as TGameInputSelectOptionGeneric } from "../model/types";
import { Player } from "../model/player";

import { Field } from "formik";
import styles from "../styles/GameInputBox.module.css";
import { GameInputType, GameInput } from "../model/types";

import isEqual from "lodash/isEqual";

const GameInputSelectOptionGeneric: React.FC<{
  name: string;
  gameInput: TGameInputSelectOptionGeneric;
  viewingPlayer: Player;
}> = ({ name, gameInput, viewingPlayer }) => {
  return (
    <div className={styles.selector}>
      <div role="group">
        <p>{gameInput.label}</p>
        <div>
          {gameInput.options.map((option, idx) => {
            return (
              <label key={idx}>
                <Field type="radio" name={name} value={option} />
                {option}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameInputSelectOptionGeneric;
