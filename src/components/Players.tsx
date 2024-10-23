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
// --- Components ---

export const PlayerName: React.FC<{ name: string; onClick: () => void }> = ({
  name,
  onClick,
}) => {
  return (
    <div className={styles.status_box_bio}>
      <div className={styles.status_box_bio_row}>
        <div className={styles.status_box_bio_name}>{name}</div>
        <div>
          <div
            onClick={onClick}
            style={{
              cursor: "pointer",
            }}
            className={styles.status_box_item_resource_icon}
          >
            <InfoIconSvg />
          </div>
        </div>
      </div>
    </div>
  );
};

const PlayerStatusPill: React.FC<{
  player: Player;
  isActivePlayer: boolean;
}> = ({ player, isActivePlayer }) => {
  return (
    <div className={styles.status_box_bio_meta}>
      {player.getStatus() === TPlayerStatus.GAME_ENDED ? (
        <div
          className={[styles.status_box_bio_pill, styles.pill_game_ended].join(
            " "
          )}
        >
          passed
        </div>
      ) : (
        <>
          <div
            className={[
              styles.status_box_bio_pill,
              player.currentSeason === Season.WINTER && styles.pill_WINTER,
              player.currentSeason === Season.SPRING && styles.pill_SPRING,
              player.currentSeason === Season.SUMMER && styles.pill_SUMMER,
              player.currentSeason === Season.AUTUMN && styles.pill_AUTUMN,
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {player.currentSeason.toLowerCase()}
          </div>
          {isActivePlayer && (
            <div
              className={[styles.status_box_bio_pill, styles.pill_active].join(
                " "
              )}
            >
              active
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const ResourceList: React.FC<{
  playerResources: Record<ResourceType, number>;
}> = ({ playerResources }) => {
  return (
    <div className={styles.status_box_item_resource_list}>
      {[
        ResourceType.TWIG,
        ResourceType.RESIN,
        ResourceType.BERRY,
        ResourceType.PEBBLE,
      ].map((resourceType) => (
        <ResourceItem
          key={resourceType}
          resourceType={resourceType}
          count={playerResources[resourceType]}
        />
      ))}
    </div>
  );
};

const ResourceItem: React.FC<{
  resourceType: ResourceType;
  count: number;
}> = ({ resourceType, count }) => {
  return (
    <div className={styles.status_box_item_resource}>
      <div className={styles.status_box_item_resource_icon}>
        <ResourceTypeIcon resourceType={resourceType} />
      </div>
      <div className={styles.status_box_item_resource_count}>{count}</div>
    </div>
  );
};

export const CardTypeList: React.FC<{ player: Player }> = ({ player }) => {
  return (
    <div className={styles.status_box_item_resource_list}>
      {[
        CardType.TRAVELER,
        CardType.PRODUCTION,
        CardType.DESTINATION,
        CardType.GOVERNANCE,
        CardType.PROSPERITY,
      ].map((cardType) => (
        <CardTypeItem
          key={cardType}
          cardType={cardType}
          count={player.getNumCardType(cardType)}
        />
      ))}
      <CardTypeItem
        cardType={null}
        count={player.maxCitySize - player.getNumOccupiedSpacesInCity()}
        icon={<EmptyCitySpotIcon />}
      />
    </div>
  );
};

const CardTypeItem: React.FC<{
  cardType: CardType | null;
  count: number;
  icon?: React.ReactNode;
}> = ({ cardType, count, icon }) => {
  return (
    <div className={styles.status_box_item_resource}>
      <div className={styles.status_box_item_resource_icon}>
        {icon || <CardTypeSymbol cardType={cardType!} />}
      </div>
      <div className={styles.status_box_item_resource_count}>{count}</div>
    </div>
  );
};

export const OtherResources: React.FC<{
  player: Player;
  gameState: GameState;
  showRealtimePoints?: boolean;
}> = ({ player, gameState, showRealtimePoints }) => {
  return (
    <div className={styles.status_box_item_resource_list}>
      {gameState.gameOptions.pearlbrook && (
        <ResourceItem
          resourceType={ResourceType.PEARL}
          count={player.getNumResourcesByType(ResourceType.PEARL)}
        />
      )}
      <ResourceItem
        resourceType={ResourceType.VP}
        count={player.getNumResourcesByType(ResourceType.VP)}
      />
      <CardTypeItem
        cardType={null}
        count={player.numCardsInHand}
        icon={<CardIcon />}
      />
      {gameState.gameOptions.newleaf?.cards && (
        <CardTypeItem
          cardType={null}
          count={player.numGoldenLeaf}
          icon={<GoldenLeafIcon />}
        />
      )}
      {gameState.gameOptions.newleaf?.reserving && (
        <ReservationTokenItem player={player} />
      )}
      {gameState.gameOptions.newleaf?.ticket && (
        <TrainTicketItem player={player} />
      )}
      {gameState.gameOptions.pearlbrook && (
        <CardTypeItem
          cardType={null}
          count={player.numAdornmentsInHand}
          icon={<AdornmentCardIcon />}
        />
      )}
      <WorkerCountItem player={player} />
      {gameState.gameOptions.pearlbrook && (
        <AmbassadorCountItem player={player} />
      )}
      {showRealtimePoints && (
        <PointsItem player={player} gameState={gameState} />
      )}
    </div>
  );
};

const ReservationTokenItem: React.FC<{ player: Player }> = ({ player }) => {
  return (
    <div className={styles.status_box_item_resource} title="Reservation Token">
      <div className={styles.status_box_item_resource_icon}>
        <ReservationTokenIcon />
      </div>
      <div className={styles.status_box_item_resource_ticket_status}>
        {player.canReserveCard()
          ? "Unused"
          : player.getReservedCardOrNull() ?? "Used"}
      </div>
    </div>
  );
};

const TrainTicketItem: React.FC<{ player: Player }> = ({ player }) => {
  return (
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
        {player.trainTicketStatus === TrainTicketStatus.VALID_FROM_WINTER
          ? "Valid from Winter"
          : player.trainTicketStatus === TrainTicketStatus.VALID_FROM_SUMMER
          ? "Valid from Summer"
          : "Discarded"}
      </div>
    </div>
  );
};

const WorkerCountItem: React.FC<{ player: Player }> = ({ player }) => {
  return (
    <div className={styles.status_box_item_resource}>
      <div className={styles.status_box_item_resource_label}>{"WORKERS"}</div>
      <div className={styles.status_box_item_resource_count}>
        {player.numAvailableWorkers}
      </div>
    </div>
  );
};

const AmbassadorCountItem: React.FC<{ player: Player }> = ({ player }) => {
  return (
    <div className={styles.status_box_item_resource}>
      <div className={styles.status_box_item_resource_label}>
        {"AMBASSADORS"}
      </div>
      <div className={styles.status_box_item_resource_count}>
        {player.hasUnusedAmbassador() ? 1 : 0}
      </div>
    </div>
  );
};

const PointsItem: React.FC<{ player: Player; gameState: GameState }> = ({
  player,
  gameState,
}) => {
  return (
    <div className={styles.status_box_item_resource}>
      <div className={styles.status_box_item_resource_label}>{"POINTS"}</div>
      <div className={styles.status_box_item_resource_count}>
        {player.getPoints(gameState)}
      </div>
    </div>
  );
};

// --- Main Component ---

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
          <PlayerName
            name={player.name}
            onClick={() => setShowCity(!showCity)}
          />
          <PlayerStatusPill player={player} isActivePlayer={isActivePlayer} />
        </div>
        <div className={styles.status_box_item}>
          <ResourceList playerResources={player.getResources()} />
        </div>
        <div className={styles.status_box_item}>
          <CardTypeList player={player} />
        </div>
        <div className={styles.status_box_item}>
          <OtherResources
            player={player}
            gameState={gameState}
            showRealtimePoints={showRealtimePoints}
          />
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
