import * as React from "react";
import { useRouter } from "next/router";
import { useSelector, useDispatch } from "react-redux";

import { StoreState } from "../redux/store";
import { PageType } from "../redux/pageType";

import Game from "./Game";
import GameBuilder from "./GameBuilder";

const Main: React.FC = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const pageType: PageType = useSelector((state: StoreState) => state.pageType);

  if (pageType == PageType.GAME_BUILDER) {
    return <GameBuilder />;
  } else if (pageType == PageType.GAME) {
    return <Game />;
  } else {
    return (
      <>
        <h1>Everdell</h1>
        <div>No active game</div>
        <button onClick={() => router.push("/game/new")}>new game</button>
      </>
    );
  }
};

export default Main;
