import { ipcMain } from 'electron';
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
    // Return nothing – success is implied by resolving the promise
  });
}