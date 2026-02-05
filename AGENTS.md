# Agent Guidance

This repository contains a small React + Playwright demo project. When making changes:

## Workflow

1. Prefer small, focused edits.
2. Keep tests updated when changing UI behavior.
3. Run `npm run test` after functional changes.

## Conventions

- Use React functional components.
- Keep UI logic in `src/App.jsx` unless it grows large.
- Keep tests in `tests/demo.spec.ts` and add regression tests for bugs.

## Playwright

- Use role-based or label-based locators where possible.
- Scope locators to a section to avoid cross-component collisions.
- Avoid brittle selectors (classes or deep DOM paths) unless necessary.

## Styling

- Maintain the existing visual direction (warm tones, bold typography).
- Keep CSS in `src/styles.css`.

