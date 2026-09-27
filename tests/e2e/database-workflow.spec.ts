import { test, expect } from "@playwright/test";
import { _electron as electron } from "playwright";
import { resolve } from "path";

test.describe("Database workflow (E2E)", () => {
  test("navigates to Databases page and shows engine", async () => {
    const mainPath = resolve(__dirname, "../../dist-electron/electron/main.js");

    const electronApp = await electron.launch({
      args: [mainPath],
      env: { ...process.env, NODE_ENV: "test", HORDE_E2E_TEST: "1" },
    });

    const page = await electronApp.firstWindow();
    await page.waitForLoadState("domcontentloaded");

    // Scope the nav click to the header link. A bare text=Databases matches the
    // nav link, the page h1, and dashboard card copy.
    await page
      .getByRole("navigation")
      .getByRole("link", { name: "Databases" })
      .click();
    await page.waitForSelector('h1:has-text("Database Manager")');

    // The engine selector is the authoritative "engine is known" signal. Its
    // options are unique, unlike the engine name, which also appears in every
    // version card. An <option> is never *visible* while the <select> is
    // closed, so assert attachment and check visibility on the rendered list.
    await expect(page.getByRole("option", { name: "MySQL" })).toBeAttached({
      timeout: 10000,
    });
    await expect(
      page.getByRole("heading", { name: "Available Versions" })
    ).toBeVisible({ timeout: 10000 });

    // The instance list must agree with the selected engine.
    await expect(page.getByRole("heading", { name: "Instances" })).toBeVisible({
      timeout: 10000,
    });

    await electronApp.close();
  });
});
