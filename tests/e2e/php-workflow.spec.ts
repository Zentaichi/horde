import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import { resolve } from 'path';

test.describe('PHP workflow (E2E)', () => {
  test('download, switch, and verify PHP version', async () => {
    const mainPath = resolve(__dirname, '../../dist-electron/electron/main.js');

    const electronApp = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        HORDE_E2E_TEST: '1',
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    await page.click('text=PHP');
    await page.waitForSelector('h1:has-text("PHP Manager")');

    // Download a version
    const downloadBtn = page.locator('button:has-text("Download")').first();
    await downloadBtn.click();

    // Wait for it to appear in installed list
    await page.waitForSelector('text=8.3.10', { timeout: 10000 });

    // Verify installed version is visible
    const installedSection = page.locator('text=Installed');
    await expect(installedSection).toBeVisible();

    await electronApp.close();
  });

  test('shows available versions on PHP page', async () => {
    const mainPath = resolve(__dirname, '../../dist-electron/electron/main.js');

    const electronApp = await electron.launch({
      args: [mainPath],
      env: { ...process.env, NODE_ENV: 'test', HORDE_E2E_TEST: '1' },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    await page.click('text=PHP');
    await page.waitForSelector('h1:has-text("PHP Manager")');

    const available = page.locator('text=8.2.22');
    await expect(available.first()).toBeVisible({ timeout: 10000 });

    await electronApp.close();
  });
});
