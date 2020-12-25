import "../styles/globals.css";
import { Provider } from "react-redux";
import { useStore } from "../redux/store";

export default function App<T extends { initialReduxState: any }>({
  Component,
  pageProps,
}: {
  Component: React.ComponentType<T>;
  pageProps: T;
}) {
  const store = useStore(pageProps.initialReduxState);

  return (
    <Provider store={store}>
      <Component {...pageProps} />
    </Provider>
  );
}
