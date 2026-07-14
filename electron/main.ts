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
import { registerPhpHandlers } from './ipc/php.handlers';
import { registerDatabaseHandlers } from './ipc/database.handlers';

container.registerSingleton<IPlatformAdapter>('IPlatformAdapter', Win32PlatformAdapter);
container.registerSingleton<IPhpManager>('IPhpManager', PhpManager);
container.registerSingleton<IDatabaseEngine>('IDatabaseEngine:mysql', MySqlManager);
container.registerSingleton(DatabaseRegistry, DatabaseRegistry);
container.registerSingleton(SettingsStore, SettingsStore);

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

  const mysqlManager = container.resolve<IDatabaseEngine>('IDatabaseEngine:mysql');
  const databaseRegistry = container.resolve(DatabaseRegistry);
  databaseRegistry.register(mysqlManager);
  await databaseRegistry.restoreInstances();
  log.info('Database instances restored from store');

  registerDatabaseHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
