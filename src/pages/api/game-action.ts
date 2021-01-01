import type { NextApiRequest, NextApiResponse } from "next";
import { getGameById } from "../../model/game";

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }
  // Validate body
  const { body } = req;
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
  if (!player || player.playerSecretUNSAFE !== playerSecret) {
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
    await game.save();
  } catch (e) {
    console.error(e);
    res.status(500).json({
      success: false,
      error: "Server Error",
    });
    return;
  }
  res.json({ success: "ok" });
};
