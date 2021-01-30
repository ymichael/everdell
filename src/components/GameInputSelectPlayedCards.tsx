import * as React from "react";

import { GameInputSelectPlayedCards as TGameInputSelectPlayedCards } from "../model/types";

import { Player } from "../model/player";
import { GameState } from "../model/gameState";
import { PlayedCard } from "./Card";

import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";

const GameInputSelectPlayedCards: React.FC<{
  name: string;
  gameState: GameState;
  gameInput: TGameInputSelectPlayedCards;
  viewingPlayer: Player;
}> = ({ name, gameState, gameInput, viewingPlayer }) => {
  return (
    <GameInputSelectItemWrapper
      name={name}
      items={gameInput.cardOptions}
      chooseOne={false}
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

export default GameInputSelectPlayedCards;
