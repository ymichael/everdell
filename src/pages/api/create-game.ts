import type { NextApiRequest, NextApiResponse } from "next";
import shuffle from "lodash/shuffle";
import { createGame } from "../../model/game";

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  // Validate game creation
  const { body } = req;
  if (!(body.players && body.players.length > 1)) {
    res.status(400).json({
      success: false,
      error: "Require at least 2 players to play!",
    });
    return;
  }
  if (!body.players.every((p: any) => !!p.name)) {
    res.status(400).json({
      success: false,
      error: "All players need to have valid names",
    });
    return;
  }
  const players = body.randomizeStartingPlayer
    ? shuffle([...body.players])
    : [...body.players];
  const realtimePoints = !!body.realtimePoints;
  const pearlbrook = !!body.pearlbrook;
  const newleaf = body.newleaf
    ? {
        cards: true,
        forestLocations: true,
        specialEvents: true,
        station: true,
      }
    : {};
  const bellfaire = body.bellfaire
    ? { forestLocations: true, specialEvents: true }
    : {};
  const game = await createGame(
    players.map((p: any) => p.name),
    { realtimePoints, pearlbrook, newleaf, bellfaire }
  );
  res.json({
    success: "ok",
    gameUrl: `/game/${game.gameId}?gameSecret=${game.gameSecretUNSAFE}`,
  });
};
