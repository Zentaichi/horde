import { injectable } from 'tsyringe';
import type { IProjectManager } from '../interfaces/IProjectManager';
import type { Project } from '../../types/project';

@injectable()
export class MockProjectManager implements IProjectManager {
  private projects: Project[] = [
    { id: 'mock-project-1', name: 'MyApp', path: '/mock/projects/myapp', phpVersion: '8.2' },
    { id: 'mock-project-2', name: 'API', path: '/mock/projects/api' },
  ];

  list(): Project[] {
    return [...this.projects];
  }

  add(name: string, path: string): Project {
    const project: Project = { id: `mock-${Date.now()}`, name, path };
    this.projects.push(project);
    return project;
  }

  remove(id: string): void {
    this.projects = this.projects.filter((p) => p.id !== id);
  }

  scanPhpVersion(id: string): string | null {
    const project = this.projects.find((p) => p.id === id);
    if (!project) throw new Error(`Project ${id} not found.`);
    return project.phpVersion ?? null;
  }

  scanAll(): void {}
}
