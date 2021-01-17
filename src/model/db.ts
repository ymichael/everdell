import path from "path";
import fs from "fs";

import sqlite3 from "sqlite3";
import { Pool } from "pg";

import { GameJSON } from "./jsonTypes";

const pgUrl = process.env.DATABASE_URL;
const usePG = !!pgUrl;
// fallback sqlite db path.
const dbPath = process.env.DB_PATH;

if (!pgUrl && !dbPath) {
  console.error("Must specify either DATABASE_URL or DB_PATH env variable.");
  process.exit(-1);
}

let _instance: IDb | null = null;

const getDbInstance = (): IDb => {
  if (!_instance) {
    if (dbPath) {
      _instance = new SqliteDb(dbPath);
    }
    if (pgUrl) {
      _instance = new PgDb(pgUrl);
    }
    if (!_instance) {
      throw new Error("Unable to instantiate DB instance.");
    }
  }
  return _instance;
};

interface IDb {
  createGamesTableIfNotExists(): Promise<void>;
  saveGame(gameId: string, gameJSON: string): Promise<void>;
  createGame(gameId: string, gameJSON: string): Promise<void>;
  updateGame(gameId: string, gameJSON: string): Promise<void>;
  hasSavedGame(gameId: string): Promise<boolean>;
  getGameJSONById(gameId: string): Promise<GameJSON | null>;
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
        games(
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
    await this.pool.query("INSERT INTO games(game_id, game) VALUES($1, $2)", [
      gameId,
      gameJSON,
    ]);
  }

  async updateGame(gameId: string, gameJSON: string): Promise<void> {
    await this.pool.query("UPDATE games SET game = $1 WHERE game_id = $2", [
      gameJSON,
      gameId,
    ]);
  }

  async hasSavedGame(gameId: string): Promise<boolean> {
    const result = await this.pool.query(
      "SELECT game_id FROM games WHERE game_id = $1",
      [gameId]
    );
    return result.rows.length === 1;
  }

  async getGameJSONById(gameId: string): Promise<GameJSON | null> {
    const result = await this.pool.query(
      "SELECT game game FROM games WHERE game_id = $1",
      [gameId]
    );
    return result.rows.length === 1 ? JSON.parse(result.rows[0].game) : null;
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
          games(
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
        "UPDATE games SET game = ? WHERE game_id = ?",
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
        "INSERT INTO games(game_id, game) VALUES(?, ?)",
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
        "SELECT game_id FROM games WHERE game_id = ?",
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
        "SELECT game game FROM games WHERE game_id = ?",
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
}

export const getGameJSONById = async (
  gameId: string
): Promise<GameJSON | null> => {
  const db = getDbInstance();
  await db.createGamesTableIfNotExists();
  return db.getGameJSONById(gameId);
};

export const saveGameJSONById = async (
  gameId: string,
  gameJSON: GameJSON
): Promise<void> => {
  const db = getDbInstance();
  await db.createGamesTableIfNotExists();
  return db.saveGame(gameId, JSON.stringify(gameJSON));
};
