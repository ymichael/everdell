import * as React from "react";
import { useState } from "react";

import styles from "../styles/Players.module.css";
import { CardName, ResourceType, CardType } from "../model/types";
import { PlayerJSON, GameStateJSON } from "../model/jsonTypes";
import { Player } from "../model/player";
import { GameBlock } from "./common";
import { PlayerCity } from "./gameBoard";
import { VPIcon, CardIcon, CardTypeSymbol, ResourceTypeIcon } from "./assets";

export const Players = ({
  viewingPlayer,
  gameState,
}: {
  viewingPlayer: Player;
  gameState: GameStateJSON;
}) => {
  return (
    <GameBlock title={"Players"}>
      {gameState.players.map((player: any) => {
        return (
          <PlayerStatus
            key={player.playerId}
            player={player}
            viewingPlayer={viewingPlayer}
            isViewer={player.playerId === viewingPlayer.playerId}
            isActivePlayer={player.playerId === gameState.activePlayerId}
          />
        );
      })}
    </GameBlock>
  );
};

const PlayerStatus: React.FC<{
  player: PlayerJSON;
  viewingPlayer: Player;
  isViewer: boolean;
  isActivePlayer: boolean;
}> = ({ player, viewingPlayer, isViewer, isActivePlayer }) => {
  const [showCity, setShowCity] = useState(false);
  const playerImpl = Player.fromJSON(player);
  return (
    <>
      <div
        onClick={() => {
          if (!isViewer) {
            setShowCity(!showCity);
          }
        }}
        className={[styles.status_box, isViewer && styles.viewer_status_box]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.status_box_item}>
          <div className={styles.status_box_bio}>
            <div className={styles.status_box_bio_name}>{player.name}</div>
            <div className={styles.status_box_bio_meta}>
              {isActivePlayer ? "[active]" : ""}
            </div>
            <div className={styles.status_box_bio_season}>
              {player.currentSeason.toLowerCase()}
            </div>
          </div>
        </div>
        <div className={styles.status_box_item}>
          <div className={styles.status_box_item_resource_list}>
            {[
              ResourceType.TWIG,
              ResourceType.RESIN,
              ResourceType.BERRY,
              ResourceType.PEBBLE,
            ].map((resourceType) => (
              <div
                key={resourceType}
                className={styles.status_box_item_resource}
              >
                <div className={styles.status_box_item_resource_icon}>
                  <ResourceTypeIcon resourceType={resourceType} />
                </div>
                <div className={styles.status_box_item_resource_count}>
                  {playerImpl.getNumResourcesByType(resourceType)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.status_box_item}>
          <div className={styles.status_box_item_resource_list}>
            {[
              CardType.TRAVELER,
              CardType.PRODUCTION,
              CardType.DESTINATION,
              CardType.GOVERNANCE,
              CardType.PROSPERITY,
            ].map((cardType) => (
              <div key={cardType} className={styles.status_box_item_resource}>
                <div className={styles.status_box_item_resource_icon}>
                  <CardTypeSymbol cardType={cardType} />
                </div>
                <div className={styles.status_box_item_resource_count}>
                  {playerImpl.getNumCardType(cardType)}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.status_box_item}>
          <div className={styles.status_box_item_resource_list}>
            <div className={styles.status_box_item_resource}>
              <div className={styles.status_box_item_resource_label}>
                <VPIcon />
              </div>
              <div className={styles.status_box_item_resource_count}>
                {playerImpl.getNumResourcesByType(ResourceType.VP)}
              </div>
            </div>
            <div className={styles.status_box_item_resource}>
              <div className={styles.status_box_item_resource_label}>
                <CardIcon />
              </div>
              <div className={styles.status_box_item_resource_count}>
                {player.numCardsInHand}
              </div>
            </div>
            <div className={styles.status_box_item_resource}>
              <div className={styles.status_box_item_resource_label}>
                {"WORKERS"}
              </div>
              <div className={styles.status_box_item_resource_count}>
                {player.numWorkers - player.placedWorkers.length}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showCity && (
        <PlayerCity player={playerImpl} viewerId={viewingPlayer.playerId} />
      )}
    </>
  );
};

export default Players;
