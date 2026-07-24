import { injectable } from 'tsyringe';
import type { IPhpManager } from '../interfaces/IPhpManager';
import type { PhpVersion, DownloadProgress } from '../../types/php';

const MOCK_VERSIONS = ['8.3.10', '8.2.22', '8.1.29', '8.0.30', '7.4.33'];

@injectable()
export class MockPhpManager implements IPhpManager {
  private installed = new Map<string, PhpVersion>();
  private active: string | null = null;

  async getAvailableVersions(): Promise<string[]> {
    return [...MOCK_VERSIONS];
  }

  getInstalledVersions(): PhpVersion[] {
    return Array.from(this.installed.values());
  }

  async downloadVersion(version: string, onProgress?: (info: DownloadProgress) => void): Promise<void> {
    if (this.installed.has(version)) {
      throw new Error(`PHP ${version} is already installed.`);
    }

    if (onProgress) {
      for (let i = 0; i <= 100; i += 20) {
        onProgress({ percent: i, transferredBytes: i * 100000, totalBytes: 10000000 });
        await new Promise((r) => setTimeout(r, 50));
      }
    }

    this.installed.set(version, { version, path: `/mock/php/${version}`, installed: true });
  }

  getActiveVersion(): string | null {
    return this.active;
  }

  async switchGlobal(version: string): Promise<void> {
    if (!this.installed.has(version)) {
      throw new Error(`PHP ${version} is not installed.`);
    }
    this.active = version;
  }

  async uninstallVersion(version: string): Promise<void> {
    if (!this.installed.has(version)) {
      throw new Error(`PHP ${version} is not installed.`);
    }
    if (this.active === version) this.active = null;
    this.installed.delete(version);
  }
}
