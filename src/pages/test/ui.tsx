import * as React from "react";
import { useState, useEffect } from "react";

import { GetServerSideProps } from "next";
import Head from "next/head";
import styles from "../../styles/test.module.css";

import { GameBlock, ItemWrapper } from "../../components/common";
import Card from "../../components/Card";
import Adornment from "../../components/Adornment";
import Location from "../../components/Location";
import Event from "../../components/Event";
import RiverDestination, {
  RiverDestinationSpot,
} from "../../components/RiverDestination";

import { Card as CardModel } from "../../model/card";
import { Location as LocationModel } from "../../model/location";
import { Event as EventModel } from "../../model/event";
import {
  ExpansionType,
  CardName,
  LocationName,
  EventName,
  AdornmentName,
  RiverDestinationName,
  RiverDestinationSpotName,
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

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {},
  };
};

export default function TestUIPage() {
  const allRiverDestinations: RiverDestinationName[] = Object.values(
    RiverDestinationName
  ) as RiverDestinationName[];
  const allRiverSpots: RiverDestinationSpotName[] = Object.values(
    RiverDestinationSpotName
  ) as RiverDestinationSpotName[];
  const allAdornments: AdornmentName[] = Object.values(
    AdornmentName
  ) as AdornmentName[];
  const allCards: CardName[] = Object.values(CardName) as CardName[];
  const allEvents: EventName[] = Object.values(EventName) as EventName[];
  const allLocations: LocationName[] = Object.values(
    LocationName
  ) as LocationName[];

  const [includeBaseGame, setIncludeBaseGame] = useState(true);
  const [includePearlbrook, setIncludePearlbrook] = useState(true);
  const [includeNewleaf, setIncludeNewLeaf] = useState(true);
  const [includeBellfaire, setIncludeBellfaire] = useState(true);

  const [showCards, setShowCards] = useState(true);
  const [showAdornments, setShowAdornments] = useState(true);
  const [showRiver, setShowRiver] = useState(true);
  const [showLocations, setShowLocations] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const cardsOnly = params.get("cards");
    const locationsOnly = params.get("locations");
    const eventsOnly = params.get("events");
    const adornmentsOnly = params.get("adornments");
    const riverOnly = params.get("river");
    const showOneType =
      cardsOnly || locationsOnly || eventsOnly || adornmentsOnly || riverOnly;
    setShowCards(!!(cardsOnly || !showOneType));
    setShowLocations(!!(locationsOnly || !showOneType));
    setShowEvents(!!(eventsOnly || !showOneType));
    setShowAdornments(!!(adornmentsOnly || !showOneType));
    setShowRiver(!!(riverOnly || !showOneType));
  }, []);

  function createItemFilter<
    T extends string,
    M extends CardModel | LocationModel | EventModel
  >(toModel: (x: T) => M): (x: T) => boolean {
    return (x: T): boolean => {
      if (filter) {
        if (x.toLowerCase().indexOf(filter) === -1) {
          return false;
        }
      }
      const model = toModel(x);
      if (model.expansion === ExpansionType.PEARLBROOK) {
        return includePearlbrook;
      }
      if (model.expansion === ExpansionType.NEWLEAF) {
        return includeNewleaf;
      }
      if (model.expansion === ExpansionType.BELLFAIRE) {
        return includeBellfaire;
      }
      if (model.expansion === null) {
        return includeBaseGame;
      }
      return true;
    };
  }

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
            checked={includeBaseGame}
            onChange={() => setIncludeBaseGame((x) => !x)}
          />
          Base Game
        </label>
        &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <label>
          <input
            type="checkbox"
            checked={includePearlbrook}
            onChange={() => setIncludePearlbrook((x) => !x)}
          />
          Pearlbrook
        </label>
        &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <label>
          <input
            type="checkbox"
            checked={includeBellfaire}
            onChange={() => setIncludeBellfaire((x) => !x)}
          />
          Bellfaire
        </label>
        &nbsp;&nbsp;&middot;&nbsp;&nbsp;
        <label>
          <input
            type="checkbox"
            checked={includeNewleaf}
            onChange={() => setIncludeNewLeaf((x) => !x)}
          />
          Newleaf
        </label>
      </div>
      <ItemsList title={"Cards"} visible={showCards}>
        {allCards
          .filter(createItemFilter<CardName, CardModel>(CardModel.fromName))
          .map((card) => {
            return (
              <ItemWrapper key={card}>
                <Card name={card} />
              </ItemWrapper>
            );
          })}
      </ItemsList>
      <ItemsList title={"Locations"} visible={showLocations}>
        {allLocations
          .filter(
            createItemFilter<LocationName, LocationModel>(
              LocationModel.fromName
            )
          )
          .map((loc) => {
            return <Location key={loc} name={loc} />;
          })}
      </ItemsList>
      <ItemsList title={"Events"} visible={showEvents}>
        {allEvents
          .filter(createItemFilter<EventName, EventModel>(EventModel.fromName))
          .map((evt) => {
            return <Event key={evt} name={evt} />;
          })}
      </ItemsList>
      {includePearlbrook && (
        <>
          <ItemsList title={"Adornments"} visible={showAdornments}>
            {allAdornments
              .filter((x) => {
                if (filter) {
                  if (x.toLowerCase().indexOf(filter) === -1) {
                    return false;
                  }
                }
                return true;
              })
              .map((name) => {
                return <Adornment key={name} name={name} />;
              })}
          </ItemsList>
          <ItemsList title={"River Destinations"} visible={showRiver}>
            {allRiverDestinations
              .filter((x) => {
                if (filter) {
                  if (x.toLowerCase().indexOf(filter) === -1) {
                    return false;
                  }
                }
                return true;
              })
              .map((name) => {
                return <RiverDestination key={name} name={name} />;
              })}
          </ItemsList>
          <ItemsList title={"River Destination Spots"} visible={showRiver}>
            {allRiverSpots
              .filter((x) => {
                if (filter) {
                  if (x.toLowerCase().indexOf(filter) === -1) {
                    return false;
                  }
                }
                return true;
              })
              .map((name) => {
                return <RiverDestinationSpot key={name} name={name} />;
              })}
          </ItemsList>
        </>
      )}
    </div>
  );
}
