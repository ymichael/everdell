import Head from "next/head";
import styles from "../styles/Home.module.css";
import Test from "../components/Test";

export default function TestPage() {
  return (
    <div className={styles.container}>
      <Head>
        <title>Everdell Test Page</title>
      </Head>
      <Test />
    </div>
  );
}
