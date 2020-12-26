import * as React from "react";

const Game: React.FC = ({ game }: { game: any }) => {
  return (
    <>
      <p>
        <h2>Meadow</h2>
      </p>
      <pre>{JSON.stringify(game, null, 2)}</pre>
    </>
  );
};

export default Game;
