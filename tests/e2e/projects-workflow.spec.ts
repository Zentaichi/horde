import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { resolve } from 'path';

test.describe('Projects workflow (E2E)', () => {
  test('navigates to Projects page and shows mock projects', async () => {
    const mainPath = resolve(__dirname, '../../dist-electron/electron/main.js');

    const electronApp = await electron.launch({
      args: [mainPath],
      env: { ...process.env, NODE_ENV: 'test', HORDE_E2E_TEST: '1' },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    await page.click('text=Projects');
    await page.waitForSelector('h1:has-text("Projects")');

    // Mock projects display in the list
    await expect(page.locator('text=MyApp')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=API')).toBeVisible({ timeout: 10000 });

    await electronApp.close();
  });

  test('dashboard shows project and dev server widgets', async () => {
    const mainPath = resolve(__dirname, '../../dist-electron/electron/main.js');

    const electronApp = await electron.launch({
      args: [mainPath],
      env: { ...process.env, NODE_ENV: 'test', HORDE_E2E_TEST: '1' },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    await page.waitForSelector('text=Dashboard', { timeout: 10000 });

    await expect(page.locator('text=Projects')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Dev Servers')).toBeVisible({ timeout: 5000 });

    await electronApp.close();
  });
});
