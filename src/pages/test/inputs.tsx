import { GetServerSideProps } from "next";

import { GameJSON, GameStateJSON, PlayerJSON } from "../../model/jsonTypes";
import {
  CardName,
  LocationName,
  ResourceType,
  EventName,
  GameInputType,
} from "../../model/types";
import { Game as GameModel } from "../../model/game";
import { GameState } from "../../model/gameState";
import GameInputBox from "../../components/GameInputBox";

import { testInitialGameState } from "../../model/testHelpers";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const playerNames = ["Michael", "Elynn"];
  const numPlayers = playerNames.length;
  let gameState = testInitialGameState({
    numPlayers,
    playerNames,
    noForestLocations: true,
    noSpecialEvents: false,
    shuffleDeck: true,
  });
  gameState.players.forEach((player, idx) => {
    player.nextSeason();
    player.nextSeason();

    player.drawCards(gameState, idx);
    player.cardsInHand.push(CardName.RANGER);
    player.cardsInHand.push(CardName.BARD);

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
    player.addToCity(CardName.INN);
    player.addToCity(CardName.FARM);
    player.addToCity(CardName.MINE);
    player.addToCity(CardName.QUEEN);
    player.addToCity(CardName.LOOKOUT);
    player.addToCity(CardName.CLOCK_TOWER);

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

  gameState.meadowCards.push(
    CardName.FARM,
    CardName.FARM,
    CardName.FARM,
    CardName.FARM,
    CardName.FARM,
    CardName.FARM,
    CardName.FARM,
    CardName.FARM
  );

  const game = new GameModel({
    gameId: "testGameId",
    gameSecret: "testGameSecret",
    gameState,
  });

  const player = game.getActivePlayer();
  const isActivePlayer = true;
  return {
    props: {
      game: game.toJSON(false /* includePrivate */),
      viewingPlayer: player.toJSON(true /* includePrivate */),
    },
  };
};

export default function TestGameInputPage(props: {
  game: GameJSON;
  viewingPlayer: PlayerJSON;
}) {
  const { game, viewingPlayer } = props;
  const { gameId, gameState } = game;
  gameState.players = gameState.players.map((player) => {
    if (player.playerId === viewingPlayer.playerId) {
      return viewingPlayer;
    } else {
      return player;
    }
  });

  const gameStateImpl = GameState.fromJSON(gameState);
  const gameState1 = gameStateImpl.clone();

  const gameState2 = gameStateImpl.clone();

  return (
    <>
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState1.toJSON(true)}
        gameInputs={[]}
        viewingPlayer={gameState1.players[1]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState2.toJSON(true)}
        gameInputs={[
          {
            inputType: GameInputType.PLAY_CARD,
            clientOptions: {
              card: null,
              fromMeadow: false,
              paymentOptions: { resources: {} },
            },
          },
        ]}
        viewingPlayer={gameState2.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState2.toJSON(true)}
        gameInputs={[
          {
            inputType: GameInputType.PLACE_WORKER,
            clientOptions: {
              location: null,
            },
          },
        ]}
        viewingPlayer={gameState2.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState2.toJSON(true)}
        gameInputs={[
          {
            inputType: GameInputType.CLAIM_EVENT,
            clientOptions: {
              event: null,
            },
          },
        ]}
        viewingPlayer={gameState2.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameState2.toJSON(true)}
        gameInputs={[
          {
            inputType: GameInputType.VISIT_DESTINATION_CARD,
            clientOptions: {
              playedCard: null,
            },
          },
        ]}
        viewingPlayer={gameState2.players[0]}
      />
    </>
  );
}
