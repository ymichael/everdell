import "../styles/globals.css";
import Head from "next/head";
import { useEffect } from "react";

export default function App<T>({
  Component,
  pageProps,
}: {
  Component: React.ComponentType<T>;
  pageProps: T;
}) {
  useEffect(() => {
    if (location.href.indexOf("localhost") === -1) {
      // Redirect the heroku apps to vercel
      if (location.href.indexOf("everdell.herokuapp.com") !== -1) {
        location.href = "https://everdell.vercel.app/";
      } else if (location.protocol !== "https:") {
        location.protocol = "https:";
      }
    }
  }, []);
  return (
    <>
      <Head>
        <link rel="preconnect" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.xz.style" />
        <link rel="stylesheet" href="https://fonts.xz.style/serve/inter.css" />
        <link
          href="https://fonts.googleapis.com/css2?family=Allura&display=swap"
          rel="stylesheet"
        />
        <link rel="shortcut icon" href="/images/favicon.png" />
        <title>Everdell</title>
      </Head>
      <Component {...pageProps} />
    </>
  );
}
