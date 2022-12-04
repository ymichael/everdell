import * as React from "react";
import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import styles from "../styles/Home.module.css";

import GameBuilder from "../components/GameBuilder";

const Main: React.FC = () => {
  const [showGameBuilder, setShowGameBuilder] = useState(false);
  return (
    <div>
      <h1 className={styles.title}>Everdell</h1>
      {showGameBuilder ? (
        <div className={styles.game_builder_wrapper}>
          <GameBuilder />
        </div>
      ) : (
        <div className={styles.links}>
          <button
            id={"js-new-game"}
            className={styles.button}
            onClick={() => setShowGameBuilder(true)}
          >
            New Game
          </button>
          <a
            target="_blank"
            href="https://www.amazon.com/Everdell-Collectors-Edition-2nd-Printing/dp/B07WWJMQFW"
            className={styles.link}
          >
            Buy the Game
          </a>
          <a
            target="_blank"
            href="https://www.tabletoptycoon.com/products/everdell-collectors-edition-2nd-edition"
            className={styles.link}
          >
            About the Game
          </a>
          <Link href="/test/ui" className={styles.link}>
            Game Cards
          </Link>
          <a
            target="_blank"
            href="https://github.com/ymichael/everdell"
            className={styles.link}
          >
            Github Source
          </a>
          <a
            target="_blank"
            href="https://elynnandmichael.notion.site/Everdell-Updates-Change-Log-12e6d498b6e9477eaed72eaf83520b6c"
            className={styles.link}
          >
            What's New
          </a>
          <a
            target="_blank"
            href="https://forms.gle/YYZmW3yDNaFnfSJC6"
            className={styles.link}
          >
            Share Feedback
          </a>
        </div>
      )}
    </div>
  );
};

export default function IndexPage() {
  return (
    <div className={styles.container}>
      <Head>
        <style>
          {`html, body {
            background-color: #f1e7ad;
            color: #2b2c1a;`}
        </style>
      </Head>
      <Main />
    </div>
  );
}
