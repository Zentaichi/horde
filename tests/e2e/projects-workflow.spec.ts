import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";
import { resolve } from "path";

/**
 * The dashboard status cards, addressed by their card-title slot.
 *
 * Card titles render with surrounding whitespace, so this matches on substring
 * rather than an anchored regex. "Projects" is unique among the four titles
 * (PHP, Databases, Projects, Dev Servers).
 */
function cardTitle(page: import("@playwright/test").Page, name: string) {
  return page.locator('[data-slot="card-title"]').filter({ hasText: name });
}

test.describe("Projects workflow (E2E)", () => {
  test("navigates to Projects page and shows mock projects", async () => {
    const mainPath = resolve(__dirname, "../../dist-electron/electron/main.js");

    const electronApp = await electron.launch({
      args: [mainPath],
      env: { ...process.env, NODE_ENV: "test", HORDE_E2E_TEST: "1" },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Scope the nav click to the header link; a bare text=Projects also matches
    // the page h1 and dashboard card copy.
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Projects" })
      .click();
    await page.waitForSelector('h1:has-text("Projects")');

    // Mock projects display in the list. Each project name is an h3, so target
    // the heading role; the bare text also matched the path and chip copy.
    await expect(page.getByRole("heading", { name: "MyApp" })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("heading", { name: "API" })).toBeVisible({
      timeout: 10000,
    });

    await electronApp.close();
  });

  test("dashboard shows project and dev server widgets", async () => {
    const mainPath = resolve(__dirname, "../../dist-electron/electron/main.js");

    const electronApp = await electron.launch({
      args: [mainPath],
      env: { ...process.env, NODE_ENV: "test", HORDE_E2E_TEST: "1" },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 10000 });

    // Card titles are not heading elements, so target the card-title slot. A
    // bare text=Projects matched the nav link, the dashboard card,
    // "projects tracked", and the "Manage Projects" button.
    await expect(cardTitle(page, "Projects")).toBeVisible({ timeout: 5000 });
    await expect(cardTitle(page, "Dev Servers")).toBeVisible({ timeout: 5000 });

    await electronApp.close();
  });
});
