# 🐿 Everdell

![CI](https://github.com/ymichael/everdell/workflows/CI/badge.svg)

**Everdell Board Game**

We highly recommend [purchasing this board game](https://www.starling.games/everdell) for personal use. If you want to play with people online, you can use this web app.

## Demo

You can demo this web app [here](https://everdell.herokuapp.com/). If you find a bug or have a feature request, please add it as one in issues tab. If you plan on playing long-running games, it is recommended that you host the game locally.

## Development

Install dependencies:

```bash
npm ci
```

Run the development server:

```bash
npm run dev
```

Running tests & checks:

```bash
npx tsc --watch

npm run test
npm run test:watch
```

## Credits

This project won't exist without the actual board game and was heavily inspired by the [terraforming-mars](https://github.com/bafolts/terraforming-mars) repository.
