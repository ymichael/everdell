import { GetServerSideProps } from "next";

import { GameJSON, PlayerJSON } from "../../model/jsonTypes";
import { GameInput, ResourceType, CardName } from "../../model/types";
import { Game as GameModel } from "../../model/game";
import GameAdmin from "../../components/GameAdmin";
import Game from "../../components/Game";

import { testInitialGameState } from "../../model/testHelpers";

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Create Test Game Here
  const playerNames = ["Michael", "Elynn"];
  const numPlayers = playerNames.length;
  const gameState = testInitialGameState({
    numPlayers,
    playerNames,
    noForestLocations: false,
    noSpecialEvents: false,
    shuffleDeck: true,
  });
  gameState.players.forEach((player, idx) => {
    player.drawCards(gameState, 5 + idx);
    player.gainResources({
      [ResourceType.VP]: 12,
      [ResourceType.TWIG]: 4,
      [ResourceType.BERRY]: 7,
      [ResourceType.PEBBLE]: 3,
      [ResourceType.RESIN]: 6,
    });

    // City
    player.addToCity(CardName.UNIVERSITY);
    player.addToCity(CardName.DUNGEON);
    player.addToCity(CardName.WANDERER);
    player.addToCity(CardName.HUSBAND);
    player.addToCity(CardName.WIFE);
    player.addToCity(CardName.FARM);
    player.addToCity(CardName.MINE);
    player.addToCity(CardName.CLOCK_TOWER);
  });

  gameState.replenishMeadow();

  const game = new GameModel("testGameId", "testGameSecret", gameState, [
    { text: `Test game created with ${numPlayers} players.` },
  ]);
  const player = game.getActivePlayer();
  const isActivePlayer =
    player && player.playerId === game.getActivePlayer().playerId;

  return {
    props: {
      game: game.toJSON(false /* includePrivate */),
      viewingPlayer: player.toJSON(true /* includePrivate */),
      gameInputs: isActivePlayer ? game.getGameInputs() : [],
    },
  };
};

export default function TestGamePage(props: {
  game: GameJSON;
  gameInputs: GameInput[];
  viewingPlayer: PlayerJSON;
}) {
  const { game, gameInputs, viewingPlayer } = props;
  return (
    <Game game={game} gameInputs={gameInputs} viewingPlayer={viewingPlayer} />
  );
}
