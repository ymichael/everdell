import fs from "fs";
import uniqBy from "lodash/uniqBy";
import { GameState, gameTextToDebugStr } from "./gameState";
import { toGameText } from "./gameText";
import { GameText, GameInputMultiStep } from "./types";

// If specified, we dump the game test data into a local file.
const shouldDumpGameTestData = process.env.DUMP_GAME_TEST_DATA;

let origAddGameLog: any;
let origNext: any;
const pendingGameInputs: GameInputMultiStep[][] = [];
const gameTextArr: GameText[] = [];

export const mochaHooks = {
  beforeAll() {
    if (shouldDumpGameTestData) {
      origAddGameLog = GameState.prototype.addGameLog;
      GameState.prototype.addGameLog = function (...args) {
        gameTextArr.push(toGameText(...args));
        return origAddGameLog.call(this, ...args);
      };

      origNext = GameState.prototype.next;
      GameState.prototype.next = function (...args) {
        const ret = origNext.call(this, ...args);
        if (ret.pendingGameInputs.length !== 0) {
          pendingGameInputs.push(...ret.pendingGameInputs);
        }
        return ret;
      };
    }
  },

  afterAll() {
    if (shouldDumpGameTestData) {
      GameState.prototype.addGameLog = origAddGameLog;
      GameState.prototype.next = origNext;
      fs.writeFileSync(
        "./src/pages/test/pendingGameInputs.json",
        JSON.stringify(pendingGameInputs, null, 2)
      );
      fs.writeFileSync(
        "./src/pages/test/logs.json",
        JSON.stringify(uniqBy(gameTextArr, gameTextToDebugStr), null, 2)
      );
    }
  },
};
