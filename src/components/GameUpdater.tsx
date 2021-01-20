import * as React from "react";
import { useCallback, useRef, useEffect } from "react";
import { CardName, GameInput } from "../model/types";
import { GameJSON, PlayerJSON } from "../model/jsonTypes";

export const GameUpdaterContext = React.createContext<() => void>(() => {});

const isNotificationsSupported =
  typeof Notification !== "undefined" &&
  typeof window !== "undefined" &&
  "Notification" in window;

function checkNotificationPromise() {
  try {
    Notification.requestPermission().then();
  } catch (e) {
    return false;
  }
  return true;
}

function enableNotifications() {
  // Let's check if the browser supports notifications
  if (!isNotificationsSupported) {
    console.log("This browser does not support notifications.");
  } else {
    if (checkNotificationPromise()) {
      Notification.requestPermission().then((permission) => {});
    } else {
      Notification.requestPermission(function (permission) {});
    }
  }
}

const GameUpdater: React.FC<{
  gameId: string;
  activePlayerId: string;
  playerId: string;
  playerSecret: string;
  gameStateId: number;
  onUpdate: (responseJSON: {
    game: GameJSON;
    viewingPlayer: PlayerJSON;
    gameInputs: GameInput[];
  }) => void;
}> = ({
  children,
  gameId,
  playerId,
  playerSecret,
  activePlayerId,
  gameStateId,
  onUpdate,
}) => {
  const isFirstLoadRef = useRef(true);
  const updateGameState = useCallback(async () => {
    const queryParts = [
      `gameId=${gameId}`,
      `playerId=${playerId}`,
      `playerSecret=${playerSecret}`,
      `gameStateId=${gameStateId}`,
    ];
    const response = await fetch(`/api/game-updates?${queryParts.join("&")}`, {
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.status === 200) {
      const json = await response.json();
      onUpdate(json);
    }
  }, [children, gameId, playerId, playerSecret, gameStateId, onUpdate]);

  useEffect(() => {
    enableNotifications();

    let timer: any = null;
    if (activePlayerId !== playerId) {
      timer = setInterval(updateGameState, 2000);
    } else {
      if (!isFirstLoadRef.current) {
        try {
          if (
            isNotificationsSupported &&
            Notification.permission === "granted"
          ) {
            new Notification("🐿 Everdell", {
              body: "It's your turn!",
              icon: "/images/notif_icon.png",
            });
          }
        } catch (e) {
          // ignore
        }
      }
    }
    isFirstLoadRef.current = false;
    return () => {
      clearInterval(timer);
    };
  }, [activePlayerId]);
  return (
    <GameUpdaterContext.Provider value={updateGameState}>
      {children}
    </GameUpdaterContext.Provider>
  );
};

export default GameUpdater;
