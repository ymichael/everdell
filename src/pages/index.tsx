import Head from "next/head";
import styles from "../styles/Home.module.css";

import Main from "../components/Main";

export default function IndexPage() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Everdell</title>
      </Head>
      <Main />
    </div>
  );
}
