import type { PhpVersion, DownloadProgress } from "../../types/php";

export interface IPhpManager {
  getAvailableVersions(): Promise<string[]>;
  getInstalledVersions(): PhpVersion[];
  downloadVersion(
    version: string,
    onProgress?: (info: DownloadProgress) => void,
  ): Promise<void>;
  getActiveVersion(): string | null;
  switchGlobal(version: string): Promise<void>;
  uninstallVersion(version: string): Promise<void>;
  findPhpInPath(): { version: string; binary: string } | null;
  isVersionInstalled(version: string): boolean;
}
