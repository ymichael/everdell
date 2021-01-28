import * as React from "react";
import { useField } from "formik";
import isEqual from "lodash/isEqual";

import styles from "../styles/gameBoard.module.css";

import { PlayedCardInfo } from "../model/types";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";

import { PlayedCard } from "./Card";
import { ItemWrapper } from "./common";

const GameInputVisitDestinationCard: React.FC<{
  name: string;
  gameState: GameState;
  destinations: PlayedCardInfo[];
  viewingPlayer: Player;
}> = ({ name, gameState, destinations = [], viewingPlayer }) => {
  const [_field, meta, helpers] = useField(name);
  return (
    <div role="group">
      <div className={styles.items}>
        {destinations.map((playedCard, idx) => {
          const isSelected = isEqual(meta.value, playedCard);
          return (
            <ItemWrapper key={idx} isHighlighted={isSelected}>
              <div
                className={styles.clickable}
                data-cy={`visit-destination-card-item:${playedCard.cardName}`}
                key={idx}
                onClick={() => {
                  helpers.setValue(playedCard);
                }}
              >
                <PlayedCard
                  playedCard={playedCard}
                  cardOwner={gameState.getPlayer(playedCard.cardOwnerId)}
                  viewerId={viewingPlayer.playerId}
                />
              </div>
            </ItemWrapper>
          );
        })}
      </div>
    </div>
  );
};

export default GameInputVisitDestinationCard;
