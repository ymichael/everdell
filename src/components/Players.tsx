import * as React from "react";
import { useState } from "react";

import styles from "../styles/Players.module.css";
import { CardName, ResourceType, CardType } from "../model/types";
import { PlayerJSON, GameStateJSON } from "../model/jsonTypes";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";
import { GameBlock } from "./common";
import { PlayerCity } from "./gameBoard";
import {
  VPIcon,
  CardIcon,
  CardTypeSymbol,
  ResourceTypeIcon,
  EmptyCitySpotIcon,
} from "./common";

export const Players = ({
  viewingPlayer,
  gameState,
  showRealtimePoints = false,
}: {
  viewingPlayer: Player;
  gameState: GameState;
  showRealtimePoints?: boolean;
}) => {
  return (
    <GameBlock title={"Players"}>
      {gameState.players.map((player: Player) => {
        return (
          <PlayerStatus
            key={player.playerId}
            player={player.toJSON(true)}
            gameState={gameState}
            viewingPlayer={viewingPlayer}
            isViewer={player.playerId === viewingPlayer.playerId}
            isActivePlayer={player.playerId === gameState.activePlayerId}
            showRealtimePoints={showRealtimePoints}
          />
        );
      })}
    </GameBlock>
  );
};

const PlayerStatus: React.FC<{
  player: PlayerJSON;
  gameState: GameState;
  viewingPlayer: Player;
  isViewer: boolean;
  isActivePlayer: boolean;
  showRealtimePoints?: boolean;
}> = ({
  player,
  gameState,
  viewingPlayer,
  isViewer,
  isActivePlayer,
  showRealtimePoints,
}) => {
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
            <div className={styles.status_box_item_resource}>
              <div className={styles.status_box_item_resource_icon}>
                <EmptyCitySpotIcon />
              </div>
              <div className={styles.status_box_item_resource_count}>
                {15 - playerImpl.getNumOccupiedSpacesInCity()}
              </div>
            </div>
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
            {showRealtimePoints && (
              <div className={styles.status_box_item_resource}>
                <div className={styles.status_box_item_resource_label}>
                  {"POINTS"}
                </div>
                <div className={styles.status_box_item_resource_count}>
                  {playerImpl.getPoints(gameState)}
                </div>
              </div>
            )}
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
