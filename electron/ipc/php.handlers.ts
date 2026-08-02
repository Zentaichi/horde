import { ipcMain, shell, dialog } from "electron";
import { container } from "tsyringe";
import type { IPhpManager } from "../services/interfaces/IPhpManager";

export function registerPhpHandlers() {
  const phpManager = container.resolve<IPhpManager>("IPhpManager");

  ipcMain.handle("php:get-available-versions", async () => {
    return await phpManager.getAvailableVersions();
  });

  ipcMain.handle("php:get-installed-versions", () => {
    return phpManager.getInstalledVersions();
  });

  ipcMain.handle("php:download-version", async (event, version: string) => {
    const progressChannel = `php:download-progress-${version}`;

    await phpManager.downloadVersion(version, (progress) => {
      event.sender.send(progressChannel, progress);
    });
  });

  ipcMain.handle("php:get-active-version", () => {
    return phpManager.getActiveVersion();
  });

  ipcMain.handle("php:switch-global", async (_event, version: string) => {
    await phpManager.switchGlobal(version);
  });

  ipcMain.handle("php:uninstall-version", async (_event, version: string) => {
    await phpManager.uninstallVersion(version);
  });

  ipcMain.handle("app:open-directory", async (_event, dirPath: string) => {
    const result = await shell.openPath(dirPath);
    if (result) throw new Error(result);
  });

  ipcMain.handle(
    "app:save-dialog",
    async (
      _event,
      options: {
        defaultPath?: string;
        filters?: { name: string; extensions: string[] }[];
      },
    ) => {
      const result = await dialog.showSaveDialog(options);
      return result.canceled ? null : result.filePath;
    },
  );

  ipcMain.handle(
    "app:open-dialog",
    async (
      _event,
      options: { filters?: { name: string; extensions: string[] }[] },
    ) => {
      const result = await dialog.showOpenDialog(options);
      return result.canceled ? null : result.filePaths[0];
    },
  );
}
