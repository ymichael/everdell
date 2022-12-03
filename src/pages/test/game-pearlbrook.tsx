import { GetServerSideProps } from "next";

import { GameJSON, PlayerJSON } from "../../model/jsonTypes";
import {
  AdornmentName,
  GameInputType,
  GameInput,
  ResourceType,
  CardName,
  EventName,
  LocationName,
} from "../../model/types";
import { Game as GameModel } from "../../model/game";
import Game from "../../components/Game";

import { testInitialGameState } from "../../model/testHelpers";

export const getServerSideProps: GetServerSideProps = async (context) => {
  // Create Test Game Here
  const playerNames = ["Michael", "Elynn", "Chris", "Vanessa"];
  const numPlayers = playerNames.length;
  const gameState = testInitialGameState({
    numPlayers,
    playerNames,
    specialEvents: [
      EventName.SPECIAL_GRADUATION_OF_SCHOLARS,
      EventName.SPECIAL_A_BRILLIANT_MARKETING_PLAN,
      EventName.SPECIAL_PERFORMER_IN_RESIDENCE,
      EventName.SPECIAL_CAPTURE_OF_THE_ACORN_THIEVES,
    ],
    shuffleDeck: true,
    gameOptions: {
      pearlbrook: true,
    },
  });

  gameState.locationsMap[LocationName.FOREST_TWO_WILD] = [];
  gameState.locationsMap[LocationName.FOREST_ONE_PEBBLE_THREE_CARD] = [];
  gameState.locationsMap[
    LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD
  ] = [];

  gameState.players.forEach((player, idx) => {
    for (let i = 0; i < idx; i++) {
      player.nextSeason();
    }

    player.drawCards(gameState, idx);
    player.cardsInHand.push(CardName.RANGER);
    player.cardsInHand.push(CardName.BARD);

    player.playedAdornments.push(AdornmentName.TIARA);

    player.gainResources(gameState, {
      [ResourceType.VP]: 12,
      [ResourceType.TWIG]: 4,
      [ResourceType.BERRY]: 7,
      [ResourceType.PEBBLE]: 3,
      [ResourceType.RESIN]: 6,
      [ResourceType.PEARL]: 2,
    });

    // City
    player.addToCity(gameState, CardName.UNIVERSITY);
    player.addToCity(gameState, CardName.DUNGEON);
    player.addToCity(gameState, CardName.EVERTREE);
    player.addToCity(gameState, CardName.INNKEEPER);
    player.addToCity(gameState, CardName.RESIN_REFINERY);
    player.addToCity(gameState, CardName.INN);
    player.addToCity(gameState, CardName.FARM);
    player.addToCity(gameState, CardName.MINE).usedForCritter = true;
    player.addToCity(gameState, CardName.CLOCK_TOWER);
  });

  gameState.replenishMeadow();

  const game = new GameModel({
    gameId: "testGameId",
    gameSecret: "testGameSecret",
    gameState,
    gameOptions: {
      realtimePoints: true,
    },
  });

  game.applyGameInput({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.FOREST_ONE_PEBBLE_THREE_CARD,
    },
  });
  game.applyGameInput({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    },
  });
  game.applyGameInput({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    },
  });

  const player = game.getActivePlayer();
  const isActivePlayer = true;
  return {
    props: {
      gameJSON: game.toJSON(false /* includePrivate */),
      viewingPlayerJSON: player.toJSON(true /* includePrivate */),
      gameInputs: isActivePlayer ? game.getGameInputs() : [],
    },
  };
};

export default function TestGamePage(props: {
  gameJSON: GameJSON;
  gameInputs: GameInput[];
  viewingPlayerJSON: PlayerJSON;
}) {
  const { gameJSON, gameInputs, viewingPlayerJSON } = props;
  return (
    <Game
      gameJSON={gameJSON}
      gameInputs={gameInputs}
      viewingPlayerJSON={viewingPlayerJSON}
    />
  );
}
