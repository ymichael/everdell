// TODO
const store: any = {};

const get = async (id: string): Promise<object> => {
  return store[id];
};

const set = async (id: string, obj: object): Promise<void> => {
  store[id] = obj;
};

export const getGameJSONById = (
  gameId: string
): Promise<object | undefined> => {
  return get(`game:${gameId}`);
};

export const saveGameJSONById = async (
  gameId: string,
  gameJSON: object
): Promise<void> => {
  await set(`game:${gameId}`, gameJSON);
};
