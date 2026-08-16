import { inject, injectable } from "tsyringe";
import { join } from "path";
import type { IProjectManager } from "../interfaces/IProjectManager";
import type { ScaffoldOptions, ScaffoldTemplate } from "../../types/scaffold";
import type { Project } from "../../types/project";

@injectable()
export class MockScaffolderManager {
  constructor(@inject("IProjectManager") _projectManager: IProjectManager) {}

  list(): ScaffoldTemplate[] {
    return [
      { id: "laravel", displayName: "Laravel", minPhpVersion: "8.2.0" },
      { id: "symfony", displayName: "Symfony", minPhpVersion: "8.2.0" },
    ];
  }

  async create(
    options: ScaffoldOptions,
    onLog?: (line: string) => void
  ): Promise<Project> {
    onLog?.(`[mock] scaffolding ${options.template} "${options.name}"...`);
    return {
      id: `mock-${Date.now()}`,
      name: options.name,
      path: join(options.parentDir, options.name),
    };
  }
}
