import Head from "next/head";
import styles from "../../styles/Home.module.css";
import GameBuilder from "../../components/GameBuilder";

export default function NewGamePage() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Everdell New Game</title>
      </Head>
      <GameBuilder />
    </div>
  );
}
