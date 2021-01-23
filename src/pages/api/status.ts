import type { NextApiRequest, NextApiResponse } from "next";

export default async (
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> => {
  res.status(200).end("ok");
  return;
};
