import * as React from "react";
import { CardName, ResourceType } from "../model/types";
import { Player } from "../model/player";

const PlayerStatus: React.FC<{
  player: any;
  isViewer: boolean;
  isActivePlayer: boolean;
}> = ({ player, isViewer, isActivePlayer }) => {
  player = Player.fromJSON(player);
  return (
    <div>
      <h3>
        {player.name} {isViewer ? "(you)" : ""}{" "}
        {isActivePlayer ? "[active]" : ""}
      </h3>
      <ul>
        <li>numWorkers: {player.numWorkers}</li>
        <li>numAvailableWorkers: {player.numAvailableWorkers}</li>
      </ul>
      {isViewer && (
        <p>
          <h4>Cards in hand</h4>
          <ul>
            {player.cardsInHand.map((cardName: CardName, idx: number) => (
              <li key={idx}>{cardName}</li>
            ))}
          </ul>
        </p>
      )}
      <p>
        <h4>Resources:</h4>
        <ul>
          <li>
            {ResourceType.TWIG}: {player.getNumResource(ResourceType.TWIG)}
          </li>
          <li>
            {ResourceType.RESIN}: {player.getNumResource(ResourceType.RESIN)}
          </li>
          <li>
            {ResourceType.BERRY}: {player.getNumResource(ResourceType.BERRY)}
          </li>
          <li>
            {ResourceType.PEBBLE}: {player.getNumResource(ResourceType.PEBBLE)}
          </li>
          <li>
            {ResourceType.VP}: {player.getNumResource(ResourceType.VP)}
          </li>
        </ul>
      </p>
    </div>
  );
};

export default PlayerStatus;
