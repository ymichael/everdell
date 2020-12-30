import { GameJSON } from "../model/jsonTypes";
import { GameBlock } from "./common";

const GameAdmin = ({ game }: { game: GameJSON }) => {
  return (
    <GameBlock title={"Game Created"}>
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
      <i>Game ID: {game.gameId}</i>
    </GameBlock>
  );
};

export default GameAdmin;
