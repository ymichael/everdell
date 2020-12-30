import sqlite3 from "sqlite3";
import path from "path";
import fs from "fs";
import { GameJSON } from "./jsonTypes";

const dbPath = process.env.DB_PATH;
if (!dbPath) {
  console.error(
    `Must specify DB_PATH env variable: ENV: ${JSON.stringify(
      process.env,
      null,
      2
    )}`
  );
  process.exit(-1);
}
const dbFolder = path.dirname(dbPath);

let _instance: DB | null = null;

export class DB {
  private db: sqlite3.Database;

  constructor() {
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

  static getInstance(): DB {
    if (!_instance) {
      _instance = new DB();
    }
    return _instance;
  }
}

export const getGameJSONById = async (
  gameId: string
): Promise<GameJSON | null> => {
  const db = DB.getInstance();
  await db.createGamesTableIfNotExists();
  return db.getGameJSONById(gameId);
};

export const saveGameJSONById = async (
  gameId: string,
  gameJSON: GameJSON
): Promise<void> => {
  const db = DB.getInstance();
  await db.createGamesTableIfNotExists();
  return db.saveGame(gameId, JSON.stringify(gameJSON));
};
