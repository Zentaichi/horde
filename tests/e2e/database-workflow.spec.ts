import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { resolve } from 'path';

test.describe('Database workflow (E2E)', () => {
  test('navigates to Databases page and shows engine', async () => {
    const mainPath = resolve(__dirname, '../../dist-electron/electron/main.js');

    const electronApp = await electron.launch({
      args: [mainPath],
      env: { ...process.env, NODE_ENV: 'test', HORDE_E2E_TEST: '1' },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    await page.click('text=Databases');
    await page.waitForSelector('h1:has-text("Database Manager")');

    await expect(page.locator('text=MySQL')).toBeVisible({ timeout: 10000 });

    await electronApp.close();
  });
});
