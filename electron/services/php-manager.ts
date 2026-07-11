import { join } from 'path';
import { app } from 'electron';
import { existsSync, readdirSync, mkdirSync, createWriteStream } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { ensureDir, remove } from 'fs-extra';
import { tmpdir } from 'os';

const execFileAsync = promisify(execFile);

export interface ProgressInfo {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
}

export interface PhpVersion {
  version: string;
  path: string;
  installed: boolean;
}

interface PhpRelease {
  version: string;
  [key: string]: any; // e.g. "nts-vs16-x64", "ts-vs17-x86", etc.
}

export class PhpManager {
  private readonly basePath: string;
  private releasesCache: Record<string, PhpRelease> | null = null;

  constructor() {
    this.basePath = join(app.getPath('userData'), 'php');
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * Fetch releases JSON if not already cached.
   */
  private async fetchReleases(): Promise<Record<string, PhpRelease>> {
    if (this.releasesCache) return this.releasesCache;

    const url = 'https://windows.php.net/downloads/releases/releases.json';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch releases: ${response.statusText}`);
    }
    const data = await response.json();
    this.releasesCache = data;
    return data;
  }

  /**
   * Get available PHP versions – sorted newest first.
   */
  async getAvailableVersions(): Promise<string[]> {
    const data = await this.fetchReleases();
    const versions: string[] = [];

    for (const key of Object.keys(data)) {
      const entry = data[key];
      if (entry && typeof entry === 'object' && typeof entry.version === 'string') {
        versions.push(entry.version);
      }
    }
    return versions.sort((a, b) => (b > a ? 1 : -1));
  }

  /**
   * List locally installed PHP versions.
   */
  getInstalledVersions(): PhpVersion[] {
    if (!existsSync(this.basePath)) return [];

    return readdirSync(this.basePath, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => ({
        version: dirent.name,
        path: join(this.basePath, dirent.name),
        installed: true,
      }));
  }

  /**
   * Find the download URL for a given version.
   * Priority: nts x64, then any nts, then first available.
   */
  private async getDownloadUrl(version: string): Promise<string> {
    const releases = await this.fetchReleases();
    let targetRelease: PhpRelease | undefined;

    // Find the release object that has the exact "version" field
    for (const key of Object.keys(releases)) {
      if (releases[key]?.version === version) {
        targetRelease = releases[key];
        break;
      }
    }

    if (!targetRelease) {
      throw new Error(`Version ${version} not found in releases.`);
    }

    // Preferred: nts x64
    const preferredArch = Object.keys(targetRelease).find(
      (k) => k.startsWith('nts-') && k.endsWith('-x64')
    );
    if (preferredArch && targetRelease[preferredArch]?.zip?.path) {
      const zipPath = targetRelease[preferredArch].zip.path;
      return `https://windows.php.net/downloads/releases/${zipPath}`;
    }

    // Fallback: any nts build
    const anyNts = Object.keys(targetRelease).find(
      (k) => k.startsWith('nts-') && targetRelease[k]?.zip?.path
    );
    if (anyNts && targetRelease[anyNts]?.zip?.path) {
      const zipPath = targetRelease[anyNts].zip.path;
      return `https://windows.php.net/downloads/releases/${zipPath}`;
    }

    // Last resort: any build with a zip
    const anyBuild = Object.keys(targetRelease).find(
      (k) => targetRelease[k]?.zip?.path
    );
    if (anyBuild && targetRelease[anyBuild]?.zip?.path) {
      const zipPath = targetRelease[anyBuild].zip.path;
      return `https://windows.php.net/downloads/releases/${zipPath}`;
    }

    throw new Error(`No downloadable zip found for PHP ${version}.`);
  }

  /**
   * Download and extract a specific PHP version.
   */
  async downloadVersion(
    version: string,
    onProgress?: (info: ProgressInfo) => void
  ): Promise<void> {
    const extractPath = join(this.basePath, version);
    if (existsSync(extractPath)) {
      throw new Error(`PHP ${version} is already installed.`);
    }

    const zipUrl = await this.getDownloadUrl(version);
    const tempDir = join(tmpdir(), 'horde-php-downloads');
    const zipPath = join(tempDir, `php-${version}.zip`);

    await ensureDir(tempDir);

    // Download with progress
    await this.downloadFile(zipUrl, zipPath, onProgress);

    // Extract via PowerShell
    try {
      await execFileAsync('powershell', [
        '-Command',
        `Expand-Archive -Path '${zipPath}' -DestinationPath '${extractPath}' -Force`,
      ]);
    } catch (err) {
      throw new Error(`Extraction failed: ${err}`);
    }
  }

  /**
   * Return the currently active Horde-managed PHP version from PATH.
   */
  getActiveVersion(): string | null {
    const entries = (process.env.PATH || '').split(';');
    for (const entry of entries) {
      if (entry.startsWith(this.basePath)) {
        const relative = entry.slice(this.basePath.length).replace(/^[\\/]+/, '');
        const version = relative.split(/[\\/]/)[0];
        if (version) return version;
      }
    }
    return null;
  }

  /**
   * Set a PHP version as the global default by updating the user PATH.
   */
  async switchGlobal(version: string): Promise<void> {
    const versionPath = join(this.basePath, version);
    if (!existsSync(versionPath)) {
      throw new Error(`PHP ${version} is not installed.`);
    }

    const currentPath = await this.readUserPath();
    const entries = this.filterHordeEntries(currentPath.split(';').filter(Boolean));

    entries.unshift(versionPath);

    await this.writeUserPath(entries);
  }

  /**
   * Uninstall a PHP version: clean PATH if active, then delete the directory.
   */
  async uninstallVersion(version: string): Promise<void> {
    const versionPath = join(this.basePath, version);
    if (!existsSync(versionPath)) {
      throw new Error(`PHP ${version} is not installed.`);
    }

    const activeVersion = this.getActiveVersion();
    if (activeVersion === version) {
      const currentPath = await this.readUserPath();
      const entries = this.filterHordeEntries(currentPath.split(';').filter(Boolean));
      await this.writeUserPath(entries);
    }

    await remove(versionPath);
  }

  private async readUserPath(): Promise<string> {
    try {
      const { stdout } = await execFileAsync('reg', [
        'query', 'HKCU\\Environment', '/v', 'PATH',
      ]);
      const match = stdout.match(/PATH\s+REG_\w+\s+(.+)/);
      return match ? match[1].trim() : '';
    } catch {
      return '';
    }
  }

  private filterHordeEntries(entries: string[]): string[] {
    return entries.filter(
      (entry) => !entry.includes('Horde\\php') && !entry.includes('Horde/php'),
    );
  }

  private async writeUserPath(entries: string[]): Promise<void> {
    const newPath = entries.join(';');
    await execFileAsync('setx', ['PATH', newPath]);
    process.env.PATH = newPath;
  }

  /**
   * Helper: download file with progress callbacks.
   */
  private async downloadFile(
    url: string,
    destPath: string,
    onProgress?: (info: ProgressInfo) => void
  ): Promise<void> {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const totalBytes = Number(response.headers.get('content-length')) || 0;
    let transferredBytes = 0;

    const writer = createWriteStream(destPath);

    // Convert web ReadableStream to Node.js Readable
    const nodeReadable = Readable.fromWeb(response.body as any);

    // Track progress by listening to 'data' events
    if (onProgress && totalBytes > 0) {
      nodeReadable.on('data', (chunk: Buffer) => {
        transferredBytes += chunk.length;
        onProgress({
          percent: Math.round((transferredBytes / totalBytes) * 100),
          transferredBytes,
          totalBytes,
        });
      });
    }

    await pipeline(nodeReadable, writer);
  }
}