import type { NextApiRequest, NextApiResponse } from "next";
import { getGameById } from "../../model/game";
import { Player } from "../../model/player";

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  // Validate query
  const { query } = req;
  const { gameId, playerId, playerSecret, gameStateId } = query || {};
  const game = await getGameById(gameId as string);
  if (!game) {
    res.status(404).json({
      success: false,
      error: "Game not found",
    });
    return;
  }

  if (!gameStateId) {
    res.status(404).json({
      success: false,
      error: "Need to specify gameStateId",
    });
    return;
  }

  if (String(game.getGameStateId()) === gameStateId) {
    res.status(304).end("Not Modified");
    return;
  }

  let player: Player | null = null;
  try {
    player = playerId ? game.getPlayer(playerId as string) : null;
  } catch (e) {
    // Ignore
  }
  if (player && player.playerSecretUNSAFE !== playerSecret) {
    res.status(404).json({
      success: false,
      error: "Player not found",
    });
    return;
  }

  const isActivePlayer =
    player && player.playerId === game.getActivePlayer().playerId;
  res.json({
    game: game && game.toJSON(game.isGameOver() /* includePrivate */),
    viewingPlayer: player && player.toJSON(true /* includePrivate */),
    gameInputs: isActivePlayer ? game.getGameInputs() : [],
  });
};
