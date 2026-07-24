import { join } from 'path';
import { spawn, type ChildProcess } from 'child_process';
import { existsSync } from 'fs';
import { createServer } from 'net';
import { inject, injectable } from 'tsyringe';
import type { IPlatformAdapter } from '../platform/IPlatformAdapter';
import type { IPhpManager } from './interfaces/IPhpManager';
import type { IProjectManager } from './interfaces/IProjectManager';
import type { IDevServerManager } from './interfaces/IDevServerManager';
import type { IServiceProvider, ServiceStatus } from './interfaces/IServiceRegistry';
import type { DevServerStatus } from '../types/devserver';

interface ServerEntry {
  projectId: string;
  projectName: string;
  docroot: string;
  phpVersion: string;
  port: number;
  process: ChildProcess | null;
  logBuffer: string[];
}

@injectable()
export class DevServerManager implements IDevServerManager, IServiceProvider {
  readonly providerId = 'devserver';
  readonly displayName = 'Dev Servers';

  private readonly servers = new Map<string, ServerEntry>();
  private readonly MAX_LOG_LINES = 500;

  constructor(
    @inject('IPlatformAdapter') private readonly platform: IPlatformAdapter,
    @inject('IPhpManager') private readonly phpManager: IPhpManager,
    @inject('IProjectManager') private readonly projectManager: IProjectManager,
  ) {}

  async start(projectId: string, port?: number): Promise<DevServerStatus> {
    if (this.servers.has(projectId)) {
      throw new Error('Dev server is already running for this project.');
    }

    const project = this.projectManager.list().find((p) => p.id === projectId);
    if (!project) throw new Error(`Project ${projectId} not found.`);

    const phpVersion = project.phpVersion || this.phpManager.getActiveVersion();
    if (!phpVersion) throw new Error('No PHP version available.');

    const basePath = this.platform.getDefaultRuntimeInstallDir('php');
    const phpBinary = join(basePath, phpVersion, 'php' + this.platform.getBinaryExtension());
    if (!existsSync(phpBinary)) {
      throw new Error(`PHP ${phpVersion} is not installed.`);
    }

    const assignedPort = port || (await this.findFreePort());
    const docroot = project.path;

    const child = spawn(phpBinary, [
      '-S', `localhost:${assignedPort}`,
      '-t', docroot,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const entry: ServerEntry = {
      projectId,
      projectName: project.name,
      docroot,
      phpVersion,
      port: assignedPort,
      process: child,
      logBuffer: [],
    };

    child.stdout?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter((l) => l.trim());
      for (const line of lines) {
        entry.logBuffer.push(line);
        if (entry.logBuffer.length > this.MAX_LOG_LINES) {
          entry.logBuffer.shift();
        }
      }
    });

    child.stderr?.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter((l) => l.trim());
      for (const line of lines) {
        entry.logBuffer.push(line);
        if (entry.logBuffer.length > this.MAX_LOG_LINES) {
          entry.logBuffer.shift();
        }
      }
    });

    child.on('exit', () => {
      const e = this.servers.get(projectId);
      if (e) e.process = null;
    });

    this.servers.set(projectId, entry);

    return {
      projectId,
      projectName: project.name,
      docroot,
      phpVersion,
      port: assignedPort,
      running: true,
      pid: child.pid ?? undefined,
    };
  }

  async stop(projectId: string): Promise<void> {
    const entry = this.servers.get(projectId);
    if (!entry) return;

    if (entry.process) {
      const child = entry.process;
      if (child.pid && process.platform === 'win32') {
        const { execFile } = await import('child_process');
        const { promisify } = await import('util');
        const execFileAsync = promisify(execFile);
        try {
          await execFileAsync('taskkill', ['/PID', String(child.pid), '/T', '/F']);
        } catch {
          try { child.kill('SIGTERM'); } catch {}
        }
      } else {
        child.kill('SIGTERM');
      }
      entry.process = null;
    }

    this.servers.delete(projectId);
  }

  async getStatus(projectId: string): Promise<DevServerStatus | null> {
    const entry = this.servers.get(projectId);
    if (!entry) return null;

    const running = entry.process !== null && !entry.process.killed;

    return {
      projectId: entry.projectId,
      projectName: entry.projectName,
      docroot: entry.docroot,
      phpVersion: entry.phpVersion,
      port: entry.port,
      running,
      pid: running ? entry.process?.pid : undefined,
    };
  }

  async listAll(): Promise<DevServerStatus[]> {
    const results: DevServerStatus[] = [];
    for (const [projectId] of this.servers) {
      const status = await this.getStatus(projectId);
      if (status) results.push(status);
    }
    return results;
  }

  getLogs(projectId: string, tail?: number): Promise<string[]> {
    const entry = this.servers.get(projectId);
    if (!entry) return Promise.resolve([]);

    const logs = entry.logBuffer;
    if (tail && tail > 0) {
      return Promise.resolve(logs.slice(-tail));
    }
    return Promise.resolve([...logs]);
  }

  async getStatuses(): Promise<ServiceStatus[]> {
    const all = await this.listAll();
    return all.map((s) => ({
      serviceId: `${this.providerId}:${s.projectId}`,
      providerId: this.providerId,
      displayName: `${s.projectName} (PHP ${s.phpVersion})`,
      running: s.running,
      pid: s.pid,
      port: s.port,
    }));
  }

  private findFreePort(startPort: number = 8080): Promise<number> {
    return new Promise((resolve, reject) => {
      let port = startPort;
      const maxPort = startPort + 100;

      function tryPort(): void {
        if (port > maxPort) {
          return reject(new Error('No free ports available.'));
        }

        const server = createServer();
        server.listen(port, '127.0.0.1', () => {
          server.close(() => resolve(port));
        });
        server.on('error', () => {
          port++;
          tryPort();
        });
      }

      tryPort();
    });
  }
}
