import 'reflect-metadata';
import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import log from 'electron-log';
import { container } from 'tsyringe';
import type { IPlatformAdapter } from './platform/IPlatformAdapter';
import { Win32PlatformAdapter } from './platform/win32/Win32PlatformAdapter';
import type { IPhpManager } from './services/interfaces/IPhpManager';
import { PhpManager } from './services/php-manager';
import type { IDatabaseEngine } from './services/interfaces/IDatabaseEngine';
import { MySqlManager } from './services/mysql-manager';
import { DatabaseRegistry } from './services/database-registry';
import { SettingsStore } from './services/settings-store';
import { ServiceRegistry } from './services/service-registry';
import type { IProjectManager } from './services/interfaces/IProjectManager';
import { ProjectManager } from './services/project-manager';
import type { IDevServerManager } from './services/interfaces/IDevServerManager';
import { DevServerManager } from './services/dev-server-manager';
import type { IExtensionManager } from './services/interfaces/IExtensionManager';
import { ExtensionManager } from './services/extension-manager';
import type { IServiceProvider } from './services/interfaces/IServiceRegistry';
import { registerPhpHandlers } from './ipc/php.handlers';
import { registerDatabaseHandlers } from './ipc/database.handlers';
import { registerSettingsHandlers } from './ipc/settings.handlers';
import { registerProjectHandlers } from './ipc/project.handlers';
import { registerDevServerHandlers } from './ipc/devserver.handlers';
import { registerExtensionHandlers } from './ipc/extensions.handlers';
import { registerAutoStartHandlers, startAutoServices } from './ipc/autostart.handlers';
import { createTray } from './tray';

container.registerSingleton<IPlatformAdapter>('IPlatformAdapter', Win32PlatformAdapter);
container.registerSingleton<IPhpManager>('IPhpManager', PhpManager);
container.registerSingleton<IDatabaseEngine>('IDatabaseEngine:mysql', MySqlManager);
container.registerSingleton(DatabaseRegistry, DatabaseRegistry);
container.registerSingleton(SettingsStore, SettingsStore);
container.registerSingleton(ServiceRegistry, ServiceRegistry);
container.registerSingleton<IProjectManager>('IProjectManager', ProjectManager);
container.registerSingleton<IDevServerManager>('IDevServerManager', DevServerManager);
container.registerSingleton<IExtensionManager>('IExtensionManager', ExtensionManager);

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'renderer', 'index.html'));
  }
}

app.whenReady().then(async () => {
  log.initialize();
  log.info('Horde starting up');

  registerPhpHandlers();
  registerSettingsHandlers();
  registerProjectHandlers();
  registerExtensionHandlers();
  registerAutoStartHandlers();

  const mysqlManager = container.resolve<IDatabaseEngine>('IDatabaseEngine:mysql');
  const databaseRegistry = container.resolve(DatabaseRegistry);
  databaseRegistry.register(mysqlManager);

  const devServerManager = container.resolve<IDevServerManager>('IDevServerManager');

  const serviceRegistry = container.resolve(ServiceRegistry);
  serviceRegistry.registerProvider(databaseRegistry);
  serviceRegistry.registerProvider(devServerManager as unknown as IServiceProvider);
  await serviceRegistry.restoreAll();
  log.info('Database instances restored from store');

  registerDatabaseHandlers();
  registerDevServerHandlers();

  createWindow();
  createTray(mainWindow!);

  await startAutoServices();

  mainWindow!.on('close', (e) => {
    if (!mainWindow?.isDestroyed()) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow?.show();
  });
});

app.on('window-all-closed', () => {
  // Don't quit — app lives in tray
});
