import "../styles/globals.css";

function MyApp<T>({
  Component,
  pageProps,
}: {
  Component: React.ComponentType<T>;
  pageProps: T;
}) {
  return <Component {...pageProps} />;
}

export default MyApp;
