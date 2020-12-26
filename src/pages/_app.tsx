import "../styles/globals.css";

export default function App<T>({
  Component,
  pageProps,
}: {
  Component: React.ComponentType<T>;
  pageProps: T;
}) {
  return <Component {...pageProps} />;
}
