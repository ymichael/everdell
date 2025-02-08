import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import Link from "next/link";
import * as React from "react";
import { useState } from "react";
import i18nextConfig from "../..//next-i18next.config";
import GameBuilder from "../components/GameBuilder";
import styles from "../styles/Home.module.css";

export const availableLocales = i18nextConfig.i18n.locales;

const Main: React.FC = () => {
  const { t } = useTranslation("common");

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
            {t("New Game")}
          </button>
          <a
            target="_blank"
            href="https://www.tabletoptycoon.com/products/everdell-standard-edition-3rd-edition"
            className={styles.link}
          >
            {t("About the Game")}
          </a>
          <Link href="/test/ui" className={styles.link}>
            {t("Game Cards")}
          </Link>
          <a
            target="_blank"
            href="https://github.com/ymichael/everdell"
            className={styles.link}
          >
            {t("Github Source")}
          </a>
          <a
            target="_blank"
            href="https://elynnandmichael.notion.site/Everdell-Updates-Change-Log-12e6d498b6e9477eaed72eaf83520b6c"
            className={styles.link}
          >
            {t("What's New")}
          </a>
          <a
            target="_blank"
            href="https://forms.gle/YYZmW3yDNaFnfSJC6"
            className={styles.link}
          >
            {t("Share Feedback")}
          </a>
        </div>
      )}
    </div>
  );
};

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common"])),
      // Will be passed to the page component as props
    },
  };
}

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
