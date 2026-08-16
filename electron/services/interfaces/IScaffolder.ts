import type { ScaffoldOptions } from "../../types/scaffold";

export interface IScaffolder {
  readonly id: string;
  readonly displayName: string;
  readonly minPhpVersion: string;
  createProject(
    options: ScaffoldOptions,
    onLog?: (line: string) => void
  ): Promise<{ path: string }>;
}
