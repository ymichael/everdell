import path from "path";
import fs from "fs";

import sqlite3 from "sqlite3";
import { Pool } from "pg";

import { GameJSON } from "./jsonTypes";

type StoreType = "pg" | "pg-deprecated" | "local";
const storeUrlForType: Record<StoreType, string | undefined> = {
  pg: process.env.DATABASE_URL_SUPABASE,
  "pg-deprecated": process.env.DATABASE_URL_SUPABASE_OLD,
  local: process.env.DB_PATH,
};
if (Object.values(storeUrlForType).filter((x) => !!x).length === 0) {
  console.error("Must specify a DB env variable.");
  process.exit(-1);
}
const _instanceCache: Record<StoreType, IDb | null> = {
  pg: null,
  "pg-deprecated": null,
  local: null,
};

const getOrCreateDbInstance = (storeType: StoreType): IDb => {
  if (!_instanceCache[storeType]) {
    switch (storeType) {
      case "local": {
        const url = storeUrlForType[storeType];
        if (url) {
          _instanceCache[storeType] = new SqliteDb(url);
        }
        break;
      }
      default: {
        const url = storeUrlForType[storeType];
        if (url) {
          _instanceCache[storeType] = new PgDb(url);
        }
        break;
      }
    }
  }
  const instance = _instanceCache[storeType];
  if (!instance) {
    throw new Error("Unable to instantiate DB instance.");
  }
  return instance;
};

const getDbInstance = (preferredOrder: StoreType[]): IDb => {
  for (let i = 0; i < preferredOrder.length; i++) {
    const storeType = preferredOrder[i];
    if (storeUrlForType[storeType]) {
      return getOrCreateDbInstance(storeType);
    }
  }
  throw new Error("Unable to instantiate DB instance.");
};

const getDbForGameId = (gameId: string): IDb => {
  return gameId.startsWith("v3:")
    ? getDbInstance(["pg", "local"])
    : getDbInstance(["pg", "local"]);
};

interface IDb {
  createGamesTableIfNotExists(): Promise<void>;
  saveGame(gameId: string, gameJSON: string): Promise<void>;
  createGame(gameId: string, gameJSON: string): Promise<void>;
  updateGame(gameId: string, gameJSON: string): Promise<void>;
  hasSavedGame(gameId: string): Promise<boolean>;
  getGameJSONById(gameId: string): Promise<GameJSON | null>;
  getGameStateIdForGame(gameId: string): Promise<string | null>;
  getAllGameIds(): Promise<string[]>;
}

class PgDb implements IDb {
  private pgUrl: string;
  private pool: Pool;

  constructor(pgUrl: string) {
    this.pgUrl = pgUrl;

    const config: any = {
      connectionString: this.pgUrl,
    };
    if (this.pgUrl.indexOf("localhost") === -1) {
      config.ssl = {
        // https://devcenter.heroku.com/articles/heroku-postgresql#connecting-in-node-js
        rejectUnauthorized: false,
      };
    }
    this.pool = new Pool(config);
  }

  async createGamesTableIfNotExists(): Promise<void> {
    await this.pool.query(
      `CREATE TABLE IF NOT EXISTS
        everdell(
          game_id varchar,
          game text,
          created_time timestamp default now(),
          PRIMARY KEY (game_id)
        )`
    );
  }

  async saveGame(gameId: string, gameJSON: string): Promise<void> {
    const hasSavedGame = await this.hasSavedGame(gameId);
    if (hasSavedGame) {
      await this.updateGame(gameId, gameJSON);
    } else {
      await this.createGame(gameId, gameJSON);
    }
  }

  async createGame(gameId: string, gameJSON: string): Promise<void> {
    await this.pool.query(
      "INSERT INTO everdell(game_id, game) VALUES($1, $2)",
      [gameId, gameJSON]
    );
  }

  async updateGame(gameId: string, gameJSON: string): Promise<void> {
    await this.pool.query("UPDATE everdell SET game = $1 WHERE game_id = $2", [
      gameJSON,
      gameId,
    ]);
  }

  async hasSavedGame(gameId: string): Promise<boolean> {
    const result = await this.pool.query(
      "SELECT game_id FROM everdell WHERE game_id = $1",
      [gameId]
    );
    return result.rows.length === 1;
  }

  async getGameStateIdForGame(gameId: string): Promise<string | null> {
    const result = await this.pool.query(
      "SELECT json_extract_path_text(game::json, 'gameState', 'gameStateId') as state_id FROM everdell WHERE game_id = $1",
      [gameId]
    );
    return result.rows.length === 1 ? result.rows[0].state_id : null;
  }

  async getGameJSONById(gameId: string): Promise<GameJSON | null> {
    const result = await this.pool.query(
      "SELECT game game FROM everdell WHERE game_id = $1",
      [gameId]
    );
    return result.rows.length === 1 ? JSON.parse(result.rows[0].game) : null;
  }

  async getAllGameIds(): Promise<string[]> {
    const result = await this.pool.query(
      "SELECT game_id game_id FROM everdell"
    );
    return result.rows.map((x) => x.game_id);
  }
}

class SqliteDb implements IDb {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    const dbFolder = path.dirname(dbPath);
    if (!fs.existsSync(dbFolder)) {
      fs.mkdirSync(dbFolder);
    }
    this.db = new sqlite3.Database(dbPath as string);
  }

  createGamesTableIfNotExists(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `CREATE TABLE IF NOT EXISTS
          everdell(
            game_id varchar,
            game text,
            created_time timestamp default (strftime('%s', 'now')
          ),
          PRIMARY KEY (game_id))`,
        (err: { message: any }) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  async saveGame(gameId: string, gameJSON: string): Promise<void> {
    const hasSavedGame = await this.hasSavedGame(gameId);
    if (hasSavedGame) {
      await this.updateGame(gameId, gameJSON);
    } else {
      await this.createGame(gameId, gameJSON);
    }
  }

  updateGame(gameId: string, gameJSON: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "UPDATE everdell SET game = ? WHERE game_id = ?",
        [gameJSON, gameId],
        (err: { message: any }) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  createGame(gameId: string, gameJSON: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        "INSERT INTO everdell(game_id, game) VALUES(?, ?)",
        [gameId, gameJSON],
        (err: { message: any }) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
  }

  hasSavedGame(gameId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT game_id FROM everdell WHERE game_id = ?",
        [gameId],
        (err: { message: any }, row: { game_id: string }) => {
          if (err) {
            reject(err);
          } else if (row?.game_id) {
            resolve(true);
          } else {
            resolve(false);
          }
        }
      );
    });
  }

  getGameJSONById(gameId: string): Promise<GameJSON | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT game game FROM everdell WHERE game_id = ?",
        [gameId],
        (err: { message: any }, row: { game: string }) => {
          if (err) {
            reject(err);
          } else if (row?.game) {
            resolve(JSON.parse(row.game));
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async getGameStateIdForGame(gameId: string): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.db.get(
        "SELECT game FROM everdell WHERE game_id = ?",
        [gameId],
        (err: { message: any }, row: { game: string }) => {
          if (err) {
            reject(err);
          } else if (row?.game) {
            const gameJSON = JSON.parse(row.game);
            resolve(gameJSON.gameStateId || null);
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  async getAllGameIds(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      this.db.all(
        "SELECT game_id game_id FROM everdell",
        (err: { message: any }, rows: { game_id: string }[]) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows.map((x) => x.game_id));
          }
        }
      );
    });
  }
}

export const getGameJSONById = async (
  gameId: string
): Promise<GameJSON | null> => {
  const db = getDbForGameId(gameId);
  await db.createGamesTableIfNotExists();
  return db.getGameJSONById(gameId);
};

export const getGameStateIdForGame = async (
  gameId: string
): Promise<string | null> => {
  const db = getDbForGameId(gameId);
  await db.createGamesTableIfNotExists();
  return db.getGameStateIdForGame(gameId);
};

// Unused
// export const getAllGameIds = async (): Promise<string[]> => {
//   const db = getDb();
//   await db.createGamesTableIfNotExists();
//   return db.getAllGameIds();
// };

export const saveGameJSONById = async (
  gameId: string,
  gameJSON: GameJSON
): Promise<void> => {
  const db = getDbForGameId(gameId);
  await db.createGamesTableIfNotExists();
  return db.saveGame(gameId, JSON.stringify(gameJSON));
};
