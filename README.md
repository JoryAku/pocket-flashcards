# Pocket Flashcards

[![Checks](https://github.com/JoryAku/pocket-flashcards/actions/workflows/ci.yml/badge.svg)](https://github.com/JoryAku/pocket-flashcards/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/JoryAku/pocket-flashcards/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/JoryAku/pocket-flashcards/actions/workflows/deploy-pages.yml)

Pocket Flashcards is a browser-based study app for creating small study sets,
practising them through progressive exercises, and tracking mastery.

**Live app:** <https://joryaku.github.io/pocket-flashcards/>

## Features

- Create, rename, import, export, and delete study sets
- Add, edit, delete, review, and reset individual terms
- Practise with flashcards, a word bank, and progressively harder recall
- Track score, attempts, streaks, and completion for each term
- Keep study data in the browser using local storage

## Run locally

Pocket Flashcards requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Open the address shown in the terminal.

## Check a change

```bash
npm run check
```

This runs linting, unit tests, TypeScript checks, and the production build.

## Deployment

Changes merged into `main` are checked and deployed to GitHub Pages by
`.github/workflows/deploy-pages.yml`. Pull requests run the same checks without
deploying.

## Data and backups

Study data is stored in the current browser. Export important sets as JSON
before clearing browser data or moving devices.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) and the
[Code of Conduct](CODE_OF_CONDUCT.md) before opening a pull request.

## License

Pocket Flashcards is available under the [MIT License](LICENSE).
