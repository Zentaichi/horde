import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { resolve } from 'path';

test('app launches and shows dashboard', async () => {
  const mainPath = resolve(__dirname, '../../dist-electron/electron/main.js');

  const electronApp = await electron.launch({
    args: [mainPath],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });

  const page = await electronApp.firstWindow();

  await page.waitForLoadState('domcontentloaded');

  const title = await page.title();
  expect(title).toBeTruthy();

  const heading = page.locator('h1');
  await expect(heading.first()).toBeVisible({ timeout: 15000 });

  await electronApp.close();
});
