import * as React from "react";
import { useState } from "react";
import Image from "next/image";

import styles from "../styles/Players.module.css";
import {
  PlayerStatus as TPlayerStatus,
  Season,
  ResourceType,
  CardType,
} from "../model/types";
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
  gameStateJSON,
  showRealtimePoints = false,
}: {
  viewingPlayer: Player;
  gameStateJSON: GameStateJSON;
  showRealtimePoints?: boolean;
}) => {
  return (
    <GameBlock title={"Players"}>
      {gameStateJSON.players.map((playerJSON: PlayerJSON) => {
        return (
          <PlayerStatus
            key={playerJSON.playerId}
            player={playerJSON}
            gameStateJSON={gameStateJSON}
            viewingPlayer={viewingPlayer}
            isViewer={playerJSON.playerId === viewingPlayer.playerId}
            isActivePlayer={
              playerJSON.playerId === gameStateJSON.activePlayerId
            }
            showRealtimePoints={showRealtimePoints}
          />
        );
      })}
    </GameBlock>
  );
};

const PlayerStatus: React.FC<{
  player: PlayerJSON;
  gameStateJSON: GameStateJSON;
  viewingPlayer: Player;
  isViewer: boolean;
  isActivePlayer: boolean;
  showRealtimePoints?: boolean;
}> = ({
  player,
  gameStateJSON,
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
        className={[styles.status_box, isViewer && styles.viewer_status_box]
          .filter(Boolean)
          .join(" ")}
      >
        <div className={styles.status_box_item}>
          <div className={styles.status_box_bio}>
            <div className={styles.status_box_bio_row}>
              <div className={styles.status_box_bio_name}>{player.name}</div>
              <div>
                <div
                  onClick={() => {
                    setShowCity(!showCity);
                  }}
                  style={{ cursor: "pointer" }}
                  className={styles.status_box_item_resource_icon}
                >
                  <Image src="/images/info.png" layout="fill" />
                </div>
              </div>
            </div>

            <div className={styles.status_box_bio_meta}>
              {player.playerStatus === TPlayerStatus.GAME_ENDED ? (
                <div
                  className={[
                    styles.status_box_bio_pill,
                    styles.pill_game_ended,
                  ].join(" ")}
                >
                  passed
                </div>
              ) : (
                <>
                  <div
                    className={[
                      styles.status_box_bio_pill,
                      player.currentSeason === Season.WINTER &&
                        styles.pill_WINTER,
                      player.currentSeason === Season.SPRING &&
                        styles.pill_SPRING,
                      player.currentSeason === Season.SUMMER &&
                        styles.pill_SUMMER,
                      player.currentSeason === Season.AUTUMN &&
                        styles.pill_AUTUMN,
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {player.currentSeason.toLowerCase()}
                  </div>
                  {isActivePlayer && (
                    <div
                      className={[
                        styles.status_box_bio_pill,
                        styles.pill_active,
                      ].join(" ")}
                    >
                      active
                    </div>
                  )}
                </>
              )}
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
                  {playerImpl.getPoints(GameState.fromJSON(gameStateJSON))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showCity && (
        <div className={styles.status_box_city}>
          <PlayerCity player={playerImpl} viewerId={viewingPlayer.playerId} />
        </div>
      )}
    </>
  );
};

export default Players;
