import { ipcMain, dialog, shell } from 'electron';
import { container } from 'tsyringe';
import type { IProjectManager } from '../services/interfaces/IProjectManager';

export function registerProjectHandlers() {
  const projectManager = container.resolve<IProjectManager>('IProjectManager');

  ipcMain.handle('projects:list', () => {
    return projectManager.list();
  });

  ipcMain.handle('projects:add', async (_event, name: string) => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Project Directory',
    });

    if (result.canceled || result.filePaths.length === 0) {
      throw new Error('No directory selected.');
    }

    return projectManager.add(name, result.filePaths[0]);
  });

  ipcMain.handle('projects:remove', (_event, projectId: string) => {
    projectManager.remove(projectId);
  });

  ipcMain.handle('projects:scan-php-version', (_event, projectId: string) => {
    return projectManager.scanPhpVersion(projectId);
  });

  ipcMain.handle('projects:scan-all', () => {
    projectManager.scanAll();
  });

  ipcMain.handle('projects:open-dir', async (_event, projectId: string) => {
    const project = projectManager.list().find((p) => p.id === projectId);
    if (!project) throw new Error(`Project ${projectId} not found.`);
    const result = await shell.openPath(project.path);
    if (result) throw new Error(result);
  });
}
