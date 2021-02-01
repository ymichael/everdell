import { GetServerSideProps } from "next";

import { getGameById } from "../../model/game";
import { GameJSON, PlayerJSON } from "../../model/jsonTypes";
import { GameInput } from "../../model/types";
import GameAdmin from "../../components/GameAdmin";
import Game from "../../components/Game";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const {
    gameId = null,
    gameSecret = null,
    playerSecret = null,
    debug = null,
  } = context.query;
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
      isGameAdmin,
      devDebugMode: process.env.NODE_ENV === "development" && !!debug,
      game:
        game &&
        game.toJSON(isGameAdmin || game.isGameOver() /* includePrivate */),
      viewingPlayer: player && player.toJSON(true /* includePrivate */),
      gameInputs: isActivePlayer ? game.getGameInputs() : [],
    },
  };
};

export default function GamePage(props: {
  isGameAdmin: boolean;
  devDebugMode: boolean;
  game: GameJSON;
  gameInputs: GameInput[];
  viewingPlayer: PlayerJSON | null;
}) {
  const { isGameAdmin, devDebugMode, game, gameInputs, viewingPlayer } = props;
  return (
    <div>
      {isGameAdmin ? (
        <GameAdmin game={game} devDebugMode={devDebugMode} />
      ) : (
        <Game
          game={game}
          gameInputs={gameInputs}
          viewingPlayer={viewingPlayer}
        />
      )}
    </div>
  );
}
