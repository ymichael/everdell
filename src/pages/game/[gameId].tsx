import { GetServerSideProps } from "next";

import { getGameById } from "../../model/game";
import { GameJSON, PlayerJSON } from "../../model/jsonTypes";
import { GameInput } from "../../model/types";
import GameAdmin from "../../components/GameAdmin";
import Game from "../../components/Game";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const {
    gameId = null,
    gameSecret = null,
    playerSecret = null,
    debug = null,
  } = context.query;
  const locale = context.locale;

  const game = await getGameById(gameId as string);
  if (!game) {
    return { redirect: { statusCode: 302, destination: "/" } };
  }

  // Render admin page showing links for all players
  const isGameAdmin = !!(gameSecret && game.gameSecretUNSAFE === gameSecret);
  const player = playerSecret && game.getPlayerBySecret(playerSecret as string);
  const isActivePlayer =
    player && player.playerId === game.getActivePlayer().playerId;

  return {
    props: {
      ...(await serverSideTranslations(locale || "en", [
        "common",
        "cards",
        "descriptions",
        "rarity",
      ])),
      isGameAdmin,
      devDebugMode: process.env.NODE_ENV === "development" && !!debug,
      gameJSON:
        game &&
        game.toJSON(isGameAdmin || game.isGameOver() /* includePrivate */),
      viewingPlayerJSON: player && player.toJSON(true /* includePrivate */),
      gameInputs: isActivePlayer ? game.getGameInputs() : [],
    },
  };
};

export default function GamePage(props: {
  isGameAdmin: boolean;
  devDebugMode: boolean;
  gameJSON: GameJSON;
  gameInputs: GameInput[];
  viewingPlayerJSON: PlayerJSON | null;
}) {
  const {
    isGameAdmin,
    devDebugMode,
    gameJSON,
    gameInputs,
    viewingPlayerJSON,
  } = props;
  return (
    <div>
      {isGameAdmin ? (
        <GameAdmin gameJSON={gameJSON} devDebugMode={devDebugMode} />
      ) : (
        <Game
          gameJSON={gameJSON}
          gameInputs={gameInputs}
          viewingPlayerJSON={viewingPlayerJSON}
        />
      )}
    </div>
  );
}
