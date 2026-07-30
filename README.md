# Pocket Flashcards

Pocket Flashcards is a browser-based study app for creating small study sets,
practising them through progressive exercises, and tracking mastery.

## Features

- Create, rename, import, export, and delete study sets
- Add, edit, delete, review, and reset individual terms
- Practise with flashcards, a word bank, and progressively harder recall
- Track score, attempts, streaks, and completion for each term
- Keep study data in the browser using local storage

## Run locally

Pocket Flashcards requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local address shown in the terminal.

## Verify a production build

```bash
npm run build
```

## Data and backups

Study data is stored in the current browser. Export important sets as JSON to
create a portable backup before clearing browser data or moving devices.
