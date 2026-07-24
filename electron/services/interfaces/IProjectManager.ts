import type { Project } from '../../types/project';

export interface IProjectManager {
  list(): Project[];
  add(name: string, path: string): Project;
  remove(id: string): void;
  scanPhpVersion(id: string): string | null;
  scanAll(): void;
}
