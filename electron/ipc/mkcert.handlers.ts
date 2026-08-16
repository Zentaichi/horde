import { ipcMain } from "electron";
import { container } from "tsyringe";
import type { IMkcertManager } from "../services/interfaces/IMkcertManager";

export function registerMkcertHandlers() {
  const mkcertManager = container.resolve<IMkcertManager>("IMkcertManager");

  ipcMain.handle("mkcert:get-status", () => {
    return mkcertManager.getStatus();
  });

  ipcMain.handle("mkcert:install", (event) => {
    const channel = "mkcert:download-progress";
    return mkcertManager.ensureInstalled((progress) => {
      event.sender.send(channel, progress);
    });
  });
}
