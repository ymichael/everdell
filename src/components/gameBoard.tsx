import * as React from "react";
import styles from "../styles/gameBoard.module.css";
import {
  CardName,
  EventNameToPlayerId,
  EventName,
  LocationNameToPlayerIds,
  LocationName,
  LocationType,
  EventType,
} from "../model/types";
import { Player } from "../model/player";
import { Event as EventModel } from "../model/event";
import { Location as LocationModel } from "../model/location";

import Card, { PlayedCard } from "./Card";
import Location from "./Location";
import Event from "./Event";
import { GameBlock } from "./common";

export const Meadow: React.FC<{ meadowCards: CardName[] }> = ({
  meadowCards,
}) => {
  return (
    <GameBlock title={"Meadow"}>
      <div className={styles.items}>
        {meadowCards.map((cardName, idx) => (
          <Card key={idx} name={cardName} />
        ))}
      </div>
    </GameBlock>
  );
};

export const Locations: React.FC<{ locationsMap: LocationNameToPlayerIds }> = ({
  locationsMap,
}) => {
  return (
    <GameBlock title={"Locations"}>
      <div className={styles.forest_items}>
        {Object.keys(locationsMap)
          .filter((locationName) => {
            const location = LocationModel.fromName(
              locationName as LocationName
            );
            return location.type === LocationType.FOREST;
          })
          .map((locationName, idx) => (
            <Location key={idx} name={locationName as LocationName} />
          ))}
      </div>
      <div className={styles.forest_items}>
        {Object.keys(locationsMap)
          .filter((locationName) => {
            const location = LocationModel.fromName(
              locationName as LocationName
            );
            return location.type === LocationType.BASIC;
          })
          .map((locationName, idx) => (
            <Location key={idx} name={locationName as LocationName} />
          ))}
      </div>
      <div className={styles.forest_items}>
        {Object.keys(locationsMap)
          .filter((locationName) => {
            const location = LocationModel.fromName(
              locationName as LocationName
            );
            return location.type === LocationType.HAVEN;
          })
          .map((locationName, idx) => (
            <Location key={idx} name={locationName as LocationName} />
          ))}
      </div>
      <div className={styles.forest_items}>
        {Object.keys(locationsMap)
          .filter((locationName) => {
            const location = LocationModel.fromName(
              locationName as LocationName
            );
            return location.type === LocationType.JOURNEY;
          })
          .map((locationName, idx) => (
            <Location key={idx} name={locationName as LocationName} />
          ))}
      </div>
    </GameBlock>
  );
};

export const Events: React.FC<{ eventsMap: EventNameToPlayerId }> = ({
  eventsMap,
}) => {
  return (
    <GameBlock title={"Events"}>
      <div className={styles.items}>
        {Object.keys(eventsMap)
          .filter((eventName) => {
            const event = EventModel.fromName(eventName as EventName);
            return event.type === EventType.BASIC;
          })
          .map((eventName, idx) => (
            <Event key={idx} name={eventName as EventName} />
          ))}
      </div>
      <div className={styles.items}>
        {Object.keys(eventsMap)
          .filter((eventName) => {
            const event = EventModel.fromName(eventName as EventName);
            return event.type !== EventType.BASIC;
          })
          .map((eventName, idx) => (
            <Event key={idx} name={eventName as EventName} />
          ))}
      </div>
    </GameBlock>
  );
};

export const PlayerCity: React.FC<{ player: Player; viewerId: string }> = ({
  player,
  viewerId,
}) => {
  const playedCards = player.getAllPlayedCards();
  return playedCards.length !== 0 ? (
    <div className={styles.items}>
      {playedCards.map((playedCard, idx) => (
        <PlayedCard
          key={idx}
          playedCard={playedCard}
          viewerId={viewerId}
          cardOwner={player}
        />
      ))}
    </div>
  ) : (
    <div className={styles.empty_city}>City is empty.</div>
  );
};
