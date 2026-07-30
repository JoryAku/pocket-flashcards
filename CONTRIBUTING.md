# Contributing to Pocket Flashcards

Thanks for helping improve Pocket Flashcards.

## Before you begin

- Search existing issues before opening a new one.
- Keep changes focused and explain the learner-facing benefit.
- Do not add analytics, tracking, accounts, or cloud persistence without prior
  discussion. Study data is intentionally stored in the browser.

## Local development

Pocket Flashcards requires Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

Before opening a pull request, run:

```bash
npm run check
```

## Pull requests

- Create a branch from `main`.
- Add or update tests when changing progress calculations or JSON handling.
- Describe what changed and how it was verified.
- Include screenshots for visible interface changes.

By contributing, you agree that your contribution is licensed under the MIT
License.
