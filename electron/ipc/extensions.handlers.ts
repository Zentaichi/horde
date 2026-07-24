import { ipcMain } from 'electron';
import { container } from 'tsyringe';
import type { IExtensionManager } from '../services/interfaces/IExtensionManager';

export function registerExtensionHandlers() {
  const extensionManager = container.resolve<IExtensionManager>('IExtensionManager');

  ipcMain.handle('extensions:list', async (_event, phpVersion: string) => {
    return await extensionManager.list(phpVersion);
  });

  ipcMain.handle('extensions:enable', async (_event, phpVersion: string, extensionName: string) => {
    await extensionManager.enable(phpVersion, extensionName);
  });

  ipcMain.handle('extensions:disable', async (_event, phpVersion: string, extensionName: string) => {
    await extensionManager.disable(phpVersion, extensionName);
  });
}
