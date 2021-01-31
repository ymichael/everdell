import * as React from "react";
import { Player } from "../model/player";
import styles from "../styles/ViewerUI.module.css";

import { ItemWrapper, GameBlock } from "./common";
import { PlayerCity } from "./gameBoard";
import Card from "./Card";
import Adornment from "./Adornment";

const ViewerUI: React.FC<{
  player: Player;
}> = ({ player }) => {
  return (
    <>
      <GameBlock title={"Your hand"}>
        <div id={"js-player-hand"} className={styles.cards}>
          {player.cardsInHand.map((cardName, idx) => (
            <ItemWrapper key={`card=${idx}`}>
              <Card name={cardName} />
            </ItemWrapper>
          ))}
          {player.adornmentsInHand.map((name, idx) => (
            <Adornment key={`adornment-${idx}`} name={name} />
          ))}
        </div>
      </GameBlock>
      <GameBlock title={"Your City"}>
        <PlayerCity player={player} viewerId={player.playerId} />
      </GameBlock>
    </>
  );
};

export default ViewerUI;
