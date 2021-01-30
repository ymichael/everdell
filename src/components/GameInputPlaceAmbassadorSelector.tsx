import * as React from "react";

import { AmbassadorPlacementInfo } from "../model/types";
import { GameState } from "../model/gameState";
import { Player } from "../model/player";

import { RiverDestinationSpot } from "./RiverDestination";
import { PlayedCard } from "./Card";
import GameInputSelectItemWrapper from "./GameInputSelectItemWrapper";

import { assertUnreachable } from "../utils";

const GameInputPlaceAmbassadorSelector: React.FC<{
  name: string;
  gameState: GameState;
  viewingPlayer: Player;
  options: AmbassadorPlacementInfo[];
}> = ({ options, name, gameState, viewingPlayer }) => {
  return (
    <GameInputSelectItemWrapper
      name={name}
      items={options}
      chooseOne={true}
      renderItem={(spotInfo) => {
        if (spotInfo.type === "spot") {
          return (
            <div data-cy={`place-ambassador-item-spot:${spotInfo.spot}`}>
              <RiverDestinationSpot name={spotInfo.spot} />
            </div>
          );
        }
        if (spotInfo.type === "card") {
          const cardInfo = spotInfo.playedCard;
          return (
            <div data-cy={`place-ambassador-item-card:${cardInfo.cardName}`}>
              <PlayedCard
                playedCard={cardInfo}
                viewerId={viewingPlayer.playerId}
                cardOwner={gameState.getPlayer(cardInfo.cardOwnerId)}
              />
            </div>
          );
        }
        assertUnreachable(spotInfo, spotInfo);
      }}
    />
  );
};

export default GameInputPlaceAmbassadorSelector;
