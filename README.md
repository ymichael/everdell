# 🐿 Everdell

![CI](https://github.com/ymichael/everdell/workflows/CI/badge.svg)

**Play Everdell Online**

We highly recommend [purchasing this board game](https://www.starling.games/everdell) for personal use and all of its expansions! This app is useful if you want to play with people online or play test community mods to the game.

Currently supports:

- [Base game](https://boardgamegeek.com/boardgame/199792/everdell)
- [Pearlbrook Expansion](https://boardgamegeek.com/boardgame/259996/everdell-pearlbrook)
- [Newleaf](https://boardgamegeek.com/boardgame/332390/everdell-newleaf)
- [Bellfaire Locations & Events](https://boardgamegeek.com/boardgame/289057/everdell-bellfaire)

We designed this application with expansions in mind so it should be possible to add support for even more official expansions.

## Demo

You can demo this web app [here](https://everdell.vercel.app/). If you find a bug or have a feature request, please add it as one in issues tab.

## Development

### Code Organization

- This is a [nextjs](https://nextjs.org/) application.
- The core game models are located in `src/model/*`.
- UI components can be found in `src/components/*`.

### Key Concepts:

- Each `Game` is modeled as series of `GameState` (the latest one representing the current state of the game)
- `GameState`s transition to the next state via `GameInput`s (specified by the client)
- The `GameState` also holds things like a list of `Player`s, the `Deck`, discard pile, active `Location`s, `Event`s etc.
- Most of the custom logic can be found in `card.ts`, `location.ts` and `event.ts` where all the respective game objects are implemented.
- Most objects implement a `toJSON` and `fromJSON` method to allow them to be sent to the client. `toJSON` conditionally returns a public view of the object (eg. hides the cards in the player's hands and the cards in the deck).

Some important types that are used throughout the codebase:

| Type                                       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `CardName`, `LocationName`, `EventName`    | String Enums of the various cards/locations & events. These alone are sufficient to encode a generic item. Eg. CardName[] models a Deck of cards with a specific ordering.                                                                                                                                                                                                                                                                                                     |
| `ResourceType`                             | Enum of resources `TWIG` `PEBBLE` `RESIN` `BERRY` `VP`                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `GameInput`                                | This describes all the available ways to transition from one `GameState` to another. The `clientOptions` key on `GameInput` types is reserved for client specific variability. Eg. The `PLAY_CARD` input has client options that specify the card to play.                                                                                                                                                                                                                     |
| `GameInputSimple` vs. `GameInputMultiStep` | Simple `GameInput`s are things that players can typically play at the start of their turn (if eligible). Eg. playing a card from their hand. `GameInputMultiStep` are special in that they can only be triggered after taking certain actions. Eg. Choosing a wild resource after placing a worker on a location. The list of valid multi-step inputs are stored as part of the `GameState` (see `pendingGameInputs`) to avoid any unexpected/out-of-turn actions being taken. |
| `GameText`                                 | A way to describe in-game text (eg. on cards, in logs etc). This allows us to reference resources like berries, vp tokens and even cards/other players in the game in a consistent way across various parts of the UI                                                                                                                                                                                                                                                          |

The following test pages exist to make UI development easier:

| Path                  | Description                                             |
| --------------------- | ------------------------------------------------------- |
| `/test/ui`            | Listing of all cards, locations, events as rendered     |
| `/test/inputs`        | Preview of the various variants of the user input forms |
| `/test/log`           | Preview of the game log ui                              |
| `/test/inputBoxLabel` | Preview of the input box labels                         |
| `/test/game`          | Preview of an ongoing game (non-functional)             |

`/test/log` and `/test/inputBoxLabel` are rendered from JSON data collected when running our unit tests.
To regenerate these, you can run `npm run collect_test_data`

### Persistence

The app uses sqlite or postgres for to store the game state across server restarts. Which dbms we use is determined by the environment variables. When deploying to Heroku, its recommended to use postgres so game state is persisted across deploys.

### Getting Started

Install dependencies:

```bash
npm ci
```

Run the development server:

```bash
npm run dev

open http://localhost:3000
```

Running tests & checks:

```bash
npm run typecheck
npm run typecheck:watch

npm run format

npm run test
npm run test:watch
```

## Credits

This project won't exist without the actual board game and was heavily inspired by the [terraforming-mars](https://github.com/bafolts/terraforming-mars) repository.
