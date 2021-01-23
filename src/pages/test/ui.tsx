import * as React from "react";
import { useState, useEffect } from "react";

import Head from "next/head";
import styles from "../../styles/test.module.css";

import { GameBlock, ItemWrapper } from "../../components/common";
import Card from "../../components/Card";
import Location from "../../components/Location";
import Event from "../../components/Event";

import { Card as CardModel } from "../../model/card";
import { Location as LocationModel } from "../../model/location";
import { Event as EventModel } from "../../model/event";
import {
  ExpansionType,
  CardName,
  LocationName,
  EventName,
} from "../../model/types";

const ItemsList: React.FC<{ title: string; visible: boolean }> = ({
  title,
  children,
  visible = true,
}) => {
  return visible ? (
    <GameBlock title={title}>
      <div className={styles.items}>{children}</div>
    </GameBlock>
  ) : (
    <></>
  );
};

export default function TestPage() {
  const allCards: CardName[] = Object.values(CardName) as CardName[];
  const allEvents: EventName[] = Object.values(EventName) as EventName[];
  const allLocations: LocationName[] = Object.values(
    LocationName
  ) as LocationName[];

  const [showPearlbrookOnly, setShowPearlbrookOnly] = useState(false);
  const [showCards, setShowCards] = useState(true);
  const [showLocations, setShowLocations] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const cardsOnly = params.get("cards");
    const locationsOnly = params.get("locations");
    const eventsOnly = params.get("events");
    const showOneType = cardsOnly || locationsOnly || eventsOnly;
    setShowCards(!!(cardsOnly || !showOneType));
    setShowLocations(!!(locationsOnly || !showOneType));
    setShowEvents(!!(eventsOnly || !showOneType));
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Everdell Test Page</title>
      </Head>
      <div className={styles.filter}>
        <input
          type="text"
          placeholder="Filter items..."
          onChange={(e) => {
            setFilter(e.target.value.toLowerCase());
          }}
        />
        &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <label>
          <input
            type="checkbox"
            checked={showPearlbrookOnly}
            onChange={() => {
              setShowPearlbrookOnly(!showPearlbrookOnly);
            }}
          />
          Pearlbrook only
        </label>
      </div>
      <ItemsList title={"Cards"} visible={showCards}>
        {allCards
          .filter((x) => {
            if (filter) {
              if (x.toLowerCase().indexOf(filter) === -1) {
                return false;
              }
            }
            if (showPearlbrookOnly) {
              if (
                CardModel.fromName(x).expansion !== ExpansionType.PEARLBROOK
              ) {
                return false;
              }
            }
            return true;
          })
          .map((card) => {
            return (
              <ItemWrapper>
                <Card key={card} name={card} />
              </ItemWrapper>
            );
          })}
      </ItemsList>
      <ItemsList title={"Locations"} visible={showLocations}>
        {allLocations
          .filter((x) => {
            if (filter) {
              if (x.toLowerCase().indexOf(filter) === -1) {
                return false;
              }
            }
            if (showPearlbrookOnly) {
              if (
                LocationModel.fromName(x).expansion !== ExpansionType.PEARLBROOK
              ) {
                return false;
              }
            }
            return true;
          })
          .map((loc) => {
            return <Location key={loc} name={loc} />;
          })}
      </ItemsList>
      <ItemsList title={"Events"} visible={showEvents}>
        {allEvents
          .filter((x) => {
            if (filter) {
              if (x.toLowerCase().indexOf(filter) === -1) {
                return false;
              }
            }
            if (showPearlbrookOnly) {
              if (
                EventModel.fromName(x).expansion !== ExpansionType.PEARLBROOK
              ) {
                return false;
              }
            }
            return true;
          })
          .map((evt) => {
            return <Event key={evt} name={evt} />;
          })}
      </ItemsList>
    </div>
  );
}
