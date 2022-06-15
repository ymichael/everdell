import type { NextApiRequest, NextApiResponse } from "next";
import { createGameFromGameState } from "../../model/game";
import { GameState } from "../../model/gameState";

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  const game = await createGameFromGameState(GameState.fromJSON(req.body));
  res.json({
    success: "ok",
    gameUrl: `/game/${game.gameId}?gameSecret=${game.gameSecretUNSAFE}`,
  });
};
