import { GetServerSideProps } from "next";
import { useRouter } from "next/router";

import { getGameById } from "../../model/game";
import { getPlayerByKey } from "../../model/player";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { gameId = null, playerKey = null } = context.query;
  const game = gameId && getGameById(gameId as string);
  if (!game) {
    return { notFound: true };
  }

  const player = playerKey && getPlayerByKey(playerKey as string);

  // TODO: Check if gameId & playerId is valid
  return {
    props: {
      query: {
        gameId,
        playerKey,
      },
      game: game && game.toJSON(),
      currentPlayer: player && player.toJSON(true /* includePrivate */),
    },
  };
};

export default function GamePage(props: any) {
  return (
    <div>
      <pre>{JSON.stringify(props, null, 2)}</pre>
    </div>
  );
}
