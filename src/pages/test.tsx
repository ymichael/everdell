import Head from "next/head";
import styles from "../styles/Home.module.css";
import Test from "../components/Test";
import Card from "../components/Card";
import Location from "../components/Location";
import { CardName, LocationName } from "../model/types";

export default function TestPage() {
  const renderAllCards = true;
  let cardsToRender: CardName[] = [];

  const renderAllLocations = true;
  let locationsToRender: LocationName[] = [];

  if (renderAllCards == true) {
    const enums = Object.keys(CardName) as CardName[];
    cardsToRender.push(...enums);
  } else {
    cardsToRender = [CardName.POSTAL_PIGEON];
  }

  if (renderAllLocations == true) {
    const locations = Object.keys(LocationName) as LocationName[];
    locationsToRender.push(...locations);
  } else {
    locationsToRender = [
      LocationName.BASIC_ONE_BERRY,
      LocationName.FOREST_COPY_BASIC_ONE_CARD,
    ];
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Everdell Test Page</title>
      </Head>
      <div>
        {cardsToRender.map(function (cardsToRender, index) {
          return <Card key={index} name={cardsToRender} />;
        })}
      </div>
      <div>
        {locationsToRender.map(function (locationsToRender, index) {
          return <Location key={index} name={locationsToRender} />;
        })}
      </div>
    </div>
  );
}
