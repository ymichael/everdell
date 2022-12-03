import { GetServerSideProps } from "next";

import { GameJSON } from "../../model/jsonTypes";
import {
  AdornmentName,
  CardName,
  EventName,
  GameInput,
  GameInputType,
  LocationName,
  ResourceType,
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
  gameState.players.forEach((player, idx) => {
    player.nextSeason();

    player.drawCards(gameState, idx);
    player.addCardToHand(gameState, CardName.RANGER);
    player.addCardToHand(gameState, CardName.FOOL);
    player.addCardToHand(gameState, CardName.INNKEEPER);
    player.addCardToHand(gameState, CardName.WANDERER);
    player.addCardToHand(gameState, CardName.STOREHOUSE);
    player.addCardToHand(gameState, CardName.KING);
    player.addCardToHand(gameState, CardName.POSTAL_PIGEON);
    player.addCardToHand(gameState, CardName.BARD);
    player.addCardToHand(gameState, CardName.MINER_MOLE);
    player.addCardToHand(gameState, CardName.CHIP_SWEEP);

    player.addAdornmentCardToHand(AdornmentName.BELL);
    player.addAdornmentCardToHand(AdornmentName.SPYGLASS);

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
      gameJSON: game.toJSON(true /* includePrivate */),
    },
  };
};

export default function TestGameInputPage(props: { gameJSON: GameJSON }) {
  const { gameJSON } = props;
  const { gameState: gameStateJSON } = gameJSON;
  const gameState = GameState.fromJSON(gameStateJSON);

  const gameStatePlacedWorkers = gameState.clone();
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

  const gameStateSelectLocation = gameState.next({
    inputType: GameInputType.VISIT_DESTINATION_CARD,
    clientOptions: {
      playedCard: gameState
        .getActivePlayer()
        .getFirstPlayedCard(CardName.LOOKOUT),
    },
  });

  const gameStateSelectResources = gameState.next({
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

  let gameStatePaymentForCard = gameState.next({
    inputType: GameInputType.VISIT_DESTINATION_CARD,
    clientOptions: {
      playedCard: gameState.getActivePlayer().getFirstPlayedCard(CardName.INN),
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

  let gameStateCourthouse = gameState.clone();
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
        gameState={gameState}
        gameInputs={[]}
        viewingPlayer={gameState.players[1]}
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
          inputType: GameInputType.PLACE_AMBASSADOR,
          clientOptions: {
            loc: null,
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
              gameState={gameState}
              gameInputs={[gameInput as GameInput]}
              viewingPlayer={gameState.players[0]}
            />
            <hr />
          </div>
        );
      })}
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateSelectLocation}
        gameInputs={gameStateSelectLocation.pendingGameInputs}
        viewingPlayer={gameStateSelectLocation.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateSelectResources}
        gameInputs={gameStateSelectResources.pendingGameInputs}
        viewingPlayer={gameStateSelectResources.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStatePaymentForCard}
        gameInputs={gameStatePaymentForCard.pendingGameInputs}
        viewingPlayer={gameStatePaymentForCard.players[0]}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateSelectCardsFromMeadow}
        gameInputs={gameStateSelectCardsFromMeadow.pendingGameInputs}
        viewingPlayer={gameStateSelectCardsFromMeadow.getActivePlayer()}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateMultiplePending}
        gameInputs={gameStateMultiplePending.pendingGameInputs}
        viewingPlayer={gameStateMultiplePending.getActivePlayer()}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateClocktower}
        gameInputs={gameStateClocktower.pendingGameInputs}
        viewingPlayer={gameStateClocktower.getActivePlayer()}
      />
      <hr />
      <GameInputBox
        gameId={"testGameId"}
        gameState={gameStateCourthouse}
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
        let gameStateX = gameState.clone();
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
              gameState={gameStateX}
              gameInputs={gameStateX.pendingGameInputs}
              viewingPlayer={gameStateX.getActivePlayer()}
            />
          </div>
        );
      })}
    </>
  );
}
