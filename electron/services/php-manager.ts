import { join } from 'path';
import { existsSync, readdirSync, mkdirSync, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { ensureDir, remove } from 'fs-extra';
import { tmpdir } from 'os';
import { inject, injectable } from 'tsyringe';
import type { IPlatformAdapter } from '../platform/IPlatformAdapter';
import type { IPhpManager } from './interfaces/IPhpManager';
import type { PhpVersion, DownloadProgress } from '../types/php';

interface PhpRelease {
  version: string;
  [key: string]: any;
}

@injectable()
export class PhpManager implements IPhpManager {
  private readonly basePath: string;
  private releasesCache: Record<string, PhpRelease> | null = null;

  constructor(
    @inject('IPlatformAdapter') private readonly platform: IPlatformAdapter,
  ) {
    this.basePath = this.platform.getDefaultRuntimeInstallDir('php');
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

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

  async downloadVersion(
    version: string,
    onProgress?: (info: DownloadProgress) => void,
  ): Promise<void> {
    const extractPath = join(this.basePath, version);
    if (existsSync(extractPath)) {
      throw new Error(`PHP ${version} is already installed.`);
    }

    const zipUrl = await this.getDownloadUrl(version);
    const tempDir = join(tmpdir(), 'horde-php-downloads');
    const zipPath = join(tempDir, `php-${version}.zip`);

    await ensureDir(tempDir);

    await this.downloadFile(zipUrl, zipPath, onProgress);

    try {
      await this.platform.extractZip(zipPath, extractPath);
    } catch (err) {
      throw new Error(`Extraction failed: ${err}`);
    }
  }

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

  async switchGlobal(version: string): Promise<void> {
    const versionPath = join(this.basePath, version);
    if (!existsSync(versionPath)) {
      throw new Error(`PHP ${version} is not installed.`);
    }

    const entries = await this.platform.getPathEntries();
    const cleaned = this.filterHordeEntries(entries);
    cleaned.unshift(versionPath);

    await this.platform.writePathEntries(cleaned);
  }

  async uninstallVersion(version: string): Promise<void> {
    const versionPath = join(this.basePath, version);
    if (!existsSync(versionPath)) {
      throw new Error(`PHP ${version} is not installed.`);
    }

    const activeVersion = this.getActiveVersion();
    if (activeVersion === version) {
      const entries = await this.platform.getPathEntries();
      const cleaned = this.filterHordeEntries(entries);
      await this.platform.writePathEntries(cleaned);
    }

    await remove(versionPath);
  }

  private async fetchReleases(): Promise<Record<string, PhpRelease>> {
    if (this.releasesCache) return this.releasesCache;

    const url = this.platform.getPhpReleasesUrl();
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch releases: ${response.statusText}`);
    }
    const data = await response.json();
    this.releasesCache = data;
    return data;
  }

  private async getDownloadUrl(version: string): Promise<string> {
    const releases = await this.fetchReleases();
    let targetRelease: PhpRelease | undefined;

    for (const key of Object.keys(releases)) {
      if (releases[key]?.version === version) {
        targetRelease = releases[key];
        break;
      }
    }

    if (!targetRelease) {
      throw new Error(`Version ${version} not found in releases.`);
    }

    const preferredArch = Object.keys(targetRelease).find(
      (k) => k.startsWith('nts-') && k.endsWith('-x64'),
    );
    if (preferredArch && targetRelease[preferredArch]?.zip?.path) {
      return this.platform.getPhpDownloadUrl(targetRelease[preferredArch].zip.path);
    }

    const anyNts = Object.keys(targetRelease).find(
      (k) => k.startsWith('nts-') && targetRelease[k]?.zip?.path,
    );
    if (anyNts && targetRelease[anyNts]?.zip?.path) {
      return this.platform.getPhpDownloadUrl(targetRelease[anyNts].zip.path);
    }

    const anyBuild = Object.keys(targetRelease).find(
      (k) => targetRelease[k]?.zip?.path,
    );
    if (anyBuild && targetRelease[anyBuild]?.zip?.path) {
      return this.platform.getPhpDownloadUrl(targetRelease[anyBuild].zip.path);
    }

    throw new Error(`No downloadable zip found for PHP ${version}.`);
  }

  private filterHordeEntries(entries: string[]): string[] {
    return entries.filter(
      (entry) => !entry.includes('Horde\\php') && !entry.includes('Horde/php'),
    );
  }

  private async downloadFile(
    url: string,
    destPath: string,
    onProgress?: (info: DownloadProgress) => void,
  ): Promise<void> {
    const response = await fetch(url);
    if (!response.ok || !response.body) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const totalBytes = Number(response.headers.get('content-length')) || 0;
    let transferredBytes = 0;

    const writer = createWriteStream(destPath);
    const nodeReadable = Readable.fromWeb(response.body as any);

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
