import { test as base, expect, Page } from '@playwright/test';

type Fixtures = {
  loggedInPage: Page;
};

export const test = base.extend<Fixtures>({
  loggedInPage: async ({ page }, use) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'pw-demo-user',
        JSON.stringify({ name: 'Admin', role: 'Launch Director' })
      );
    });
    await page.goto('/');
    await use(page);
  },
});

export { expect };
