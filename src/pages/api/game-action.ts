import type { NextApiRequest, NextApiResponse } from "next";
import { getGameById } from "../../model/game";

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["GET", "POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const { body, method } = req;

  // Validate body
  const { gameId, playerId, playerSecret, gameInput } = body || {};
  const game = await getGameById(gameId as string);
  if (!game) {
    res.status(404).json({
      success: false,
      error: "Game not found",
    });
    return;
  }

  if (!gameInput) {
    res.status(404).json({
      success: false,
      error: "Invalid gameInput",
    });
    return;
  }

  const player = playerId && game.getPlayer(playerId);
  if (
    // Can't find player
    !player ||
    // Trying to take an action as another player
    gameInput?.playerId !== playerId ||
    // Invalid secret
    player.playerSecretUNSAFE !== playerSecret
  ) {
    res.status(404).json({
      success: false,
      error: "Invalid player",
    });
    return;
  }

  const activePlayer = game.getActivePlayer();
  if (player.playerId !== activePlayer.playerId) {
    res.status(404).json({
      success: false,
      error: "Not your turn",
    });
    return;
  }

  try {
    game.applyGameInput(gameInput);
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
    return;
  }

  res.json({
    success: "ok",
    game: game.toJSON(false /* includePrivate */),
    viewingPlayer: game.getPlayer(playerId).toJSON(true /* includePrivate */),
  });
};
