import * as React from "react";

import { PlayedCardInfo } from "../model/types";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";
import { PlayedCard } from "./Card";

import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";

const GameInputPlayedCardsSelector: React.FC<{
  name: string;
  gameState: GameState;
  viewingPlayer: Player;
  chooseOne: boolean;
  options: PlayedCardInfo[];
}> = ({ name, gameState, chooseOne, options, viewingPlayer }) => {
  return (
    <GameInputSelectItemWrapper
      name={name}
      items={options}
      chooseOne={chooseOne}
      renderItem={(cardInfo) => (
        <div data-cy={`played-card-item:${cardInfo.cardName}`}>
          <PlayedCard
            playedCard={cardInfo}
            viewerId={viewingPlayer.playerId}
            cardOwner={gameState.getPlayer(cardInfo.cardOwnerId)}
          />
        </div>
      )}
    />
  );
};

export default GameInputPlayedCardsSelector;
