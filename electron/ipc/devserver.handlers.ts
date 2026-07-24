import { ipcMain } from 'electron';
import { container } from 'tsyringe';
import type { IDevServerManager } from '../services/interfaces/IDevServerManager';

export function registerDevServerHandlers() {
  const devServerManager = container.resolve<IDevServerManager>('IDevServerManager');

  ipcMain.handle('devserver:start', async (_event, projectId: string, port?: number) => {
    return await devServerManager.start(projectId, port);
  });

  ipcMain.handle('devserver:stop', async (_event, projectId: string) => {
    await devServerManager.stop(projectId);
  });

  ipcMain.handle('devserver:get-status', async (_event, projectId: string) => {
    return await devServerManager.getStatus(projectId);
  });

  ipcMain.handle('devserver:list-all', async () => {
    return await devServerManager.listAll();
  });

  ipcMain.handle('devserver:get-logs', async (_event, projectId: string, tail?: number) => {
    return await devServerManager.getLogs(projectId, tail);
  });

  ipcMain.on('devserver:subscribe-logs', (event, projectId: string) => {
    const pushChannel = `devserver:log-${projectId}`;
    const interval = setInterval(async () => {
      try {
        const logs = await devServerManager.getLogs(projectId, 50);
        event.sender.send(pushChannel, logs);
      } catch {
        // Server may have been stopped
      }
    }, 1000);

    event.sender.once('devserver:unsubscribe-logs' as any, () => {
      clearInterval(interval);
    });
  });
}
