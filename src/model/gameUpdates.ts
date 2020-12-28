import mitt from "mitt";

const emitter = mitt();

export const onGameUpdate = (gameId: string, cb: () => void): void => {
  emitter.on(`gameUpdate:${gameId}`, cb);
};

export const offGameUpdate = (gameId: string, cb: () => void): void => {
  emitter.off(`gameUpdate:${gameId}`, cb);
};

export const emitGameUpdate = (gameId: string): void => {
  emitter.emit(`gameUpdate:${gameId}`);
};
