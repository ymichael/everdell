import { GetServerSideProps } from "next";

import { GameJSON, PlayerJSON } from "../../model/jsonTypes";
import {
  GameInputType,
  GameInput,
  ResourceType,
  CardName,
  EventName,
} from "../../model/types";
import { Game as GameModel } from "../../model/game";
import GameAdmin from "../../components/GameAdmin";
import Game from "../../components/Game";

import { testInitialGameState } from "../../model/testHelpers";

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Create Test Game Here
  const playerNames = ["Michael", "Elynn"];
  const numPlayers = playerNames.length;
  let gameState = testInitialGameState({
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
    player.addToCity(CardName.RESIN_REFINERY);
    player.addToCity(CardName.PEDDLER);
    player.addToCity(CardName.CEMETARY);
    player.addToCity(CardName.FARM);
    player.addToCity(CardName.MINE);
    player.addToCity(CardName.CLOCK_TOWER);
  });

  const player = gameState.getActivePlayer();

  gameState.replenishMeadow();

  gameState = gameState.next({
    inputType: GameInputType.CLAIM_EVENT,
    clientOptions: {
      event: EventName.BASIC_FOUR_PRODUCTION,
    },
  });
  gameState.nextPlayer();

  const game = new GameModel("testGameId", "testGameSecret", gameState, [
    { text: `Test game created with ${numPlayers} players.` },
  ]);
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
