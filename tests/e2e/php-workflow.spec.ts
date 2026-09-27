import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";
import { resolve } from "path";

test.describe("PHP workflow (E2E)", () => {
  test("download, switch, and verify PHP version", async () => {
    const mainPath = resolve(__dirname, "../../dist-electron/electron/main.js");

    const electronApp = await electron.launch({
      args: [mainPath],
      env: {
        ...process.env,
        NODE_ENV: "test",
        HORDE_E2E_TEST: "1",
      },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Scope the nav click to the header link; a bare text=PHP also matches
    // dashboard card copy.
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "PHP" })
      .click();
    await page.waitForSelector('h1:has-text("PHP Manager")');

    // Download a version
    const downloadBtn = page.locator('button:has-text("Download")').first();
    await downloadBtn.click();

    // Wait for it to appear in installed list
    await page.waitForSelector("text=8.3.10", { timeout: 10000 });

    // Verify the installed section is present. A bare text=Installed matches the
    // heading plus other copy, so target the heading by role and exact name.
    await expect(
      page.getByRole("heading", { name: "Installed PHP Versions", exact: true })
    ).toBeVisible();

    await electronApp.close();
  });

  test("shows available versions on PHP page", async () => {
    const mainPath = resolve(__dirname, "../../dist-electron/electron/main.js");

    const electronApp = await electron.launch({
      args: [mainPath],
      env: { ...process.env, NODE_ENV: "test", HORDE_E2E_TEST: "1" },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    await page
      .getByRole("navigation")
      .getByRole("link", { name: "PHP" })
      .click();
    await page.waitForSelector('h1:has-text("PHP Manager")');

    const available = page.locator("text=8.2.22");
    await expect(available.first()).toBeVisible({ timeout: 10000 });

    await electronApp.close();
  });
});
