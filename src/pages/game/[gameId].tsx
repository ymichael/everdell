import { GetServerSideProps } from "next";
import { useRouter } from "next/router";

import { getGameById } from "../../model/game";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const {
    gameId = null,
    gameSecret = null,
    playerSecret = null,
  } = context.query;
  const game = await getGameById(gameId as string);
  if (!game) {
    return { redirect: { statusCode: 302, destination: "/" } };
  }

  // Render admin page showing links for all players
  const isGameAdmin = !!(gameSecret && game.gameSecretUNSAFE === gameSecret);
  const player = playerSecret && game.getPlayerBySecret(playerSecret as string);

  // TODO: Check if gameId & playerId is valid
  return {
    props: {
      isGameAdmin,
      game: game && game.toJSON(isGameAdmin /* includePrivate */),
      currentPlayer: player && player.toJSON(true /* includePrivate */),
    },
  };
};

export default function GamePage(props: {
  isGameAdmin: boolean;
  game: any;
  currentPlayer: any;
}) {
  const { isGameAdmin, game, currentPlayer } = props;
  return (
    <div>
      {isGameAdmin ? (
        <>
          <h1>Game id: {game.gameId}</h1>
          <p>Copy links to share with other players:</p>
          <ul>
            {game.gameState.players.map((p: any, idx: number) => (
              <li key={idx}>
                <a href={`/game/${game.gameId}?playerSecret=${p.playerSecret}`}>
                  {p.name}{" "}
                </a>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <pre>{JSON.stringify(props, null, 2)}</pre>
      )}
    </div>
  );
}
