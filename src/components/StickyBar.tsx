import * as React from "react";
import { GameState } from "../model/gameState";
import { Player } from "../model/player";
import { ResourceType } from "../model/types";
import styles from "../styles/Game.module.css"; // Import your Game component's styles
import {
  CardTypeList,
  OtherResources,
  PlayerName,
  ResourceList,
} from "./Players";
import { BsChevronDoubleDown } from "react-icons/bs";

export const StickyBar: React.FC<{
  playerNames: string[];
  playerResources: Record<string, Record<ResourceType, number>>;
  players: Player[];
  gameState: GameState;
}> = ({ playerNames, playerResources, players, gameState }) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const handleClick = () => {
    setIsCollapsed(!isCollapsed);
  };
  return (
    <div className={styles.stickyBarContainer}>
      <CollapseButton isCollapsed={isCollapsed} handleClick={handleClick} />
      <div
        className={`${styles.stickyBar} ${isCollapsed ? styles.hidden : ""}`}
      >
        <div className={styles.stickyBarContent}>
          {playerNames.map((name) => {
            return (
              <div key={name} className={styles.sticky_bar_item}>
                <PlayerName
                  name={name}
                  onClick={function (): void {
                    return;
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
      </div>
    </div>
  );
};

const CollapseButton: React.FC<{
  isCollapsed: boolean;
  handleClick: () => void;
}> = ({ isCollapsed, handleClick }) => {
  return (
    <div
      className={`${styles.collapseButton} ${
        isCollapsed ? styles.clicked : ""
      }`}
      onClick={handleClick}
    >
      <BsChevronDoubleDown size="48" />
    </div>
  );
};

export default StickyBar;
