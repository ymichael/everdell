const GameAdmin = ({ game }: { game: any }) => {
  return (
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
  );
};

export default GameAdmin;
