import Head from "next/head";
import styles from "../styles/Home.module.css";

import Game from "../components/Game";

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Everdell</title>
      </Head>
      <Game />
    </div>
  );
}
