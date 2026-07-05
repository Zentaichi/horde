import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // We'll add PHP/MySQL APIs later
});