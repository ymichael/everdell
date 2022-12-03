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
      renderItem={(ambassadorPlacementInfo) => {
        if (ambassadorPlacementInfo.type === "spot") {
          const spotName = ambassadorPlacementInfo.spot;
          const spotInfo = gameState.riverDestinationMap!.spots[spotName];
          return (
            <div data-cy={`place-ambassador-item-spot:${spotName}`}>
              <RiverDestinationSpot
                name={spotName}
                destination={spotInfo.revealed ? spotInfo.name : null}
                ambassadors={spotInfo.ambassadors.map(
                  (playerId) => gameState.getPlayer(playerId).name
                )}
              />
            </div>
          );
        }
        if (ambassadorPlacementInfo.type === "card") {
          const cardInfo = ambassadorPlacementInfo.playedCard;
          return (
            <div data-cy={`place-ambassador-item-card:${cardInfo.cardName}`}>
              <PlayedCard
                playedCard={cardInfo}
                gameState={gameState}
                viewerId={viewingPlayer.playerId}
                cardOwner={gameState.getPlayer(cardInfo.cardOwnerId)}
              />
            </div>
          );
        }
        assertUnreachable(ambassadorPlacementInfo, ambassadorPlacementInfo);
      }}
    />
  );
};

export default GameInputPlaceAmbassadorSelector;
