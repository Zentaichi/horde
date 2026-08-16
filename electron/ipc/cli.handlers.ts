import { ipcMain, app } from "electron";
import { existsSync } from "fs";
import { join } from "path";
import { container } from "tsyringe";
import type { IPlatformAdapter } from "../platform/IPlatformAdapter";

export function registerCliHandlers() {
  const platform = container.resolve<IPlatformAdapter>("IPlatformAdapter");

  ipcMain.handle("cli:is-installed", () => {
    return existsSync(platform.getCliInstallPath("horde"));
  });

  ipcMain.handle("cli:install", async () => {
    const cliMain = join(
      app.getAppPath(),
      "dist-electron",
      "electron",
      "cli",
      "main.js"
    );
    await platform.installCliShim("horde", app.getPath("exe"), [cliMain]);
  });

  ipcMain.handle("cli:uninstall", async () => {
    await platform.uninstallCliShim("horde");
  });
}
