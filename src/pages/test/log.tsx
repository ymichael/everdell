import { GetServerSideProps } from "next";

import GameLog from "../../components/GameLog";
import { GameText } from "../../model/types";
import logsJSON from "./logs.json";

export const getServerSideProps: GetServerSideProps = async (context) => {
  return {
    props: {
      logsJSON,
    },
  };
};

export default function TestGameLogPage(props: { logsJSON: GameText[] }) {
  const gameLog = props.logsJSON.map((gameText: GameText) => ({
    entry: gameText,
  }));
  return <GameLog logs={gameLog} fixedHeight={false} />;
}
