import * as React from "react";
import { Player } from "../model/player";
import styles from "../styles/ViewerUI.module.css";

import { GameBlock } from "./common";
import Card, { PlayedCard } from "./Card";

const ViewerUI: React.FC<{
  player: Player;
}> = ({ player }) => {
  return (
    <>
      <GameBlock title={"Your hand"}>
        <div className={styles.cards}>
          {player.cardsInHand.map((cardName, idx) => (
            <Card key={idx} name={cardName} />
          ))}
        </div>
      </GameBlock>
      <GameBlock title={"Your City"}>
        <div className={styles.cards}>
          {player.getAllPlayedCards().map((playedCard, idx) => (
            <PlayedCard
              key={idx}
              playedCard={playedCard}
              viewerId={player.playerId}
            />
          ))}
        </div>
      </GameBlock>
    </>
  );
};

export default ViewerUI;
