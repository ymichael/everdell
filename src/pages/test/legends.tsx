import { GetServerSideProps, NextPage } from "next";
import GameInputBox from "../../components/GameInputBox";
import { testInitialGameState } from "../../model/testHelpers";
import { CardName, EventName, GameInputType } from "../../model/types";
import { Game as GameModel } from "../../model/game";
import { GameJSON } from "../../model/jsonTypes";
import { GameState } from "../../model/gameState";
import { FunctionComponent, useEffect } from "react";
import Game from "../../components/Game";
import { NextRouter, useRouter } from "next/router";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const playerNames = ["Michael", "Elynn", "Chris", "Vanessa"];
  const numPlayers = playerNames.length;
  const gameState = testInitialGameState({
    numPlayers,
    playerNames,
    specialEvents: [
      EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
      EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
      EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
      EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
    ],
    shuffleDeck: true,
    gameOptions: {
      legends: true,
    },
  });

  gameState.players.forEach((player, idx) => {
    player.nextSeason();

    player.drawCards(gameState, idx);
    player.addToCity(gameState, CardName.AMILLA_GLISTENDEW);
  });

  const game = new GameModel({
    gameId: "testGameId",
    gameSecret: "testGameSecret",
    gameState,
  });

  return {
    props: {
      game: game.toJSON(true /* includePrivate */),
    },
  };
};

async function createGame(router: NextRouter, game: GameJSON) {
  const response = await fetch("/api/create-game-from-state", {
    method: "POST",
    cache: "no-cache",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(game.gameState),
  });
  const json = await response.json();
  if (json.success && json.gameUrl) {
    router.push(json.gameUrl);
  } else {
    alert(json.error);
  }
}

const AmillaGlistendew: FunctionComponent<{ game: GameJSON }> = (props)=> {
  const router = useRouter();

  useEffect(() => {
    createGame(router, props.game);
  }, [])

  return null
}

export default AmillaGlistendew
