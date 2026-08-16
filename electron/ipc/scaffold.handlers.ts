import { ipcMain } from "electron";
import { container } from "tsyringe";
import { ScaffolderManager } from "../services/scaffolder-manager";
import type { ScaffoldOptions } from "../types/scaffold";

export function registerScaffoldHandlers() {
  const scaffolderManager = container.resolve(ScaffolderManager);

  ipcMain.handle("scaffold:list-templates", () => {
    return scaffolderManager.list();
  });

  ipcMain.handle("scaffold:create", (event, options: ScaffoldOptions) => {
    return scaffolderManager.create(options, (line) => {
      event.sender.send("scaffold:log", line);
    });
  });
}
