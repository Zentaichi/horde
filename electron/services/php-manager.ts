import { join } from 'path';
import { app } from 'electron';
import { existsSync, readdirSync, mkdirSync, createWriteStream } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { ensureDir } from 'fs-extra';
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

export class PhpManager {
  private readonly basePath: string;

  constructor() {
    // Wait until the app is ready to call getPath (see main.ts change below)
    this.basePath = join(app.getPath('userData'), 'php');
    if (!existsSync(this.basePath)) {
      mkdirSync(this.basePath, { recursive: true });
    }
  }

  /**
   * Get available PHP versions – correctly parses the nested JSON.
   */
  async getAvailableVersions(): Promise<string[]> {
    const url = 'https://windows.php.net/downloads/releases/releases.json';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch releases: ${response.statusText}`);
    }
    const data = await response.json();

    const versions: string[] = [];
    for (const key of Object.keys(data)) {
      const entry = data[key];
      // Each top‑level entry has a "version" field, e.g. "8.3.32"
      if (entry && typeof entry === 'object' && typeof entry.version === 'string') {
        versions.push(entry.version);
      }
    }

    // Sort descending (newest first)
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
   * Download a PHP zip and extract it.
   */
  async downloadVersion(
    version: string,
    onProgress?: (info: ProgressInfo) => void
  ): Promise<void> {
    const zipUrl = `https://windows.php.net/downloads/releases/php-${version}-nts-Win32-vs16-x64.zip`;
    const tempDir = join(tmpdir(), 'horde-php-downloads');
    const zipPath = join(tempDir, `php-${version}.zip`);
    const extractPath = join(this.basePath, version);

    await ensureDir(tempDir);

    if (existsSync(extractPath)) {
      throw new Error(`PHP ${version} is already installed.`);
    }

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

        // Pipe directly to the file
        await pipeline(nodeReadable, writer);
    }
}