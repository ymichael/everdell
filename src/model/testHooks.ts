import fs from "fs";
import uniqBy from "lodash/uniqBy";
import { GameState, gameTextToDebugStr } from "./gameState";
import { toGameText } from "./gameText";
import { GameText } from "./types";

// If specified, we dump the game logs into a local file.
const shouldDumpGameLogs = process.env.DUMP_GAME_LOGS;

let origAddGameLog: any;
const gameTextArr: GameText[] = [];

export const mochaHooks = {
  beforeAll() {
    if (shouldDumpGameLogs) {
      origAddGameLog = GameState.prototype.addGameLog;
      GameState.prototype.addGameLog = function (...args) {
        gameTextArr.push(toGameText(...args));
        return origAddGameLog.call(this, ...args);
      };
    }
  },

  afterAll() {
    if (shouldDumpGameLogs) {
      GameState.prototype.addGameLog = origAddGameLog;
      fs.writeFileSync(
        "./src/pages/test/logs.json",
        JSON.stringify(uniqBy(gameTextArr, gameTextToDebugStr), null, 2)
      );
    }
  },
};
