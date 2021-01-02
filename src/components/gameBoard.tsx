import * as React from "react";
import styles from "../styles/gameBoard.module.css";
import {
  CardName,
  LocationNameToPlayerIds,
  LocationName,
} from "../model/types";
import { Player } from "../model/player";

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
      <div className={styles.items}>
        {Object.keys(locationsMap).map((locationName, idx) => (
          <Location key={idx} name={locationName as LocationName} />
        ))}
      </div>
    </GameBlock>
  );
};

export const Events: React.FC<{ eventsMap: EventNameToPlayerIds }> = ({
  eventsMap,
}) => {
  return (
    <GameBlock title={"Events"}>
      <div className={styles.items}>
        {Object.keys(eventsMap).map((eventName, idx) => (
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
