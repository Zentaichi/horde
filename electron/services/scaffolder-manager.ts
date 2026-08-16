import { inject, injectable, singleton } from "tsyringe";
import type { IProjectManager } from "./interfaces/IProjectManager";
import type { IScaffolder } from "./interfaces/IScaffolder";
import type { ScaffoldOptions, ScaffoldTemplate } from "../types/scaffold";
import type { Project } from "../types/project";

@injectable()
@singleton()
export class ScaffolderManager {
  private readonly scaffolders = new Map<string, IScaffolder>();

  constructor(
    @inject("IProjectManager") private readonly projectManager: IProjectManager
  ) {}

  register(scaffolder: IScaffolder): void {
    this.scaffolders.set(scaffolder.id, scaffolder);
  }

  list(): ScaffoldTemplate[] {
    return Array.from(this.scaffolders.values()).map((s) => ({
      id: s.id,
      displayName: s.displayName,
      minPhpVersion: s.minPhpVersion,
    }));
  }

  async create(
    options: ScaffoldOptions,
    onLog?: (line: string) => void
  ): Promise<Project> {
    const scaffolder = this.scaffolders.get(options.template);
    if (!scaffolder) {
      throw new Error(`Unknown scaffold template: ${options.template}`);
    }
    const { path } = await scaffolder.createProject(options, onLog);
    return this.projectManager.add(options.name, path);
  }
}
