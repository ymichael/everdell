import * as React from "react";
import { useRef } from "react";
import { useField } from "formik";

import styles from "../styles/gameBoard.module.css";

import { GameInputSelectPlayedCards as TGameInputSelectPlayedCards } from "../model/types";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";

import { PlayedCard } from "./Card";
import { ItemWrapper } from "./common";

const GameInputSelectPlayedCards: React.FC<{
  name: string;
  gameState: GameState;
  gameInput: TGameInputSelectPlayedCards;
  viewingPlayer: Player;
}> = ({ name, gameState, gameInput, viewingPlayer }) => {
  const [_field, meta, helpers] = useField(name);
  const selectedCardIdx = useRef<any>({});
  return (
    <div className={styles.items}>
      {gameInput.cardOptions.map((cardInfo, idx) => {
        const isSelected = !!selectedCardIdx.current[idx];
        return (
          <div
            data-cy={`played-card-item:${cardInfo.cardName}`}
            className={styles.clickable}
            key={idx}
            onClick={() => {
              if (isSelected) {
                const newValue = [...meta.value];
                newValue.splice(newValue.indexOf(cardInfo), 1);
                helpers.setValue(newValue);
                selectedCardIdx.current[idx] = false;
              } else {
                if (gameInput.maxToSelect === 1) {
                  helpers.setValue([cardInfo]);
                  selectedCardIdx.current = {};
                } else {
                  helpers.setValue(meta.value.concat([cardInfo]));
                }
                selectedCardIdx.current[idx] = true;
              }
            }}
          >
            <ItemWrapper isHighlighted={isSelected}>
              <PlayedCard
                playedCard={cardInfo}
                viewerId={viewingPlayer.playerId}
                cardOwner={gameState.getPlayer(cardInfo.cardOwnerId)}
              />
            </ItemWrapper>
          </div>
        );
      })}
    </div>
  );
};

export default GameInputSelectPlayedCards;
