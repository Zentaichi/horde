import { ipcMain, shell } from 'electron';
import { PhpManager } from '../services/php-manager';

export function registerPhpHandlers(phpManager: PhpManager) {
  ipcMain.handle('php:get-available-versions', async () => {
    return await phpManager.getAvailableVersions();
  });

  ipcMain.handle('php:get-installed-versions', () => {
    return phpManager.getInstalledVersions();
  });

  ipcMain.handle('php:download-version', async (event, version: string) => {
    const progressChannel = `php:download-progress-${version}`;

    await phpManager.downloadVersion(version, (progress) => {
      event.sender.send(progressChannel, progress);
    });
  });

  ipcMain.handle('php:get-active-version', () => {
    return phpManager.getActiveVersion();
  });

  ipcMain.handle('php:switch-global', async (_event, version: string) => {
    await phpManager.switchGlobal(version);
  });

  ipcMain.handle('php:uninstall-version', async (_event, version: string) => {
    await phpManager.uninstallVersion(version);
  });

  ipcMain.handle('app:open-directory', async (_event, dirPath: string) => {
    const result = await shell.openPath(dirPath);
    if (result) throw new Error(result);
  });
}