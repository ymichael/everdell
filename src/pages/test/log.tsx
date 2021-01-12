import { GetServerSideProps } from "next";

import { GameStateJSON } from "../../model/jsonTypes";
import {
  CardName,
  LocationName,
  ResourceType,
  EventName,
  GameInputType,
} from "../../model/types";
import { GameState } from "../../model/gameState";
import GameLog from "../../components/GameLog";

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

  gameState = gameState.next({
    inputType: GameInputType.CLAIM_EVENT,
    clientOptions: {
      event: EventName.BASIC_FOUR_PRODUCTION,
    },
  });
  gameState = gameState.next({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.FOREST_ONE_PEBBLE_THREE_CARD,
    },
  });
  gameState = gameState.next({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    },
  });
  gameState = gameState.next({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    },
  });
  gameState = gameState.next({
    inputType: GameInputType.VISIT_DESTINATION_CARD,
    clientOptions: {
      playedCard: gameState.getActivePlayer().getFirstPlayedCard(CardName.INN),
    },
  });
  gameState = gameState.next({
    inputType: GameInputType.SELECT_CARDS,
    prevInputType: GameInputType.VISIT_DESTINATION_CARD,
    cardContext: CardName.INN,
    cardOptions: gameState.meadowCards,
    maxToSelect: 1,
    minToSelect: 1,
    clientOptions: {
      selectedCards: [CardName.FARM],
    },
  });

  gameState = gameState.next({
    inputType: GameInputType.PLAY_CARD,
    clientOptions: {
      card: CardName.RANGER,
      fromMeadow: false,
      paymentOptions: {
        resources: { [ResourceType.BERRY]: 2 },
      },
    },
  });
  const recallWorkerInput = {
    inputType: GameInputType.SELECT_WORKER_PLACEMENT as const,
    prevInputType: GameInputType.PLAY_CARD,
    options: [
      {
        playedCard: gameState
          .getActivePlayer()
          .getFirstPlayedCard(CardName.UNIVERSITY),
      },
      {
        location: LocationName.FOREST_ONE_PEBBLE_THREE_CARD,
      },
      {
        location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
      },
    ],
    cardContext: CardName.RANGER,
    mustSelectOne: true,
    clientOptions: {
      selectedOption: {
        location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
      },
    },
  };
  gameState = gameState.next(recallWorkerInput);
  gameState = gameState.next({
    inputType: GameInputType.SELECT_WORKER_PLACEMENT,
    prevInputType: GameInputType.SELECT_WORKER_PLACEMENT,
    prevInput: recallWorkerInput,
    cardContext: CardName.RANGER,
    mustSelectOne: true,
    options: [
      ...gameState.getPlayableLocations().map((location) => ({ location })),

      ...gameState.getClaimableEvents().map((event) => ({ event })),

      ...gameState
        .getVisitableDestinationCards()
        .map((playedCard) => ({ playedCard })),
    ],
    clientOptions: {
      selectedOption: {
        location: LocationName.BASIC_TWO_TWIGS_AND_ONE_CARD,
      },
    },
  });

  gameState = gameState.next({
    inputType: GameInputType.PLAY_CARD,
    clientOptions: {
      card: CardName.BARD,
      fromMeadow: false,
      paymentOptions: {
        resources: { [ResourceType.BERRY]: 3 },
      },
    },
  });

  gameState = gameState.next({
    inputType: GameInputType.DISCARD_CARDS,
    prevInputType: GameInputType.PLAY_CARD,
    minCards: 0,
    maxCards: 5,
    cardContext: CardName.BARD,
    clientOptions: {
      cardsToDiscard: gameState.getActivePlayer().cardsInHand.slice(0, 2),
    },
  });
  gameState = gameState.next({
    inputType: GameInputType.PLACE_WORKER,
    clientOptions: {
      location: LocationName.BASIC_TWO_CARDS_AND_ONE_VP,
    },
  });
  gameState = gameState.next({
    inputType: GameInputType.PREPARE_FOR_SEASON,
  });

  return {
    props: {
      gameState: gameState.toJSON(false /* includePrivate */),
    },
  };
};

export default function TestGameLogPage(props: { gameState: GameStateJSON }) {
  const { gameState } = props;
  return <GameLog logs={gameState.gameLog} fixedHeight={false} />;
}
