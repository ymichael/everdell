/**
 * @type {Cypress.PluginConfig}
 */
import {
  AdornmentName,
  CardName,
  ResourceType,
  RiverDestinationSpotName,
} from "../../src/model/types";
import { GameJSON } from "../../src/model/jsonTypes";
import { Card } from "../../src/model/card";
import { GameState } from "../../src/model/gameState";
import { Player } from "../../src/model/player";
import { createGameFromGameState } from "../../src/model/game";
import { testInitialGameState } from "../../src/model/testHelpers";

async function getTestGameJSON(
  args: Parameters<typeof testInitialGameState>[0] = {},
  gameStateMutationFn = (gameState: GameState, player: Player) => {}
): Promise<GameJSON> {
  const gameState = testInitialGameState({
    ...args,
    playerNames: ["Michael", "Elynn"],
  });
  gameStateMutationFn(gameState, gameState.getActivePlayer());
  const game = await createGameFromGameState(gameState);
  return game.toJSON(true);
}

module.exports = (on: any, config: any) => {
  on("task", {
    "db:basic-game": async () => {
      return await getTestGameJSON();
    },
    "db:play-card-game": async () => {
      return await getTestGameJSON({}, (gameState) => {
        const card = Card.fromName(CardName.MINE);
        gameState.players.forEach((player) => {
          player.cardsInHand.push(card.name);
          player.gainResources(gameState, card.baseCost);
        });
      });
    },
    "db:claim-event-game": async () => {
      return await getTestGameJSON({}, (gameState, player) => {
        player.addToCity(gameState, CardName.MINE);
        player.addToCity(gameState, CardName.MINE);
        player.addToCity(gameState, CardName.FARM);
        player.addToCity(gameState, CardName.FARM);

        player.addToCity(gameState, CardName.WANDERER);
        player.addToCity(gameState, CardName.WANDERER);
        player.addToCity(gameState, CardName.WANDERER);
      });
    },
    "db:play-adornment-game": async () => {
      return await getTestGameJSON(
        { gameOptions: { pearlbrook: true } },
        (gameState, player) => {
          player.gainResources(gameState, { [ResourceType.PEARL]: 1 });
          player.adornmentsInHand.push(AdornmentName.BELL);
          player.adornmentsInHand.push(AdornmentName.SPYGLASS);
        }
      );
    },
    "db:place-ambassador-game": async () => {
      return await getTestGameJSON(
        { gameOptions: { pearlbrook: true } },
        (gameState, player) => {
          player.addToCity(gameState, CardName.WANDERER);
          player.addToCity(gameState, CardName.RANGER);

          player.addToCity(gameState, CardName.FARM);
          player.addToCity(gameState, CardName.FARM);
          player.addToCity(gameState, CardName.FARM);

          gameState.riverDestinationMap!.revealSpot(
            RiverDestinationSpotName.TWO_GOVERNANCE
          );

          gameState.players[1].addToCity(gameState, CardName.FERRY);
        }
      );
    },
    "db:select-played-card-game": async () => {
      return await getTestGameJSON({}, (gameState, player) => {
        const player2 = gameState.players[1];
        player2.addToCity(gameState, CardName.GENERAL_STORE);
        player2.addToCity(gameState, CardName.FARM);

        const card = Card.fromName(CardName.MINER_MOLE);
        player.gainResources(gameState, card.baseCost);
        player.cardsInHand.push(card.name);
      });
    },
    "db:visit-destination-game": async () => {
      return await getTestGameJSON({}, (gameState, player) => {
        // Visit Inn
        player.addToCity(gameState, CardName.INN);

        // To reveal after we play a card from the Meadow
        gameState.deck.addToStack(CardName.DOCTOR);

        gameState.meadowCards.push(
          CardName.KING,
          CardName.QUEEN,
          CardName.POSTAL_PIGEON,
          CardName.POSTAL_PIGEON,
          CardName.FARM,
          CardName.HUSBAND,
          CardName.CHAPEL,
          CardName.MONK
        );
      });
    },
  });
};
