import Head from "next/head";
import styles from "../styles/Home.module.css";
import Test from "../components/Test";
import Card from "../components/Card";
import { CardName } from "../model/types";

export default function TestPage() {
  var name = CardName.POSTAL_PIGEON;
  return (
    <div className={styles.container}>
      <Head>
        <title>Everdell Test Page</title>
      </Head>
      <Card name={name} />
    </div>
  );
}
