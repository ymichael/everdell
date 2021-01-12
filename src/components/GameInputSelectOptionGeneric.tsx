import * as React from "react";
import { Field } from "formik";
import isEqual from "lodash/isEqual";

import { GameInputSelectOptionGeneric as TGameInputSelectOptionGeneric } from "../model/types";
import { Player } from "../model/player";

import styles from "../styles/gameBoard.module.css";
import { GameInputType, GameInput } from "../model/types";
import { toGameText } from "../model/gameText";

import { Description } from "./common";

const GameInputSelectOptionGeneric: React.FC<{
  name: string;
  gameInput: TGameInputSelectOptionGeneric;
  viewingPlayer: Player;
}> = ({ name, gameInput, viewingPlayer }) => {
  return (
    <div className={styles.items}>
      <div role="group">
        <div>
          {gameInput.options.map((option, idx) => {
            return (
              <label key={idx} className={styles.radio_item}>
                <Field type="radio" name={name} value={option} />
                <Description textParts={toGameText(option)} />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GameInputSelectOptionGeneric;
