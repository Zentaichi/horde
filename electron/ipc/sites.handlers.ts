import { ipcMain } from "electron";
import { container } from "tsyringe";
import type { ISiteManager } from "../services/interfaces/ISiteManager";

export function registerSiteHandlers() {
  const siteManager = container.resolve<ISiteManager>("ISiteManager");

  ipcMain.handle("sites:list", () => {
    return siteManager.list();
  });

  ipcMain.handle(
    "sites:set-domains",
    (_event, projectId: string, domains: string[]) => {
      return siteManager.setDomains(projectId, domains);
    }
  );

  ipcMain.handle(
    "sites:enable-ssl",
    (_event, projectId: string, enabled: boolean) => {
      return siteManager.enableSsl(projectId, enabled);
    }
  );

  ipcMain.handle("sites:get-status", () => {
    return siteManager.getStatus();
  });
}
