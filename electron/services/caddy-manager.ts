import { join } from "path";
import { existsSync } from "fs";
import { ensureDir, remove, writeFile } from "fs-extra";
import { tmpdir } from "os";
import { spawn, execFile, type ChildProcess } from "child_process";
import { promisify } from "util";
import { inject, injectable, singleton } from "tsyringe";
import type { IPlatformAdapter } from "../platform/IPlatformAdapter";
import type { ProxyRoute, ProxyStatus } from "../types/proxy";
import type {
  IServiceProvider,
  ServiceStatus,
} from "./interfaces/IServiceRegistry";
import type { ICaddyManager } from "./interfaces/ICaddyManager";
import { SettingsStore } from "./settings-store";
import { downloadFile } from "../utils/download";
import { findFreePort, isPortOpen } from "../utils/ports";

const execFileAsync = promisify(execFile);

const CADDY_VERSION = "2.9.1";
const MAX_LOG_LINES = 500;

interface CaddyEntry {
  process: ChildProcess | null;
  pid?: number;
  port: number;
  httpsPort: number;
  adminPort: number;
  logBuffer: string[];
}

@injectable()
@singleton()
export class CaddyManager implements ICaddyManager, IServiceProvider {
  readonly providerId = "proxy";
  readonly displayName = "Horde Proxy";

  private entry: CaddyEntry | null = null;
  private routes: ProxyRoute[] = [];

  constructor(
    @inject("IPlatformAdapter") private readonly platform: IPlatformAdapter,
    @inject(SettingsStore) private readonly settings: SettingsStore
  ) {}

  private get installDir(): string {
    return this.platform.getDefaultRuntimeInstallDir("caddy");
  }

  private get binaryPath(): string {
    return join(this.installDir, "caddy" + this.platform.getBinaryExtension());
  }

  private get configDir(): string {
    return this.platform.getProxyDir();
  }

  private get configPath(): string {
    return join(this.configDir, "Caddyfile");
  }

  private get certDir(): string {
    return this.platform.getCertStoreDir();
  }

  async getStatus(): Promise<ProxyStatus> {
    const entry = this.entry;
    return {
      running: !!entry?.process,
      port: entry?.port ?? this.persistedPort("proxy_http_port", 80),
      httpsPort:
        entry?.httpsPort ?? this.persistedPort("proxy_https_port", 443),
      pid: entry?.process?.pid,
    };
  }

  async start(): Promise<void> {
    await this.ensureBinary();
    if (this.entry?.process) return;

    const { port, httpsPort, adminPort } = await this.resolvePorts();
    this.entry = { process: null, port, httpsPort, adminPort, logBuffer: [] };

    await this.writeConfig();
    this.spawnRun();
    await this.waitForAdmin(adminPort);
    this.persistPorts();
  }

  async stop(): Promise<void> {
    const entry = this.entry;
    if (!entry) return;

    try {
      await this.runBinary([
        "stop",
        "--address",
        `127.0.0.1:${entry.adminPort}`,
      ]);
    } catch {
      // Fall through to process-tree kill
    }

    if (entry.process?.pid) {
      await this.platform.killProcessTree(entry.process.pid);
    }
    entry.process = null;
    this.entry = null;
  }

  async setRoutes(routes: ProxyRoute[]): Promise<void> {
    this.routes = routes;
    if (!this.entry?.process) {
      if (routes.length === 0) return;
      await this.start();
      return;
    }
    await this.writeConfig();
    await this.reload();
  }

  async getLogs(tail?: number): Promise<string[]> {
    const buffer = this.entry?.logBuffer ?? [];
    if (tail && tail > 0) return buffer.slice(-tail);
    return [...buffer];
  }

  async getStatuses(): Promise<ServiceStatus[]> {
    const status = await this.getStatus();
    return [
      {
        serviceId: "proxy:caddy",
        providerId: this.providerId,
        displayName: "Caddy (Horde proxy)",
        running: status.running,
        pid: status.pid,
        port: status.port,
      },
    ];
  }

  async reattachOrphans(): Promise<void> {
    if (this.entry?.process) return;
    const port = this.persistedPort("proxy_http_port", 80);
    const httpsPort = this.persistedPort("proxy_https_port", 443);
    const adminPort = this.persistedPort("proxy_admin_port", 2019);
    if (await isPortOpen(port)) {
      this.entry = { process: null, port, httpsPort, adminPort, logBuffer: [] };
    }
  }

  private async ensureBinary(): Promise<void> {
    if (existsSync(this.binaryPath)) return;
    await ensureDir(this.installDir);
    const url = this.platform.getCaddyDownloadUrl(CADDY_VERSION);
    const tmpZip = join(tmpdir(), `horde-caddy-${CADDY_VERSION}.zip`);
    await downloadFile(url, tmpZip);
    try {
      await this.platform.extractZip(tmpZip, this.installDir);
    } finally {
      await remove(tmpZip);
    }
    if (!existsSync(this.binaryPath)) {
      throw new Error("Caddy binary not found after extraction.");
    }
  }

  private async resolvePorts(): Promise<{
    port: number;
    httpsPort: number;
    adminPort: number;
  }> {
    let port = this.platform.canBindLowPorts() ? 80 : 8080;
    if (await isPortOpen(port)) port = await findFreePort(8080);

    let httpsPort = this.platform.canBindLowPorts() ? 443 : 8443;
    if (await isPortOpen(httpsPort)) httpsPort = await findFreePort(8443);

    const adminPort = await findFreePort(2019, 50);
    return { port, httpsPort, adminPort };
  }

  private async writeConfig(): Promise<void> {
    await ensureDir(this.configDir);
    const content = this.generateConfig();
    await writeFile(this.configPath, content, "utf-8");
  }

  private generateConfig(): string {
    const entry = this.entry;
    if (!entry) return "";
    const eol = this.platform.getHostsFileEol();
    const cert = join(this.certDir, "wildcard.test.pem");
    const key = join(this.certDir, "wildcard.test-key.pem");

    const lines: string[] = [];
    lines.push("{");
    lines.push(`  admin 127.0.0.1:${entry.adminPort}`);
    lines.push(`  http_port ${entry.port}`);
    lines.push(`  https_port ${entry.httpsPort}`);
    lines.push("}");
    lines.push("");

    for (const route of this.routes) {
      lines.push(`${route.domain} {`);
      if (route.ssl) {
        lines.push(`  tls ${cert} ${key}`);
      }
      lines.push(`  reverse_proxy ${route.target}`);
      lines.push("}");
      lines.push("");
    }

    lines.push(`:${entry.port} {`);
    lines.push(
      '  respond "Horde reverse proxy is running. No site configured for this host." 200'
    );
    lines.push("}");

    return lines.join(eol) + eol;
  }

  private spawnRun(): void {
    const entry = this.entry!;
    const child = spawn(
      this.binaryPath,
      ["run", "--config", this.configPath, "--adapter", "caddyfile"],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    const onData = (data: Buffer) => {
      const lines = data
        .toString()
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      for (const line of lines) {
        entry.logBuffer.push(line);
        if (entry.logBuffer.length > MAX_LOG_LINES) {
          entry.logBuffer.shift();
        }
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("exit", () => {
      if (this.entry?.process === child) this.entry.process = null;
    });

    entry.process = child;
    entry.pid = child.pid;
  }

  private async waitForAdmin(adminPort: number): Promise<void> {
    for (let i = 0; i < 40; i++) {
      if (await isPortOpen(adminPort)) return;
      await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error("Caddy did not start its admin API in time.");
  }

  private async reload(): Promise<void> {
    const entry = this.entry!;
    await this.runBinary([
      "validate",
      "--config",
      this.configPath,
      "--adapter",
      "caddyfile",
    ]);
    await this.runBinary([
      "reload",
      "--config",
      this.configPath,
      "--adapter",
      "caddyfile",
      "--address",
      `127.0.0.1:${entry.adminPort}`,
    ]);
  }

  private async runBinary(args: string[]): Promise<void> {
    await execFileAsync(this.binaryPath, args);
  }

  private persistPorts(): void {
    const entry = this.entry!;
    this.settings.set("proxy_http_port", String(entry.port));
    this.settings.set("proxy_https_port", String(entry.httpsPort));
    this.settings.set("proxy_admin_port", String(entry.adminPort));
  }

  private persistedPort(key: string, fallback: number): number {
    const raw = this.settings.get(key);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  }
}
