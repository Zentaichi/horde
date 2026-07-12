import { join } from 'path';
import { existsSync, readdirSync, mkdirSync, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { execFile, spawn, type ChildProcess } from 'child_process';
import { promisify } from 'util';
import { ensureDir, remove } from 'fs-extra';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { inject, injectable } from 'tsyringe';
import type { IPlatformAdapter } from '../platform/IPlatformAdapter';
import type { IDatabaseEngine, ProgressCallback } from './interfaces/IDatabaseEngine';
import type { DatabaseInstanceConfig, DatabaseInstanceStatus } from '../types/database';

const execFileAsync = promisify(execFile);

interface InstanceEntry {
  config: DatabaseInstanceConfig;
  process: ChildProcess | null;
}

const FALLBACK_VERSIONS = ['8.0.37', '8.0.36', '5.7.44'];

@injectable()
export class MySqlManager implements IDatabaseEngine {
  readonly engine = 'mysql';
  readonly displayName = 'MySQL';

  private readonly installDir: string;
  private readonly dataDir: string;
  private readonly instances = new Map<string, InstanceEntry>();

  constructor(
    @inject('IPlatformAdapter') private readonly platform: IPlatformAdapter,
  ) {
    this.installDir = this.platform.getDefaultRuntimeInstallDir('mysql');
    this.dataDir = this.platform.getDefaultDatabaseDataDir('mysql');
    if (!existsSync(this.installDir)) {
      mkdirSync(this.installDir, { recursive: true });
    }
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async listAvailable(): Promise<string[]> {
    try {
      const url = this.platform.getDatabaseReleasesUrl('mysql');
      const response = await fetch(url);
      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          const data = await response.json();
          if (Array.isArray(data)) return data;
          if (data?.versions && Array.isArray(data.versions)) return data.versions;
        }
      }
    } catch {
      // Fallback to curated list on fetch failure
    }
    return [...FALLBACK_VERSIONS];
  }

  listInstalled(): Promise<string[]> {
    if (!existsSync(this.installDir)) return Promise.resolve([]);
    const versions = readdirSync(this.installDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    return Promise.resolve(versions);
  }

  async download(version: string, onProgress?: ProgressCallback): Promise<void> {
    const versionDir = join(this.installDir, version);
    if (existsSync(versionDir)) {
      throw new Error(`MySQL ${version} is already installed.`);
    }

    const url = this.platform.getDatabaseDownloadUrl('mysql', version);
    const tempDir = join(tmpdir(), 'horde-mysql-downloads');
    const zipPath = join(tempDir, `mysql-${version}.zip`);

    await ensureDir(tempDir);

    await this.downloadFile(url, zipPath, onProgress);

    await ensureDir(versionDir);

    try {
      await this.platform.extractZip(zipPath, versionDir);
    } catch (err) {
      await remove(versionDir).catch(() => {});
      throw new Error(`Extraction failed: ${err}`);
    }
  }

  async uninstall(version: string): Promise<void> {
    const versionDir = join(this.installDir, version);
    if (!existsSync(versionDir)) {
      throw new Error(`MySQL ${version} is not installed.`);
    }

    for (const [instanceId, entry] of this.instances) {
      if (entry.config.version === version) {
        if (entry.process) await this.stop(instanceId);
        this.instances.delete(instanceId);
      }
    }

    await remove(versionDir);
  }

  async initialize(config: DatabaseInstanceConfig): Promise<void> {
    if (!config.instanceId) {
      config.instanceId = randomUUID();
    }

    const versionDir = join(this.installDir, config.version);
    if (!existsSync(versionDir)) {
      throw new Error(`MySQL ${config.version} is not installed.`);
    }

    const mysqldPath = join(this.resolveBinDir(versionDir), 'mysqld' + this.platform.getBinaryExtension());

    const datadir = config.datadir || join(
      this.dataDir,
      config.version,
      'instances',
      config.instanceId,
      'data',
    );

    if (existsSync(datadir)) {
      await remove(datadir);
    }
    await ensureDir(datadir);

    await execFileAsync(mysqldPath, [
      '--initialize-insecure',
      `--datadir=${datadir}`,
    ]);

    config.datadir = datadir;

    this.instances.set(config.instanceId, {
      config: { ...config },
      process: null,
    });
  }

  async start(instanceId: string): Promise<void> {
    const entry = this.instances.get(instanceId);
    if (!entry) throw new Error(`Instance ${instanceId} not found.`);

    if (entry.process) {
      throw new Error(`Instance ${instanceId} is already running.`);
    }

    const versionDir = join(this.installDir, entry.config.version);
    const mysqldPath = join(this.resolveBinDir(versionDir), 'mysqld' + this.platform.getBinaryExtension());

    const child = spawn(mysqldPath, [
      `--port=${entry.config.port}`,
      `--datadir=${entry.config.datadir}`,
      '--console',
    ], {
      stdio: 'ignore',
      detached: false,
    });

    child.on('exit', (code) => {
      const e = this.instances.get(instanceId);
      if (e) e.process = null;
    });

    entry.process = child;
  }

  async stop(instanceId: string): Promise<void> {
    const entry = this.instances.get(instanceId);
    if (!entry || !entry.process) {
      return;
    }

    const child = entry.process;

    child.kill('SIGTERM');

    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch {}
        resolve();
      }, 5000);

      child.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    entry.process = null;
  }

  async restart(instanceId: string): Promise<void> {
    try {
      await this.stop(instanceId);
    } catch {
      // Instance may not be running — proceed to start
    }
    await this.start(instanceId);
  }

  async getStatus(instanceId: string): Promise<DatabaseInstanceStatus> {
    const entry = this.instances.get(instanceId);
    if (!entry) throw new Error(`Instance ${instanceId} not found.`);

    const running = entry.process !== null && !entry.process.killed;

    return {
      instanceId,
      engine: entry.config.engine,
      version: entry.config.version,
      port: entry.config.port,
      running,
      pid: running ? entry.process?.pid : undefined,
    };
  }

  async listInstances(): Promise<DatabaseInstanceStatus[]> {
    const results: DatabaseInstanceStatus[] = [];
    for (const [instanceId, entry] of this.instances) {
      const running = entry.process !== null && !entry.process.killed;
      results.push({
        instanceId,
        engine: entry.config.engine,
        version: entry.config.version,
        port: entry.config.port,
        running,
        pid: running ? entry.process?.pid : undefined,
      });
    }
    return results;
  }

  async removeInstance(instanceId: string): Promise<void> {
    const entry = this.instances.get(instanceId);
    if (!entry) throw new Error(`Instance ${instanceId} not found.`);

    if (entry.process) {
      await this.stop(instanceId);
    }

    this.instances.delete(instanceId);

    if (entry.config.datadir) {
      await remove(entry.config.datadir).catch(() => {});
    }
  }

  async createDatabase(_instanceId: string, _name: string): Promise<void> {
    throw new Error('createDatabase not yet implemented');
  }

  async dropDatabase(_instanceId: string, _name: string): Promise<void> {
    throw new Error('dropDatabase not yet implemented');
  }

  async listDatabases(_instanceId: string): Promise<string[]> {
    throw new Error('listDatabases not yet implemented');
  }

  private resolveBinDir(versionDir: string): string {
    const contents = readdirSync(versionDir, { withFileTypes: true });
    for (const entry of contents) {
      if (entry.isDirectory() && entry.name.toLowerCase().startsWith('mysql-')) {
        return join(versionDir, entry.name, 'bin');
      }
    }
    return join(versionDir, 'bin');
  }

  private async downloadFile(
    url: string,
    destPath: string,
    onProgress?: ProgressCallback,
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
