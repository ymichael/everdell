import * as React from "react";
import { useRouter } from "next/router";

const Main: React.FC = () => {
  const router = useRouter();
  return (
    <>
      <h1>Everdell</h1>
      <button onClick={() => router.push("/game/new")}>new game</button>
    </>
  );
};

export default Main;
