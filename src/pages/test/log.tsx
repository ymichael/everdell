import { GetServerSideProps } from "next";

import { GameStateJSON } from "../../model/jsonTypes";
import { LocationName, GameInputType } from "../../model/types";
import { GameState } from "../../model/gameState";
import GameLog from "../../components/GameLog";

import { testInitialGameState } from "../../model/testHelpers";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const playerNames = ["Michael", "Elynn"];
  const numPlayers = playerNames.length;
  let gameState = testInitialGameState({
    numPlayers,
    playerNames,
    noForestLocations: true,
    noSpecialEvents: false,
    shuffleDeck: true,
  });

  Object.values(LocationName).forEach((location) => {
    gameState.updateGameLog({
      inputType: GameInputType.PLACE_WORKER,
      clientOptions: {
        location,
      },
    });
  });

  return {
    props: {
      gameState: gameState.toJSON(false /* includePrivate */),
    },
  };
};

export default function TestGameLogPage(props: { gameState: GameStateJSON }) {
  const { gameState } = props;
  return <GameLog logs={gameState.gameLog} fixedHeight={false} />;
}
