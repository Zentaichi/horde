import { ipcMain } from 'electron';
import { container } from 'tsyringe';
import { SettingsStore } from '../services/settings-store';

export function registerSettingsHandlers() {
  const store = container.resolve(SettingsStore);

  ipcMain.handle('settings:get', (_event, key: string) => {
    return store.get(key);
  });

  ipcMain.handle('settings:set', (_event, key: string, value: string) => {
    store.set(key, value);
  });
}
