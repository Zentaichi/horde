import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { inject, injectable } from 'tsyringe';
import { SettingsStore } from './settings-store';
import type { Project } from '../types/project';
import type { IProjectManager } from './interfaces/IProjectManager';

@injectable()
export class ProjectManager implements IProjectManager {
  constructor(
    @inject(SettingsStore) private readonly settingsStore: SettingsStore,
  ) {}

  list(): Project[] {
    return this.settingsStore.loadProjects();
  }

  add(name: string, path: string): Project {
    const project: Project = {
      id: randomUUID(),
      name: name || path.split(/[\\/]/).pop() || path,
      path,
    };

    project.phpVersion = this.readPhpVersionFile(path) ?? undefined;
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
    this.settingsStore.saveProject(project);
    return version;
  }

  scanAll(): void {
    const projects = this.settingsStore.loadProjects();
    for (const project of projects) {
      const version = this.readPhpVersionFile(project.path);
      project.phpVersion = version ?? undefined;
      this.settingsStore.saveProject(project);
    }
  }

  findById(id: string): Project | undefined {
    return this.settingsStore.loadProjects().find((p) => p.id === id);
  }

  private readPhpVersionFile(projectPath: string): string | null {
    const dotFile = join(projectPath, '.php-version');
    if (!existsSync(dotFile)) return null;
    try {
      return readFileSync(dotFile, 'utf-8').trim() || null;
    } catch {
      return null;
    }
  }
}
