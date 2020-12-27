import Head from "next/head";
import styles from "../styles/Home.module.css";
import Test from "../components/Test";
import Card from "../components/Card";
import { CardName } from "../model/types";

export default function TestPage() {
  var renderAllCards = true;
  var cardsToRender = [];

  if (renderAllCards == true) {
    var enums = Object.keys(CardName) as CardName[];
    cardsToRender.push(...enums);
  } else {
    cardsToRender = [CardName.POSTAL_PIGEON];
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
    </div>
  );
}
