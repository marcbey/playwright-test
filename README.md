# Playwright Feature Lab

A small React + Vite demo app paired with a Playwright test suite that showcases common testing features: locators, fixtures, storage state, dialogs, file uploads, network mocking, and viewport coverage.

## What’s inside

- **React UI** with multiple components to test against
- **Playwright tests** covering user flows and edge cases
- **Vite dev server** wired to Playwright `webServer`

## Requirements

- Node.js 20+ (uses npm)

## Setup

```bash
npm install
```

Install Playwright browsers (if needed):

```bash
npx playwright install
```

## Run the app

```bash
npm run dev
```

## Run tests

```bash
npm run test
```

Optional UI mode:

```bash
npm run test:ui
```

## Project structure

```
.
├── src/                 # React app
├── public/              # Static assets (insights.json)
├── tests/               # Playwright tests + fixtures
├── playwright.config.ts # Playwright config
└── vite.config.cjs      # Vite config
```

## Notes

- The test suite is configured to spin up the Vite dev server automatically.
- The demo data in `public/insights.json` is used as a fallback when the mock API fails.

