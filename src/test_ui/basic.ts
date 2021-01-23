import expect from "expect.js";
import puppeteer from "puppeteer";

import { createGame } from "../model/game";

const DEBUG = !!process.env.DEBUG;
const HOST = process.env.HOST;
if (!HOST) {
  console.error("Must specify HOST env variable.");
  process.exit(1);
}

describe("UI Test", () => {
  let browser: puppeteer.Browser;
  let page: puppeteer.Page;

  before(async () => {
    browser = await puppeteer.launch(
      DEBUG
        ? {
            devtools: true,
            slowMo: 300,
          }
        : {}
    );
  });

  const navigateTo = async (path: string) => {
    const url = `${HOST}${path}`;
    console.log("Navigating to: ", url);
    await page.goto(url);
  };

  beforeEach(async () => {
    page = await browser.newPage();
  });

  after(async () => {
    await browser.close();
  });

  it("should be able to create a new game", async () => {
    await navigateTo("/");
    const newGameButton = await page.waitForSelector("#js-new-game", {
      timeout: 1000,
    });
    expect(newGameButton).to.not.be(null);

    // Click it!
    await newGameButton!.click();

    // Reveal game builder
    const gameBuilderDiv = await page.waitForSelector("#js-game-builder", {
      timeout: 1000,
    });
    expect(gameBuilderDiv).to.not.be(null);

    // Create a game
    const gameBuilderSubmitButton = await page.waitForSelector(
      "#js-game-builder-submit",
      {
        timeout: 1000,
      }
    );
    expect(gameBuilderSubmitButton).to.not.be(null);

    await gameBuilderSubmitButton!.click();
    await page.waitForNavigation();

    // "Game Created text appears"
    const gameAdminComp = await page.waitForSelector("#js-game-admin", {
      timeout: 1000,
    });
    expect(gameAdminComp).to.not.be(null);

    const textContentHandle = await gameAdminComp!.getProperty("textContent");
    const textContent = await textContentHandle.jsonValue();
    expect(textContent).to.match(/Game Created/i);
  });

  it("should render game page for the player", async () => {
    const game = await createGame(["Michael", "Elynn"]);
    const gameJSON = game.toJSON(true /* includePrivate */);

    let gameInputBoxForm, gameInputBoxText;

    const p1Secret = gameJSON.gameState.players[0].playerSecret;
    const p2Secret = gameJSON.gameState.players[1].playerSecret;

    // Player 1's turn, should only the form to take action
    await navigateTo(`/game/${game.gameId}?playerSecret=${p1Secret}`);
    gameInputBoxForm = await page.waitForSelector("#js-game-input-box-form", {
      timeout: 1000,
    });
    expect(gameInputBoxForm).to.not.be(null);
    gameInputBoxText = await page.$("#js-game-input-box-text");
    expect(gameInputBoxText).to.be(null);

    // Player 2 should not see a form, but text that says it's player 1's turn
    await navigateTo(`/game/${game.gameId}?playerSecret=${p2Secret}`);
    gameInputBoxForm = await page.$("#js-game-input-box-form");
    expect(gameInputBoxForm).to.be(null);
    gameInputBoxText = await page.waitForSelector("#js-game-input-box-text", {
      timeout: 1000,
    });
    expect(gameInputBoxText).to.not.be(null);
    const textContentHandle = await gameInputBoxText!.getProperty(
      "textContent"
    );
    const textContent = await textContentHandle.jsonValue();
    expect(textContent).to.match(/Waiting for Michael/);
  });
});
