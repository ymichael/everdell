import { appWithTranslation } from "next-i18next";
import "../styles/globals.css";
import Head from "next/head";
import { useEffect, useState } from "react";

function App<T extends JSX.IntrinsicAttributes>({
  Component,
  pageProps,
}: {
  Component: React.ComponentType<T>;
  pageProps: T;
}) {
  useEffect(() => {
    const href = location.href;
    if (href.indexOf("localhost") === -1) {
      // Redirect the heroku apps to vercel, but only on the home page!
      if (
        href === "http://everdell.herokuapp.com/" ||
        href === "https://everdell.herokuapp.com/"
      ) {
        location.href = href
          .replace(".herokuapp.com", ".vercel.app")
          .replace("http://", "https://");
      } else if (location.protocol !== "https:") {
        location.protocol = "https:";
      }
    }
  }, []);

  const [isDarkMode, setIsDarkMode] = useState(false); // Initial state

  // Function to toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]); // Run effect whenever isDarkMode changes

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

      <button onClick={toggleDarkMode}>
        {isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
      </button>
      <Component {...pageProps} />
    </>
  );
}

export default appWithTranslation(App);
