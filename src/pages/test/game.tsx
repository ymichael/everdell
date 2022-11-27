import { GetServerSideProps } from "next";

import { GameJSON, PlayerJSON } from "../../model/jsonTypes";
import {
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
  });
  gameState.players.forEach((player, idx) => {
    for (let i = 0; i < idx; i++) {
      player.nextSeason();
    }

    player.drawCards(gameState, idx);
    player.cardsInHand.push(CardName.RANGER);
    player.cardsInHand.push(CardName.BARD);

    player.gainResources(gameState, {
      [ResourceType.VP]: 12,
      [ResourceType.TWIG]: 4,
      [ResourceType.BERRY]: 7,
      [ResourceType.PEBBLE]: 3,
      [ResourceType.RESIN]: 6,
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

    player.placeWorkerOnCard(
      gameState,
      player.getFirstPlayedCard(CardName.UNIVERSITY)
    );
  });

  gameState.locationsMap[LocationName.FOREST_TWO_WILD] = [];
  gameState.locationsMap[LocationName.FOREST_ONE_PEBBLE_THREE_CARD] = [];
  gameState.locationsMap[
    LocationName.FOREST_DISCARD_ANY_THEN_DRAW_TWO_PER_CARD
  ] = [];

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
  // game.applyGameInput({
  //   inputType: GameInputType.VISIT_DESTINATION_CARD,
  //   clientOptions: {
  //     playedCard: game.getActivePlayer().getFirstPlayedCard(CardName.INN),
  //   },
  // });
  // game.applyGameInput({
  //   inputType: GameInputType.PLAY_CARD,
  //   clientOptions: {
  //     card: CardName.RANGER,
  //     source: "HAND",
  //     paymentOptions: {
  //       resources: { [ResourceType.BERRY]: 2 },
  //     },
  //   },
  // });
  // game.applyGameInput({
  //   inputType: GameInputType.PLAY_CARD,
  //   clientOptions: {
  //     card: CardName.BARD,
  //     source: "HAND",
  //     paymentOptions: {
  //       resources: { [ResourceType.BERRY]: 3 },
  //     },
  //   },
  // });
  game.applyGameInput({
    inputType: GameInputType.CLAIM_EVENT,
    clientOptions: {
      event: EventName.BASIC_THREE_GOVERNANCE,
    },
  });

  const player = game.getActivePlayer();
  const isActivePlayer = true;
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
