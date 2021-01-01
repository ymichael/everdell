import type { NextApiRequest, NextApiResponse } from "next";
import { getGameById } from "../../model/game";
import { Player } from "../../model/player";
import { onGameUpdate, offGameUpdate } from "../../model/gameUpdates";

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
  const { gameId, playerId, playerSecret } = query || {};
  const game = await getGameById(gameId as string);
  if (!game) {
    res.status(404).json({
      success: false,
      error: "Game not found",
    });
    return;
  }
  let player: Player | null = null;
  try {
    player = playerId ? game.getPlayer(playerId as string) : null;
  } catch (e) {
    // Ignore
  }
  if (!player || player.playerSecretUNSAFE !== playerSecret) {
    res.status(404).json({
      success: false,
      error: "Player not found",
    });
    return;
  }

  res.writeHead(200, {
    Connection: "keep-alive",
    "Content-Encoding": "none",
    "Cache-Control": "no-cache",
    "Content-Type": "text/event-stream",
  });

  const handleGameUpdate = async () => {
    const game = await getGameById(gameId as string);
    if (!game) {
      res.status(404).json({
        success: false,
        error: "Game not found",
      });
      return;
    }

    const isActivePlayer = playerId === game.getActivePlayer().playerId;

    const payload = {
      game: game.toJSON(false /* includePrivate */),

      viewingPlayer: game
        .getPlayer(playerId as string)
        .toJSON(true /* includePrivate */),

      gameInputs: isActivePlayer ? game.getGameInputs() : [],
    };
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };
  onGameUpdate(gameId as string, handleGameUpdate);
  const closeConnection = () => {
    offGameUpdate(gameId as string, handleGameUpdate);
  };
  req.on("aborted", closeConnection);
  req.on("close", closeConnection);

  // Force update
  handleGameUpdate();
};
