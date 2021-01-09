import { GetServerSideProps } from "next";

import { GameStateJSON } from "../../model/jsonTypes";
import { LocationName, EventName, GameInputType } from "../../model/types";
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

  gameState.addGameLog("--- Place Worker Logs ---");

  Object.values(LocationName).forEach((location) => {
    gameState.updateGameLog({
      inputType: GameInputType.PLACE_WORKER,
      clientOptions: {
        location,
      },
    });
  });

  gameState.addGameLog("--- Claim Event Logs ---");

  Object.values(EventName).forEach((event) => {
    gameState.updateGameLog({
      inputType: GameInputType.CLAIM_EVENT,
      clientOptions: {
        event,
      },
    });
  });

  gameState.addGameLog("--- Multi-Step ---");

  Object.values(LocationName).forEach((location) => {
    gameState.updateGameLog({
      inputType: GameInputType.SELECT_RESOURCES,
      prevInputType: GameInputType.CLAIM_EVENT,
      maxResources: 1,
      minResources: 1,
      locationContext: location,
      clientOptions: {
        resources: {},
      },
    });
  });

  Object.values(EventName).forEach((event) => {
    gameState.updateGameLog({
      inputType: GameInputType.SELECT_RESOURCES,
      prevInputType: GameInputType.CLAIM_EVENT,
      maxResources: 1,
      minResources: 1,
      eventContext: event,
      clientOptions: {
        resources: {},
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
