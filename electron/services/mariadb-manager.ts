import { join } from "path";
import { existsSync, readdirSync, mkdirSync } from "fs";
import { writeFile, readFile } from "fs/promises";
import { execFile, spawn, type ChildProcess } from "child_process";
import { promisify } from "util";
import { ensureDir, remove } from "fs-extra";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { inject, injectable } from "tsyringe";
import type { IPlatformAdapter } from "../platform/IPlatformAdapter";
import type {
  IDatabaseEngine,
  ProgressCallback,
} from "./interfaces/IDatabaseEngine";
import type {
  DatabaseInstanceConfig,
  DatabaseInstanceStatus,
} from "../types/database";
import { downloadFile } from "../utils/download";

const execFileAsync = promisify(execFile);

interface InstanceEntry {
  config: DatabaseInstanceConfig;
  process: ChildProcess | null;
}

const FALLBACK_VERSIONS = ["11.4.5", "11.4.4", "10.11.11", "10.6.20"];

@injectable()
export class MariaDbManager implements IDatabaseEngine {
  readonly engine = "mariadb";
  readonly displayName = "MariaDB";

  private readonly installDir: string;
  private readonly dataDir: string;
  private readonly instances = new Map<string, InstanceEntry>();

  constructor(
    @inject("IPlatformAdapter") private readonly platform: IPlatformAdapter,
  ) {
    this.installDir = this.platform.getDefaultRuntimeInstallDir("mariadb");
    this.dataDir = this.platform.getDefaultDatabaseDataDir("mariadb");
    if (!existsSync(this.installDir)) {
      mkdirSync(this.installDir, { recursive: true });
    }
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
  }

  async listAvailable(): Promise<string[]> {
    return [...FALLBACK_VERSIONS];
  }

  listInstalled(): Promise<string[]> {
    if (!existsSync(this.installDir)) return Promise.resolve([]);
    const versions = readdirSync(this.installDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    return Promise.resolve(versions);
  }

  async download(
    version: string,
    onProgress?: ProgressCallback,
  ): Promise<void> {
    const versionDir = join(this.installDir, version);
    if (existsSync(versionDir)) {
      throw new Error(`MariaDB ${version} is already installed.`);
    }

    const url = this.platform.getDatabaseDownloadUrl("mariadb", version);
    const tempDir = join(tmpdir(), "horde-mariadb-downloads");
    const zipPath = join(tempDir, `mariadb-${version}.zip`);

    await ensureDir(tempDir);

    await downloadFile(url, zipPath, onProgress);

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
      throw new Error(`MariaDB ${version} is not installed.`);
    }

    for (const [instanceId, entry] of this.instances) {
      if (entry.config.version === version) {
        if (entry.process) await this.stop(instanceId);
        this.instances.delete(instanceId);
      }
    }

    try {
      await execFileAsync("taskkill", ["/F", "/IM", "mariadbd.exe"]);
    } catch {}
    try {
      await execFileAsync("taskkill", ["/F", "/IM", "mysqld.exe"]);
    } catch {}

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await remove(versionDir);
        return;
      } catch (err: any) {
        if (attempt === 4 || (err.code !== "EPERM" && err.code !== "EBUSY")) {
          throw err;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  async initialize(config: DatabaseInstanceConfig): Promise<void> {
    if (!config.instanceId) {
      config.instanceId = randomUUID();
    }

    const versionDir = join(this.installDir, config.version);
    if (!existsSync(versionDir)) {
      throw new Error(`MariaDB ${config.version} is not installed.`);
    }

    const binDir = this.resolveBinDir(versionDir);
    const serverExe = join(
      binDir,
      this.resolveServerBinary(binDir) + this.platform.getBinaryExtension(),
    );

    const datadir =
      config.datadir ||
      join(
        this.dataDir,
        config.version,
        "instances",
        config.instanceId,
        "data",
      );

    if (existsSync(datadir)) {
      await remove(datadir);
    }
    await ensureDir(datadir);

    await execFileAsync(serverExe, [
      "--initialize-insecure",
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
    const binDir = this.resolveBinDir(versionDir);
    const serverExe = join(
      binDir,
      this.resolveServerBinary(binDir) + this.platform.getBinaryExtension(),
    );

    const child = spawn(
      serverExe,
      [
        `--port=${entry.config.port}`,
        `--datadir=${entry.config.datadir}`,
        "--console",
      ],
      {
        stdio: "ignore",
        detached: false,
      },
    );

    child.on("exit", (code) => {
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
    const pid = child.pid;

    if (pid && process.platform === "win32") {
      try {
        await execFileAsync("taskkill", ["/PID", String(pid), "/T", "/F"]);
      } catch {
        try {
          child.kill("SIGTERM");
        } catch {}
      }
    } else {
      child.kill("SIGTERM");

      await new Promise<void>((resolve) => {
        const timeout = setTimeout(() => {
          try {
            child.kill("SIGKILL");
          } catch {}
          resolve();
        }, 5000);

        child.on("exit", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
    }

    entry.process = null;
  }

  async restart(instanceId: string): Promise<void> {
    try {
      await this.stop(instanceId);
    } catch {}
    await this.start(instanceId);
  }

  async getStatus(instanceId: string): Promise<DatabaseInstanceStatus> {
    const entry = this.instances.get(instanceId);
    if (!entry) throw new Error(`Instance ${instanceId} not found.`);

    const running = entry.process !== null && !entry.process.killed;

    return {
      instanceId,
      engine: entry.config.engine,
      displayName: this.displayName,
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
        displayName: this.displayName,
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

  async restoreInstance(config: DatabaseInstanceConfig): Promise<void> {
    this.instances.set(config.instanceId, {
      config: { ...config },
      process: null,
    });
  }

  async createDatabase(instanceId: string, name: string): Promise<void> {
    const entry = this.instances.get(instanceId);
    if (!entry) throw new Error(`Instance ${instanceId} not found.`);
    if (!entry.process || entry.process.killed)
      throw new Error(`Instance ${instanceId} is not running.`);

    const versionDir = join(this.installDir, entry.config.version);
    const clientPath = this.resolveClientPath(versionDir);

    await execFileAsync(clientPath, [
      "-u",
      "root",
      `--port=${entry.config.port}`,
      "--protocol=tcp",
      "-e",
      `CREATE DATABASE \`${name}\`;`,
    ]);
  }

  async dropDatabase(instanceId: string, name: string): Promise<void> {
    const entry = this.instances.get(instanceId);
    if (!entry) throw new Error(`Instance ${instanceId} not found.`);
    if (!entry.process || entry.process.killed)
      throw new Error(`Instance ${instanceId} is not running.`);

    const versionDir = join(this.installDir, entry.config.version);
    const clientPath = this.resolveClientPath(versionDir);

    await execFileAsync(clientPath, [
      "-u",
      "root",
      `--port=${entry.config.port}`,
      "--protocol=tcp",
      "-e",
      `DROP DATABASE \`${name}\`;`,
    ]);
  }

  async listDatabases(instanceId: string): Promise<string[]> {
    const entry = this.instances.get(instanceId);
    if (!entry) throw new Error(`Instance ${instanceId} not found.`);
    if (!entry.process || entry.process.killed)
      throw new Error(`Instance ${instanceId} is not running.`);

    const versionDir = join(this.installDir, entry.config.version);
    const clientPath = this.resolveClientPath(versionDir);

    const { stdout } = await execFileAsync(clientPath, [
      "-u",
      "root",
      `--port=${entry.config.port}`,
      "--protocol=tcp",
      "--skip-column-names",
      "-e",
      "SHOW DATABASES;",
    ]);

    return stdout
      .split("\n")
      .map((s) => s.trim())
      .filter(
        (s) =>
          s.length > 0 &&
          ![
            "information_schema",
            "mysql",
            "performance_schema",
            "sys",
          ].includes(s),
      );
  }

  async exportDatabase(
    instanceId: string,
    databaseName: string,
    targetPath: string,
  ): Promise<void> {
    const entry = this.instances.get(instanceId);
    if (!entry) throw new Error(`Instance ${instanceId} not found.`);
    if (!entry.process || entry.process.killed)
      throw new Error(`Instance ${instanceId} is not running.`);

    const versionDir = join(this.installDir, entry.config.version);
    const binDir = this.resolveBinDir(versionDir);
    const dumpExe = join(
      binDir,
      this.resolveDumpBinary(binDir) + this.platform.getBinaryExtension(),
    );

    const child = spawn(
      dumpExe,
      [
        "-u",
        "root",
        `--port=${entry.config.port}`,
        "--protocol=tcp",
        "--single-transaction",
        "--routines",
        "--triggers",
        databaseName,
      ],
      { stdio: ["ignore", "pipe", "pipe"] },
    );

    const chunks: Buffer[] = [];
    child.stdout?.on("data", (chunk: Buffer) => chunks.push(chunk));

    await new Promise<void>((resolve, reject) => {
      child.on("close", async (code) => {
        if (code === 0) {
          try {
            await writeFile(targetPath, Buffer.concat(chunks));
            resolve();
          } catch (err) {
            reject(new Error(`Failed to write dump file: ${err}`));
          }
        } else {
          reject(new Error(`mariadb-dump exited with code ${code}`));
        }
      });
      child.on("error", reject);
    });
  }

  async importDatabase(
    instanceId: string,
    sourcePath: string,
    databaseName: string,
  ): Promise<void> {
    const entry = this.instances.get(instanceId);
    if (!entry) throw new Error(`Instance ${instanceId} not found.`);
    if (!entry.process || entry.process.killed)
      throw new Error(`Instance ${instanceId} is not running.`);

    const versionDir = join(this.installDir, entry.config.version);
    const clientPath = this.resolveClientPath(versionDir);

    const fileContent = await readFile(sourcePath);

    const child = spawn(
      clientPath,
      [
        "-u",
        "root",
        `--port=${entry.config.port}`,
        "--protocol=tcp",
        databaseName,
      ],
      { stdio: ["pipe", "pipe", "pipe"] },
    );

    child.stdin!.write(fileContent);
    child.stdin!.end();

    await new Promise<void>((resolve, reject) => {
      child.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`mariadb import exited with code ${code}`));
      });
      child.on("error", reject);
    });
  }

  private resolveBinDir(versionDir: string): string {
    const contents = readdirSync(versionDir, { withFileTypes: true });
    for (const entry of contents) {
      if (
        entry.isDirectory() &&
        entry.name.toLowerCase().startsWith("mariadb-")
      ) {
        return join(versionDir, entry.name, "bin");
      }
    }
    return join(versionDir, "bin");
  }

  private resolveServerBinary(binDir: string): string {
    if (existsSync(join(binDir, "mariadbd.exe"))) return "mariadbd";
    return "mysqld";
  }

  private resolveClientBinary(binDir: string): string {
    if (existsSync(join(binDir, "mariadb.exe"))) return "mariadb";
    return "mysql";
  }

  private resolveDumpBinary(binDir: string): string {
    if (existsSync(join(binDir, "mariadb-dump.exe"))) return "mariadb-dump";
    return "mysqldump";
  }

  private resolveClientPath(versionDir: string): string {
    const binDir = this.resolveBinDir(versionDir);
    return join(
      binDir,
      this.resolveClientBinary(binDir) + this.platform.getBinaryExtension(),
    );
  }
}
