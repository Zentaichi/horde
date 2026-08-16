import { ipcMain } from "electron";
import { container } from "tsyringe";
import type { ICaddyManager } from "../services/interfaces/ICaddyManager";
import type { ProxyRoute } from "../types/proxy";

export function registerProxyHandlers() {
  const caddyManager = container.resolve<ICaddyManager>("ICaddyManager");

  ipcMain.handle("proxy:get-status", () => {
    return caddyManager.getStatus();
  });

  ipcMain.handle("proxy:start", () => {
    return caddyManager.start();
  });

  ipcMain.handle("proxy:stop", () => {
    return caddyManager.stop();
  });

  ipcMain.handle("proxy:set-routes", (_event, routes: ProxyRoute[]) => {
    return caddyManager.setRoutes(routes);
  });

  ipcMain.handle("proxy:get-logs", (_event, tail?: number) => {
    return caddyManager.getLogs(tail);
  });
}
