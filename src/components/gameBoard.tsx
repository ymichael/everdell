import * as React from "react";
import styles from "../styles/gameBoard.module.css";
import {
  CardName,
  EventName,
  LocationName,
  LocationType,
  EventType,
} from "../model/types";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";
import { GameStateJSON } from "../model/jsonTypes";
import { Event as EventModel, oldEventEnums } from "../model/event";
import { Location as LocationModel } from "../model/location";
import { VisitorStack } from "../model/visitor";

import GameLog from "./GameLog";
import Card, { PlayedCard, EmptyCard } from "./Card";
import Location from "./Location";
import TrainCarTile from "./TrainCarTile";
import { RiverDestinationSpot } from "./RiverDestination";
import Adornment from "./Adornment";
import Event from "./Event";
import Visitor from "./Visitor";
import { GameBlock, ItemWrapper } from "./common";

export const Meadow: React.FC<{ meadowCards: CardName[] }> = ({
  meadowCards,
}) => {
  return (
    <GameBlock title={"Meadow"}>
      <div id={"js-meadow-cards"}>
        <div className={styles.items_no_wrap}>
          {meadowCards.slice(0, 4).map((cardName, idx) => (
            <ItemWrapper key={idx}>
              <Card name={cardName} />
            </ItemWrapper>
          ))}
        </div>
        <div className={styles.items_no_wrap}>
          {meadowCards.slice(4).map((cardName, idx) => (
            <ItemWrapper key={idx}>
              <Card name={cardName} />
            </ItemWrapper>
          ))}
        </div>
      </div>
    </GameBlock>
  );
};

export const VisitorList: React.FC<{ visitorStack: VisitorStack }> = ({
  visitorStack,
}) => {
  return (
    <div id={"js-visitors"}>
      <div>
        <ItemWrapper key={0}>
          <Visitor name={visitorStack.getRevealedVisitors()[0]} />
        </ItemWrapper>
      </div>
      <div className={styles.items_no_wrap}>
        <ItemWrapper key={1}>
          <Visitor name={visitorStack.getRevealedVisitors()[1]} />
        </ItemWrapper>
      </div>
    </div>
  );
};

const StationCard: React.FC<{ position: 0 | 1 | 2; gameState: GameState }> = ({
  position,
  gameState,
}) => {
  if (!gameState.trainCarTileStack) {
    return null;
  }
  const cardName = gameState.stationCards[position];
  return (
    <ItemWrapper>
      <div className={styles.station_card}>
        {cardName ? <Card name={cardName} /> : <EmptyCard />}
        <TrainCarTile name={gameState.trainCarTileStack.peekAt(position)} />
      </div>
    </ItemWrapper>
  );
};

export const Station: React.FC<{ gameState: GameState }> = ({ gameState }) => {
  if (!gameState.trainCarTileStack) {
    return null;
  }
  return (
    <GameBlock title={"Station"}>
      <div id={"js-station"}>
        <div className={[styles.items_no_wrap, styles.station_cards].join(" ")}>
          <StationCard position={0} gameState={gameState} />
          <StationCard position={1} gameState={gameState} />
          <StationCard position={2} gameState={gameState} />
        </div>
      </div>
    </GameBlock>
  );
};

export const LocationsAndEvents: React.FC<{
  gameState: GameState;
  viewingPlayer: Player | null;
}> = ({ gameState, viewingPlayer }) => {
  return (
    <div className={styles.locations_and_events}>
      <Locations gameState={gameState} viewingPlayer={viewingPlayer} />
      <Events gameState={gameState} />
    </div>
  );
};

export const Locations: React.FC<{
  gameState: GameState;
  viewingPlayer: Player | null;
}> = ({ gameState, viewingPlayer }) => {
  const locationsMap = gameState.locationsMap;
  const allLocations = Object.keys(locationsMap) as LocationName[];
  const allLocationObjs = allLocations.map((x) => LocationModel.fromName(x));

  const sortOrder: Record<LocationType, number> = {
    [LocationType.FOREST]: 1,
    [LocationType.BASIC]: 2,
    [LocationType.KNOLL]: 3,
    [LocationType.STATION]: 4,
    [LocationType.HAVEN]: 5,
    [LocationType.JOURNEY]: 6,
  };

  allLocationObjs.sort((a, b) => {
    return sortOrder[a.type] - sortOrder[b.type];
  });

  const renderLocationWithPlayerNames = (name: LocationName) => {
    return (
      <Location
        key={name}
        name={name}
        gameState={gameState}
        viewingPlayer={viewingPlayer}
        playerWorkers={(locationsMap[name] || []).map(
          (pId) => gameState.getPlayer(pId).name
        )}
      />
    );
  };

  return (
    <GameBlock title={"Locations"}>
      <div className={styles.location_items}>
        {allLocationObjs.map((location, idx) => {
          return renderLocationWithPlayerNames(location.name);
        })}
      </div>
    </GameBlock>
  );
};

export const LocationForType: React.FC<{
  gameState: GameState;
  viewingPlayer: Player | null;
  locationType: LocationType;
  title: string;
}> = ({ gameState, viewingPlayer, locationType, title }) => {
  const locationsMap = gameState.locationsMap;
  const allLocations = Object.keys(locationsMap) as LocationName[];
  const allLocationObjs = allLocations.map((x) => LocationModel.fromName(x));
  const allForestLocationObjs = allLocationObjs.filter(
    (x) => x.type === locationType
  );
  const renderLocationWithPlayerNames = (name: LocationName) => {
    return (
      <Location
        key={name}
        name={name}
        gameState={gameState}
        viewingPlayer={viewingPlayer}
        playerWorkers={(locationsMap[name] || []).map(
          (pId) => gameState.getPlayer(pId).name
        )}
      />
    );
  };

  if (allForestLocationObjs.length === 0) {
    return null;
  } else {
    return gameState.gameOptions.newleaf?.visitors ? (
      <GameBlock title={title}>
        <div className={styles.forest_locations_newleaf}>
          {allForestLocationObjs.map((location, idx) => {
            return renderLocationWithPlayerNames(location.name);
          })}
        </div>
      </GameBlock>
    ) : (
      <GameBlock title={title}>
        <div className={styles.forest_locations}>
          {allForestLocationObjs.map((location, idx) => {
            return renderLocationWithPlayerNames(location.name);
          })}
        </div>
      </GameBlock>
    );
  }
};

export const Events: React.FC<{
  gameState: GameState;
  numColumns?: number;
}> = ({ gameState, numColumns = 3 }) => {
  const renderClaimedEvent = (name: EventName) => {
    // See comment above oldEventEnums
    const oldEventName = Object.keys(gameState.eventsMap).find(
      (oldEventName) => {
        if (oldEventEnums[oldEventName]) {
          const oldName = oldEventEnums[oldEventName];
          return EventName[oldName as keyof typeof EventName] === name;
        }
      }
    );

    const playerId =
      gameState.eventsMap[name] ||
      (oldEventName && gameState.eventsMap[oldEventName as EventName]);
    const claimedBy = playerId ? gameState.getPlayer(playerId).name : null;
    return (
      <div key={name} className={styles.event_item}>
        <Event name={name} claimedBy={claimedBy} />
      </div>
    );
  };
  const allEvents = Object.keys(gameState.eventsMap) as EventName[];
  const allEventObj = allEvents.map((eventName) =>
    EventModel.fromName(eventName)
  );

  allEventObj.sort((a, b) => {
    return (
      (a.type === EventType.BASIC ? -1 : 1) -
      (b.type === EventType.BASIC ? -1 : 1)
    );
  });

  const columns: EventModel[][] = [];
  allEventObj.forEach((event, idx) => {
    const colIdx = idx % numColumns;
    columns[colIdx] = columns[colIdx] || [];
    columns[colIdx]!.push(event);
  });

  return (
    <GameBlock
      title={gameState.gameOptions.pearlbrook ? "Events & Wonders" : "Events"}
    >
      <div id={"js-game-events"} className={styles.event_items}>
        {columns.map((events, idx) => {
          return (
            <div key={idx} className={styles.event_items_col}>
              {events.map((event) => renderClaimedEvent(event.name))}
            </div>
          );
        })}
      </div>
    </GameBlock>
  );
};

export const PlayerCity: React.FC<{
  player: Player;
  gameState: GameState;
  viewerId: string | null;
}> = ({ player, viewerId, gameState }) => {
  const playedCards = player.getPlayedCards();
  const playedAdornments = player.getPlayedAdornments();
  const playedCardIdx: { [cardName: string]: number } = {};
  const claimedVisitors = player.claimedVisitors;

  const labelToCount: [string, number][] = [
    ["Critters", player.getNumPlayedCritters()],
    ["Constructions", player.getNumPlayedConstructions()],
    ["Common Critters", player.getNumPlayedCommonCritters()],
    ["Common Constructions", player.getNumPlayedCommonConstructions()],
    ["Unique Critters", player.getNumPlayedUniqueCritters()],
    ["Unique Constructions", player.getNumPlayedUniqueConstructions()],
  ];

  return playedCards.length !== 0 ||
    playedAdornments.length !== 0 ||
    claimedVisitors.length !== 0 ? (
    <div data-cy={`player-city:${player.name}`}>
      <div className={styles.city_stats}>
        {labelToCount
          .filter(([_, count]) => count)
          .map(([label, count], idx) => {
            return (
              <React.Fragment key={label}>
                {idx !== 0 && "/"}
                <div className={styles.city_stat}>
                  <span>{label}: </span>
                  <span>{count}</span>
                </div>
              </React.Fragment>
            );
          })}
      </div>
      <div className={styles.items}>
        {playedCards.map((playedCard, idx) => {
          const cardName = playedCard.cardName;
          playedCardIdx[cardName] = (playedCardIdx[cardName] || 0) + 1;
          return (
            <ItemWrapper key={`card-${idx}`}>
              <PlayedCard
                playedCard={playedCard}
                gameState={gameState}
                viewerId={viewerId}
                cardOwner={player}
                cardIdx={playedCardIdx[cardName]}
              />
            </ItemWrapper>
          );
        })}
        {playedAdornments.map((playedAdornment, idx) => (
          <Adornment key={`adornment-${idx}`} name={playedAdornment} />
        ))}
        {claimedVisitors.map((claimedVisitor, idx) => (
          <Visitor key={`visitor-${idx}`} name={claimedVisitor} />
        ))}
      </div>
    </div>
  ) : (
    <div data-cy={`player-city:${player.name}`} className={styles.empty_city}>
      City is empty.
    </div>
  );
};

export const GameBoard: React.FC<{
  gameState: GameState;
  gameStateJSON: GameStateJSON;
  viewingPlayer: Player | null;
}> = ({ gameState, gameStateJSON, viewingPlayer }) => {
  return (
    <div className={styles.game_board}>
      <div>
        {gameState.gameOptions.newleaf?.visitors ? (
          <div>
            <LocationForType
              gameState={gameState}
              locationType={LocationType.FOREST}
              title="Forest Locations"
              viewingPlayer={viewingPlayer}
            />{" "}
          </div>
        ) : null}
        <div className={styles.game_board_meadow}>
          <Meadow meadowCards={gameState.meadowCards} />
        </div>
        <GameLog logs={gameState.gameLog} gameStateJSON={gameStateJSON} />
      </div>
      {gameState.gameOptions.newleaf?.station ? (
        <>
          <Station gameState={gameState} />
          <div>
            {gameState.gameOptions.newleaf?.visitors &&
            gameState.visitorStack !== null ? (
              <div>
                <LocationForType
                  gameState={gameState}
                  locationType={LocationType.STATION}
                  title="Visitors"
                  viewingPlayer={viewingPlayer}
                />
                <ItemWrapper key={0}>
                  <Visitor
                    name={gameState.visitorStack.getRevealedVisitors()[0]}
                  />
                </ItemWrapper>

                <ItemWrapper key={1}>
                  <Visitor
                    name={gameState.visitorStack.getRevealedVisitors()[1]}
                  />
                </ItemWrapper>
              </div>
            ) : null}
            <LocationForType
              gameState={gameState}
              locationType={LocationType.KNOLL}
              title="Knoll"
              viewingPlayer={viewingPlayer}
            />
          </div>
        </>
      ) : (
        <>
          <LocationForType
            gameState={gameState}
            locationType={LocationType.FOREST}
            title="Forest Locations"
            viewingPlayer={viewingPlayer}
          />

          <div className={styles.game_board_events}>
            <Events gameState={gameState} numColumns={2} />
          </div>
        </>
      )}
    </div>
  );
};

export const River: React.FC<{
  gameState: GameState;
  viewingPlayer: Player | null;
}> = ({ gameState, viewingPlayer }) => {
  return (
    <GameBlock title={"River"}>
      <div id={"js-game-river"} className={styles.river_items}>
        {gameState
          .riverDestinationMap!.spotEntries()
          .map(([spotName, spotInfo], idx) => {
            return (
              <RiverDestinationSpot
                key={idx}
                name={spotName}
                destination={spotInfo.name}
                ambassadors={spotInfo.ambassadors.map(
                  (playerId) => gameState.getPlayer(playerId).name
                )}
              />
            );
          })}
      </div>
    </GameBlock>
  );
};
