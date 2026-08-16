import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { app } from "electron";
import { container } from "tsyringe";
import type { IProjectManager } from "./interfaces/IProjectManager";
import type { IPhpManager } from "./interfaces/IPhpManager";
import type { ISiteManager } from "./interfaces/ISiteManager";
import { ServiceRegistry } from "./service-registry";

export type ControlHandler = (
  args: Record<string, unknown>
) => Promise<unknown>;
export type ControlHandlers = Record<string, ControlHandler>;

function readPhpVersionFile(dir: string): string | null {
  const dotFile = join(dir, ".php-version");
  if (!existsSync(dotFile)) return null;
  try {
    return readFileSync(dotFile, "utf-8").trim() || null;
  } catch {
    return null;
  }
}

export function buildControlHandlers(): ControlHandlers {
  const projectManager = container.resolve<IProjectManager>("IProjectManager");
  const siteManager = container.resolve<ISiteManager>("ISiteManager");
  const phpManager = container.resolve<IPhpManager>("IPhpManager");
  const serviceRegistry = container.resolve(ServiceRegistry);

  return {
    version: async () => ({
      version: app.getVersion(),
      phpActive: phpManager.getActiveVersion(),
    }),
    "php-version": async ({ path }) => {
      const dir = typeof path === "string" && path ? path : process.cwd();
      return { path: dir, version: readPhpVersionFile(dir) };
    },
    projects: async () => projectManager.list(),
    sites: async () => siteManager.list(),
    servers: async () => serviceRegistry.getAllStatuses(),
  };
}
