import * as React from "react";
import { useState } from "react";

import styles from "../styles/Players.module.css";
import {
  PlayerStatus as TPlayerStatus,
  Season,
  ResourceType,
  CardType,
  TrainTicketStatus,
} from "../model/types";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";
import { GameBlock } from "./common";
import { PlayerCity } from "./gameBoard";
import {
  InfoIconSvg,
  VPIcon,
  CardIcon,
  GoldenLeafIcon,
  ReservationTokenIcon,
  AdornmentCardIcon,
  CardTypeSymbol,
  ResourceTypeIcon,
  EmptyCitySpotIcon,
  TicketIcon,
} from "./common";

export const Players = ({
  gameState,
  viewingPlayer,
  showRealtimePoints = false,
}: {
  gameState: GameState;
  viewingPlayer: Player | null;
  showRealtimePoints?: boolean;
}) => {
  return (
    <GameBlock title={"Players"}>
      {gameState.players.map((player) => {
        return (
          <PlayerStatus
            key={player.playerId}
            player={player}
            gameState={gameState}
            viewingPlayer={viewingPlayer}
            isViewer={
              !!viewingPlayer && player.playerId === viewingPlayer.playerId
            }
            isActivePlayer={player.playerId === gameState.activePlayerId}
            showRealtimePoints={showRealtimePoints}
          />
        );
      })}
    </GameBlock>
  );
};

const PlayerStatus: React.FC<{
  player: Player;
  gameState: GameState;
  viewingPlayer: Player | null;
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
  return (
    <>
      <div
        data-cy={`player-status:${player.name}`}
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
                  style={{
                    cursor: "pointer",
                  }}
                  className={styles.status_box_item_resource_icon}
                >
                  <InfoIconSvg />
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
                  {player.getNumResourcesByType(resourceType)}
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
                  {player.getNumCardType(cardType)}
                </div>
              </div>
            ))}
            <div className={styles.status_box_item_resource}>
              <div className={styles.status_box_item_resource_icon}>
                <EmptyCitySpotIcon />
              </div>
              <div className={styles.status_box_item_resource_count}>
                {player.maxCitySize - player.getNumOccupiedSpacesInCity()}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.status_box_item}>
          <div className={styles.status_box_item_resource_list}>
            {gameState.gameOptions.pearlbrook && (
              <div className={styles.status_box_item_resource}>
                <div className={styles.status_box_item_resource_icon}>
                  <ResourceTypeIcon resourceType={ResourceType.PEARL} />
                </div>
                <div className={styles.status_box_item_resource_count}>
                  {player.getNumResourcesByType(ResourceType.PEARL)}
                </div>
              </div>
            )}
            <div className={styles.status_box_item_resource}>
              <div className={styles.status_box_item_resource_icon}>
                <VPIcon />
              </div>
              <div className={styles.status_box_item_resource_count}>
                {player.getNumResourcesByType(ResourceType.VP)}
              </div>
            </div>
            <div
              className={styles.status_box_item_resource}
              title="No. of Cards in hand"
            >
              <div className={styles.status_box_item_resource_icon}>
                <CardIcon />
              </div>
              <div className={styles.status_box_item_resource_count}>
                {player.numCardsInHand}
              </div>
            </div>
            {gameState.gameOptions.newleaf?.cards && (
              <div
                className={styles.status_box_item_resource}
                title="No. of Golden Leafs"
              >
                <div className={styles.status_box_item_resource_icon}>
                  <GoldenLeafIcon />
                </div>
                <div className={styles.status_box_item_resource_count}>
                  {player.numGoldenLeaf}
                </div>
              </div>
            )}
            {gameState.gameOptions.newleaf?.reserving && (
              <div
                className={styles.status_box_item_resource}
                title="Reservation Token"
              >
                <div className={styles.status_box_item_resource_icon}>
                  <ReservationTokenIcon />
                </div>
                <div className={styles.status_box_item_resource_ticket_status}>
                  {player.canReserveCard()
                    ? "Unused"
                    : player.getReservedCardOrNull() ?? "Used"}
                </div>
              </div>
            )}
            {gameState.gameOptions.newleaf?.ticket && (
              <div
                className={styles.status_box_item_resource}
                title="Train Ticket: Use to reactivate a deployed worker"
              >
                <div className={styles.status_box_item_resource_ticket_wrapper}>
                  <div className={styles.status_box_item_resource_ticket}>
                    <TicketIcon />
                  </div>
                </div>
                <div className={styles.status_box_item_resource_ticket_status}>
                  {player.trainTicketStatus ===
                  TrainTicketStatus.VALID_FROM_WINTER
                    ? "Valid from Winter"
                    : player.trainTicketStatus ===
                      TrainTicketStatus.VALID_FROM_SUMMER
                    ? "Valid from Summer"
                    : "Discarded"}
                </div>
              </div>
            )}
            {gameState.gameOptions.pearlbrook && (
              <div
                className={styles.status_box_item_resource}
                title="No. of Adornment cards in hand"
              >
                <div className={styles.status_box_item_resource_icon}>
                  <AdornmentCardIcon />
                </div>
                <div className={styles.status_box_item_resource_count}>
                  {player.numAdornmentsInHand}
                </div>
              </div>
            )}
            <div className={styles.status_box_item_resource}>
              <div className={styles.status_box_item_resource_label}>
                {"WORKERS"}
              </div>
              <div className={styles.status_box_item_resource_count}>
                {player.numAvailableWorkers}
              </div>
            </div>
            {gameState.gameOptions.pearlbrook && (
              <div className={styles.status_box_item_resource}>
                <div className={styles.status_box_item_resource_label}>
                  {"AMBASSADORS"}
                </div>
                <div className={styles.status_box_item_resource_count}>
                  {player.hasUnusedAmbassador() ? 1 : 0}
                </div>
              </div>
            )}
            {showRealtimePoints && (
              <div className={styles.status_box_item_resource}>
                <div className={styles.status_box_item_resource_label}>
                  {"POINTS"}
                </div>
                <div className={styles.status_box_item_resource_count}>
                  {player.getPoints(gameState)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showCity && (
        <div className={styles.status_box_city}>
          <GameBlock title={`${player.name}'s City`}>
            <PlayerCity
              player={player}
              gameState={gameState}
              viewerId={viewingPlayer?.playerId || null}
            />
          </GameBlock>
        </div>
      )}
    </>
  );
};

export default Players;
