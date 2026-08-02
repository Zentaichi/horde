import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import { inject, injectable } from "tsyringe";
import { SettingsStore } from "./settings-store";
import type { Project } from "../types/project";
import type { IProjectManager } from "./interfaces/IProjectManager";
import type { IPhpManager } from "./interfaces/IPhpManager";

@injectable()
export class ProjectManager implements IProjectManager {
  constructor(
    @inject(SettingsStore) private readonly settingsStore: SettingsStore,
    @inject("IPhpManager") private readonly phpManager: IPhpManager,
  ) {}

  list(): Project[] {
    return this.settingsStore.loadProjects().map((p) => this.hydrate(p));
  }

  add(name: string, path: string): Project {
    const project: Project = {
      id: randomUUID(),
      name: name || path.split(/[\\/]/).pop() || path,
      path,
    };

    project.phpVersion = this.readPhpVersionFile(path) ?? undefined;
    this.hydrate(project);
    this.settingsStore.saveProject(project);
    return project;
  }

  remove(id: string): void {
    this.settingsStore.deleteProject(id);
  }

  scanPhpVersion(id: string): string | null {
    const projects = this.settingsStore.loadProjects();
    const project = projects.find((p) => p.id === id);
    if (!project) throw new Error(`Project ${id} not found.`);

    const version = this.readPhpVersionFile(project.path);
    project.phpVersion = version ?? undefined;
    this.hydrate(project);
    this.settingsStore.saveProject(project);
    return version;
  }

  scanAll(): void {
    const projects = this.settingsStore.loadProjects();
    for (const project of projects) {
      const version = this.readPhpVersionFile(project.path);
      project.phpVersion = version ?? undefined;
      this.hydrate(project);
      this.settingsStore.saveProject(project);
    }
  }

  findById(id: string): Project | undefined {
    const project = this.settingsStore.loadProjects().find((p) => p.id === id);
    return project ? this.hydrate(project) : undefined;
  }

  private hydrate(project: Project): Project {
    if (project.phpVersion) {
      project.isPhpVersionInstalled = this.phpManager.isVersionInstalled(
        project.phpVersion,
      );
    } else {
      project.isPhpVersionInstalled = undefined;
    }
    return project;
  }

  private readPhpVersionFile(projectPath: string): string | null {
    const dotFile = join(projectPath, ".php-version");
    if (!existsSync(dotFile)) return null;
    try {
      return readFileSync(dotFile, "utf-8").trim() || null;
    } catch {
      return null;
    }
  }
}
