import * as React from "react";
import styles from "../styles/Players.module.css";
import { CardName, ResourceType } from "../model/types";
import { Player } from "../model/player";
import { GameBlock } from "./common";
import { CardTypeSymbol, ResourceTypeIcon } from "./assets";

export const Players = ({
  viewingPlayer,
  gameState,
}: {
  viewingPlayer: any;
  gameState: any;
}) => {
  return (
    <GameBlock title={"Players"}>
      <PlayerStatus
        player={viewingPlayer}
        isViewer={true}
        isActivePlayer={viewingPlayer.playerId === gameState.activePlayerId}
      />
      {gameState.players
        .filter((player: any) => player.playerId !== viewingPlayer.playerId)
        .map((player: any) => {
          return (
            <PlayerStatus
              key={player.playerId}
              player={player}
              isViewer={false}
              isActivePlayer={player.playerId === gameState.activePlayerId}
            />
          );
        })}
    </GameBlock>
  );
};

const PlayerStatus: React.FC<{
  player: any;
  isViewer: boolean;
  isActivePlayer: boolean;
}> = ({ player, isViewer, isActivePlayer }) => {
  player = Player.fromJSON(player);
  return (
    <div className={styles.status_box}>
      <div className={styles.status_box_item}>
        <div>{player.name}</div>
        <div>{isActivePlayer ? "[active]" : ""}</div>
      </div>
      <div className={styles.status_box_item}>
        <div className={styles.status_box_item_resource_list}>
          {[
            ResourceType.TWIG,
            ResourceType.RESIN,
            ResourceType.BERRY,
            ResourceType.PEBBLE,
            ResourceType.VP,
          ].map((resourceType) => (
            <div key={resourceType} className={styles.status_box_item_resource}>
              <div className={styles.status_box_item_resource_icon}>
                <ResourceTypeIcon resourceType={resourceType} />
              </div>
              <div className={styles.status_box_item_resource_count}>
                {player.getNumResource(resourceType)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Players;
