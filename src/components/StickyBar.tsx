import * as React from "react";
import styles from "../styles/Game.module.css"; // Import your Game component's styles
import {
  CardTypeList,
  OtherResources,
  PlayerName,
  ResourceList,
} from "./Players";
import { ResourceType } from "../model/types";
import { Player } from "../model/player";
import { GameState } from "../model/gameState";

export const StickyBar: React.FC<{
  playerNames: string[];
  playerResources: Record<string, Record<ResourceType, number>>;
  players: Player[];
  gameState: GameState;
}> = ({ playerNames, playerResources, players, gameState }) => {
  return (
    <div className={styles.stickyBar}>
      {playerNames.map((name) => {
        return (
          <div className={styles.sticky_bar_item}>
            <PlayerName
              name={name}
              onClick={function (): void {
                throw new Error("Function not implemented.");
              }}
            />
            <ResourceList playerResources={playerResources[name]} />
            <CardTypeList player={players.find((p) => p.name === name)!} />

            <OtherResources
              player={players.find((p) => p.name === name)!}
              gameState={gameState}
              showRealtimePoints={true}
            />
          </div>
        );
      })}
    </div>
  );
};

export default StickyBar;
