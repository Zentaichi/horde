import { ipcMain, app } from 'electron';
import { existsSync } from 'fs';
import { join } from 'path';
import { container } from 'tsyringe';
import log from 'electron-log';
import { SettingsStore } from '../services/settings-store';
import { ServiceRegistry } from '../services/service-registry';
import type { IPlatformAdapter } from '../platform/IPlatformAdapter';
import type { IDevServerManager } from '../services/interfaces/IDevServerManager';
import { DatabaseRegistry } from '../services/database-registry';

const AUTO_START_KEY = 'auto_start_services';

export function registerAutoStartHandlers() {
  const settingsStore = container.resolve(SettingsStore);
  const serviceRegistry = container.resolve(ServiceRegistry);
  const platform = container.resolve<IPlatformAdapter>('IPlatformAdapter');

  ipcMain.handle('autostart:get-services', async () => {
    return await serviceRegistry.getAllStatuses();
  });

  ipcMain.handle('autostart:is-enabled', (_event, serviceId: string) => {
    const raw = settingsStore.get(AUTO_START_KEY);
    const services: string[] = raw ? JSON.parse(raw) : [];
    return services.includes(serviceId);
  });

  ipcMain.handle('autostart:toggle', (_event, serviceId: string, enabled: boolean) => {
    const raw = settingsStore.get(AUTO_START_KEY);
    const services: string[] = raw ? JSON.parse(raw) : [];

    if (enabled && !services.includes(serviceId)) {
      services.push(serviceId);
    } else if (!enabled) {
      const idx = services.indexOf(serviceId);
      if (idx !== -1) services.splice(idx, 1);
    }

    settingsStore.set(AUTO_START_KEY, JSON.stringify(services));
  });

  ipcMain.handle('autostart:is-boot-enabled', () => {
    const dir = platform.getAutoStartDir();
    return existsSync(join(dir, 'Horde.lnk'));
  });

  ipcMain.handle('autostart:toggle-boot', async (_event, enabled: boolean) => {
    if (enabled) {
      await platform.createAutoStartEntry('Horde', app.getPath('exe'));
    } else {
      await platform.removeAutoStartEntry('Horde');
    }
  });

  ipcMain.handle('autostart:start-service', async (_event, serviceId: string) => {
    const raw = settingsStore.get(AUTO_START_KEY);
    const services: string[] = raw ? JSON.parse(raw) : [];
    if (!services.includes(serviceId)) return;

    const [providerId, id] = serviceId.split(':', 2);

    try {
      if (providerId === 'mysql') {
        const dbReg = container.resolve(DatabaseRegistry);
        const engine = dbReg.resolveEngineByInstance(id);
        await engine.start(id);
      } else if (providerId === 'devserver') {
        const dsManager = container.resolve<IDevServerManager>('IDevServerManager');
        await dsManager.start(id);
      }
    } catch (err) {
      log.warn(`Auto-start failed for ${serviceId}:`, err);
    }
  });
}

export async function startAutoServices() {
  const settingsStore = container.resolve(SettingsStore);
  const raw = settingsStore.get(AUTO_START_KEY);
  const serviceIds: string[] = raw ? JSON.parse(raw) : [];

  for (const serviceId of serviceIds) {
    const [providerId, id] = serviceId.split(':', 2);

    try {
      if (providerId === 'mysql') {
        const dbReg = container.resolve(DatabaseRegistry);
        const engine = dbReg.resolveEngineByInstance(id);
        await engine.start(id);
        log.info(`Auto-started MySQL instance ${id}`);
      } else if (providerId === 'devserver') {
        const dsManager = container.resolve<IDevServerManager>('IDevServerManager');
        await dsManager.start(id);
        log.info(`Auto-started dev server for project ${id}`);
      }
    } catch (err) {
      log.warn(`Auto-start failed for ${serviceId}:`, err);
    }
  }
}
