import path from 'path';
import { test, expect } from './fixtures';

test.describe('Playwright feature lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hero counters update', async ({ page }) => {
    await test.step('increment and decrement counter', async () => {
      const counter = page.getByTestId('counter-value');
      await expect(counter).toHaveText('0');
      await page.getByRole('button', { name: '+' }).click();
      await expect(counter).toHaveText('1');
      await page.getByRole('button', { name: '-' }).click();
      await expect(counter).toHaveText('0');
    });

    await test.step('theme toggles', async () => {
      await page.getByRole('button', { name: 'Noon' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'noon');
    });
  });

  test('login validation and success path', async ({ page }) => {
    await page.getByLabel('Username').fill('wrong');
    await page.getByLabel('Password').fill('credentials');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Use admin / playwright to sign in.')).toBeVisible();

    await page.getByLabel('Username').fill('admin');
    await page.getByLabel('Password').fill('playwright');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByTestId('profile')).toContainText('Signed in as');
  });

  test('task filtering and confirm dialog', async ({ page }) => {
    await page.getByRole('tab', { name: 'open' }).click();
    await expect(page.getByRole('list', { name: 'Task list' })).toContainText('Draft launch copy');

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });

    await page.getByRole('button', { name: 'Reset tasks' }).click();
    await expect(page.getByRole('tab', { name: 'all' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });

  test('mocked network insights', async ({ page }) => {
    await page.route('**/api/insights', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'm1', title: 'Mocked win rate', detail: '83% of pilots convert in week one.' },
          { id: 'm2', title: 'Pipeline velocity', detail: 'Average cycle time fell to 6 days.' },
        ]),
      });
    });

    const responsePromise = page.waitForResponse('**/api/insights');
    await page.getByRole('button', { name: 'Load insights' }).click();
    await responsePromise;

    const items = page.getByRole('list', { name: 'Insights list' }).getByRole('listitem');
    await expect(items).toHaveCount(2);
    await expect(page.getByText('Mocked win rate')).toBeVisible();
  });

  test('insights fallback when api fails', async ({ page }) => {
    await page.route('**/api/insights', async (route) => {
      await route.fulfill({ status: 500, body: 'nope' });
    });
    await page.route('**/insights.json', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'f1', title: 'Fallback ready', detail: 'Loaded from static JSON.' },
        ]),
      });
    });

    await page.getByRole('button', { name: 'Load insights' }).click();

    await expect(page.getByTestId('insights-status')).toHaveText(/fallback/i);
    const items = page.getByRole('list', { name: 'Insights list' }).getByRole('listitem');
    await expect(items).toHaveCount(1);
    await expect(page.getByText('Fallback ready')).toBeVisible();
  });

  test('insights error when api and fallback fail', async ({ page }) => {
    await page.route('**/api/insights', async (route) => {
      await route.fulfill({ status: 500, body: 'nope' });
    });
    await page.route('**/insights.json', async (route) => {
      await route.fulfill({ status: 500, body: 'nope' });
    });

    await page.getByRole('button', { name: 'Load insights' }).click();

    await expect(page.getByTestId('insights-status')).toHaveText(/error/i);
    const items = page.getByRole('list', { name: 'Insights list' }).getByRole('listitem');
    await expect(items).toHaveCount(0);
  });

  test('file upload preview', async ({ page }) => {
    const filePath = path.join(__dirname, 'fixtures', 'notes.txt');
    await page.getByLabel('Upload sample notes').setInputFiles(filePath);
    const preview = page.getByTestId('file-preview');
    await expect(preview).toContainText('notes.txt');
    await expect(preview).toContainText('Launch notes');
  });

  test('table filtering supports keyboard input', async ({ page }) => {
    const search = page.getByLabel('Search projects');
    await search.click();
    await page.keyboard.type('Aurora');

    await expect(page.getByRole('row', { name: /Aurora/ })).toBeVisible();
    await expect.soft(page.getByRole('row', { name: /Borealis/ })).toHaveCount(0);
  });
});

test.describe('Storage state fixture', () => {
  test('already signed in via fixture', async ({ loggedInPage }) => {
    await expect(loggedInPage.getByTestId('profile')).toBeVisible();
  });

  test.use({ viewport: { width: 390, height: 844 } });
  test('mobile layout keeps hero visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Ship confident/ })).toBeVisible();
  });
});
