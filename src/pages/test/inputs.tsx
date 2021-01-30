import { GetServerSideProps } from "next";

import { GameJSON } from "../../model/jsonTypes";
import {
  AdornmentName,
  CardName,
  LocationName,
  ResourceType,
  GameInputType,
  GameInput,
} from "../../model/types";
import { Game as GameModel } from "../../model/game";
import { Card } from "../../model/card";
import { GameState } from "../../model/gameState";
import GameInputBox from "../../components/GameInputBox";

import { testInitialGameState } from "../../model/testHelpers";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const playerNames = ["Michael", "Elynn", "Chris", "Vanessa"];
  const numPlayers = playerNames.length;
  const gameState = testInitialGameState({
    numPlayers,
    playerNames,
    noForestLocations: true,
    noSpecialEvents: false,
    shuffleDeck: true,
    gameOptions: {
      pearlbrook: true,
    },
  });
  gameState.players.forEach((player, idx) => {
    player.nextSeason();

    player.drawCards(gameState, idx);
    player.cardsInHand.push(CardName.RANGER);
    player.cardsInHand.push(CardName.FOOL);
    player.cardsInHand.push(CardName.INNKEEPER);
    player.cardsInHand.push(CardName.WANDERER);
    player.cardsInHand.push(CardName.STOREHOUSE);
    player.cardsInHand.push(CardName.KING);
    player.cardsInHand.push(CardName.POSTAL_PIGEON);
    player.cardsInHand.push(CardName.BARD);
    player.cardsInHand.push(CardName.MINER_MOLE);
    player.cardsInHand.push(CardName.CHIP_SWEEP);

    player.adornmentsInHand.push(AdornmentName.BELL);
    player.adornmentsInHand.push(AdornmentName.SPYGLASS);

    player.gainResources(gameState, {
      [ResourceType.VP]: 12,
      [ResourceType.PEARL]: 2,
      [ResourceType.TWIG]: 4,
      [ResourceType.BERRY]: 7,
      [ResourceType.PEBBLE]: 3,
      [ResourceType.RESIN]: 6,
    });

    // City
    player.addToCity(gameState, CardName.UNIVERSITY);
    player.addToCity(gameState, CardName.DUNGEON);
    player.addToCity(gameState, CardName.WANDERER);
    player.addToCity(gameState, CardName.HUSBAND);
    player.addToCity(gameState, CardName.RESIN_REFINERY);
    player.addToCity(gameState, CardName.INN);
    player.addToCity(gameState, CardName.WIFE);
    player.addToCity(gameState, CardName.QUEEN);
    player.addToCity(gameState, CardName.LOOKOUT);
    player.addToCity(gameState, CardName.CHIP_SWEEP);
    player.addToCity(gameState, CardName.MINER_MOLE);

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
    CardName.KING,
    CardName.KING,
    CardName.MINE,
    CardName.MINER_MOLE,
    CardName.FARM,
    CardName.RANGER,
    CardName.WIFE,
    CardName.CHIP_SWEEP
  );

  const game = new GameModel({
    gameId: "testGameId",
    gameSecret: "testGameSecret",
    gameState,
  });

  return {
    props: {
      game: game.toJSON(true /* includePrivate */),
    },
  };
};

export default function TestGameInputPage(props: { game: GameJSON }) {
  const { game } = props;
  const { gameState } = game;
  const gameStateImpl = GameState.fromJSON(gameState);

  const gameStatePlacedWorkers = gameStateImpl.clone();
  gameStatePlacedWorkers.locationsMap[
    LocationName.BASIC_TWO_CARDS_AND_ONE_VP
  ] = [
    gameStatePlacedWorkers.getActivePlayer().playerId,
    gameStatePlacedWorkers.getActivePlayer().playerId,
  ];
  gameStatePlacedWorkers
    .getActivePlayer()
    .placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
  gameStatePlacedWorkers
    .getActivePlayer()
    .placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);

  const gameStateSelectLocation = gameStateImpl.next({
    inputType: GameInputType.VISIT_DESTINATION_CARD,
    clientOptions: {
      playedCard: gameStateImpl
        .getActivePlayer()
        .getFirstPlayedCard(CardName.LOOKOUT),
    },
  });

  const gameStateSelectResources = gameStateImpl.next({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.FOREST_TWO_WILD,
    },
  });

  let gameStateClocktower = gameStatePlacedWorkers.clone();
  gameStateClocktower
    .getActivePlayer()
    .addToCity(gameStateClocktower, CardName.CLOCK_TOWER);
  gameStateClocktower = gameStateClocktower.next({
    inputType: GameInputType.PREPARE_FOR_SEASON,
  });

  const gameStateSelectCardsFromMeadow = gameStatePlacedWorkers.next({
    inputType: GameInputType.PREPARE_FOR_SEASON,
  });

  let gameStatePaymentForCard = gameStateImpl.next({
    inputType: GameInputType.VISIT_DESTINATION_CARD,
    clientOptions: {
      playedCard: gameStateImpl
        .getActivePlayer()
        .getFirstPlayedCard(CardName.INN),
    },
  });
  gameStatePaymentForCard = gameStatePaymentForCard.next({
    inputType: GameInputType.SELECT_CARDS,
    prevInputType: GameInputType.VISIT_DESTINATION_CARD,
    cardContext: CardName.INN,
    cardOptions: gameStatePaymentForCard.meadowCards,
    maxToSelect: 1,
    minToSelect: 1,
    clientOptions: {
      selectedCards: [CardName.KING],
    },
  });

  let gameStateMultiplePending = gameStatePlacedWorkers.clone();
  gameStateMultiplePending.getActivePlayer().nextSeason();
  gameStateMultiplePending.locationsMap[
    LocationName.BASIC_TWO_CARDS_AND_ONE_VP
  ]!.push(gameStateMultiplePending.getActivePlayer().playerId);
  gameStateMultiplePending
    .getActivePlayer()
    .placeWorkerOnLocation(LocationName.BASIC_TWO_CARDS_AND_ONE_VP);
  gameStateMultiplePending = gameStateMultiplePending.next({
    inputType: GameInputType.PREPARE_FOR_SEASON,
  });

  let gameStateCourthouse = gameStateImpl.clone();
  gameStateCourthouse
    .getActivePlayer()
    .addToCity(gameStateCourthouse, CardName.COURTHOUSE);
  gameStateCourthouse.getActivePlayer().cardsInHand.push(CardName.FAIRGROUNDS);
  gameStateCourthouse = gameStateCourthouse.next({
    inputType: GameInputType.PLAY_CARD,
    clientOptions: {
      card: CardName.FAIRGROUNDS,
      fromMeadow: false,
      paymentOptions: {
        resources: {
          [ResourceType.TWIG]: 1,
          [ResourceType.RESIN]: 2,
          [ResourceType.PEBBLE]: 1,
        },
      },
    },
  });

  return (
    <>
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateImpl.toJSON(true)}
        gameInputs={[]}
        viewingPlayer={gameStateImpl.players[1]}
      />
      <hr />
      {[
        {
          inputType: GameInputType.PREPARE_FOR_SEASON,
        },
        {
          inputType: GameInputType.GAME_END,
        },
        {
          inputType: GameInputType.PLAY_CARD,
          clientOptions: {
            card: null,
            fromMeadow: false,
            paymentOptions: { resources: {} },
          },
        },
        {
          inputType: GameInputType.PLACE_WORKER,
          clientOptions: {
            location: null,
          },
        },
        {
          inputType: GameInputType.PLAY_ADORNMENT,
          clientOptions: {
            adornment: null,
          },
        },
        {
          inputType: GameInputType.CLAIM_EVENT,
          clientOptions: {
            event: null,
          },
        },
        {
          inputType: GameInputType.VISIT_DESTINATION_CARD,
          clientOptions: {
            playedCard: null,
          },
        },
      ].map((gameInput, idx) => {
        return (
          <div key={idx}>
            <GameInputBox
              gameId={"testGameId"}
              gameState={gameStateImpl.toJSON(true)}
              gameInputs={[gameInput as GameInput]}
              viewingPlayer={gameStateImpl.players[0]}
            />
            <hr />
          </div>
        );
      })}
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateSelectLocation.toJSON(true)}
        gameInputs={gameStateSelectLocation.pendingGameInputs}
        viewingPlayer={gameStateSelectLocation.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateSelectResources.toJSON(true)}
        gameInputs={gameStateSelectResources.pendingGameInputs}
        viewingPlayer={gameStateSelectResources.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStatePaymentForCard.toJSON(true)}
        gameInputs={gameStatePaymentForCard.pendingGameInputs}
        viewingPlayer={gameStatePaymentForCard.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateSelectCardsFromMeadow.toJSON(true)}
        gameInputs={gameStateSelectCardsFromMeadow.pendingGameInputs}
        viewingPlayer={gameStateSelectCardsFromMeadow.getActivePlayer()}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateMultiplePending.toJSON(true)}
        gameInputs={gameStateMultiplePending.pendingGameInputs}
        viewingPlayer={gameStateMultiplePending.getActivePlayer()}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateClocktower.toJSON(true)}
        gameInputs={gameStateClocktower.pendingGameInputs}
        viewingPlayer={gameStateClocktower.getActivePlayer()}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateCourthouse.toJSON(true)}
        gameInputs={gameStateCourthouse.pendingGameInputs}
        viewingPlayer={gameStateCourthouse.getActivePlayer()}
      />
      {[
        CardName.CHIP_SWEEP,
        CardName.POSTAL_PIGEON,
        CardName.MINER_MOLE,
        CardName.FOOL,
        CardName.RANGER,
        CardName.BARD,
        CardName.STOREHOUSE,
        CardName.MONK,
        CardName.TEACHER,
        CardName.DOCTOR,
        CardName.PEDDLER,
        CardName.WOODCARVER,
      ].map((cardName) => {
        let gameStateX = gameStateImpl.clone();
        const card = Card.fromName(cardName);
        gameStateX.getActivePlayer().cardsInHand.push(cardName);
        gameStateX = gameStateX.next({
          inputType: GameInputType.PLAY_CARD,
          clientOptions: {
            card: card.name,
            fromMeadow: false,
            paymentOptions: {
              resources: card.baseCost,
            },
          },
        });
        return (
          <div key={cardName}>
            <hr />
            <GameInputBox
              gameId={"testGameId"}
              gameState={gameStateX.toJSON(true)}
              gameInputs={gameStateX.pendingGameInputs}
              viewingPlayer={gameStateX.getActivePlayer()}
            />
          </div>
        );
      })}
    </>
  );
}
