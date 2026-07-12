import { ipcMain } from 'electron';
import { container } from 'tsyringe';
import type { IDatabaseEngine } from '../services/interfaces/IDatabaseEngine';
import { DatabaseRegistry } from '../services/database-registry';
import type { DatabaseInstanceConfig } from '../types/database';

export function registerDatabaseHandlers() {
  const registry = container.resolve(DatabaseRegistry);

  ipcMain.handle('databases:list-engines', async () => {
    return registry.listEngines();
  });

  ipcMain.handle(
    'databases:list-available',
    async (_event, engine: string) => {
      const inst = registry.findEngine(engine);
      return await inst.listAvailable();
    },
  );

  ipcMain.handle(
    'databases:list-installed',
    async (_event, engine: string) => {
      const inst = registry.findEngine(engine);
      return await inst.listInstalled();
    },
  );

  ipcMain.handle(
    'databases:download',
    async (event, engine: string, version: string) => {
      const inst = registry.findEngine(engine);
      const progressChannel = `database:download-progress-${engine}-${version}`;

      await inst.download(version, (progress) => {
        event.sender.send(progressChannel, progress);
      });
    },
  );

  ipcMain.handle(
    'databases:initialize',
    async (_event, config: DatabaseInstanceConfig) => {
      const inst = registry.findEngine(config.engine);
      await inst.initialize(config);
    },
  );

  ipcMain.handle(
    'databases:start',
    async (_event, instanceId: string) => {
      const inst = registry.resolveEngineByInstance(instanceId);
      await inst.start(instanceId);
    },
  );

  ipcMain.handle(
    'databases:stop',
    async (_event, instanceId: string) => {
      const inst = registry.resolveEngineByInstance(instanceId);
      await inst.stop(instanceId);
    },
  );

  ipcMain.handle(
    'databases:get-status',
    async (_event, instanceId: string) => {
      const inst = registry.resolveEngineByInstance(instanceId);
      return await inst.getStatus(instanceId);
    },
  );

  ipcMain.handle(
    'databases:list-instances',
    async () => {
      return await registry.listAllInstances();
    },
  );

  ipcMain.handle(
    'databases:remove-instance',
    async (_event, instanceId: string) => {
      const inst = registry.resolveEngineByInstance(instanceId);
      await inst.removeInstance(instanceId);
    },
  );
}
