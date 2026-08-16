import { app } from "electron";
import Database from "better-sqlite3";
import { join } from "path";
import { ensureDirSync } from "fs-extra";
import { injectable, singleton } from "tsyringe";
import type { DatabaseInstanceConfig } from "../types/database";
import type { Project } from "../types/project";

interface Migration {
  version: number;
  name: string;
  up: string;
}

const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "phase4-project-site-fields",
    up: `
      ALTER TABLE projects ADD COLUMN domains TEXT;
      ALTER TABLE projects ADD COLUMN ssl_enabled INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE projects ADD COLUMN proxy_port INTEGER;
    `,
  },
];

@injectable()
@singleton()
export class SettingsStore {
  private db!: Database.Database;

  constructor() {
    const dbDir = join(app.getPath("userData"), "data");
    ensureDirSync(dbDir);
    const dbPath = join(dbDir, "horde.db");
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
    this.createTables();
    this.migrate();
  }

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS instances (
        instance_id TEXT PRIMARY KEY,
        engine      TEXT NOT NULL,
        version     TEXT NOT NULL,
        port        INTEGER NOT NULL,
        datadir     TEXT NOT NULL,
        label       TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS projects (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        path        TEXT NOT NULL UNIQUE,
        php_version TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  private migrate(): void {
    const raw = this.db.pragma("user_version", { simple: true }) as number;
    let current = Number.isFinite(raw) ? raw : 0;

    for (const migration of MIGRATIONS) {
      if (migration.version <= current) continue;
      this.db.transaction(() => {
        this.db.exec(migration.up);
        this.db.pragma(`user_version = ${migration.version}`);
      })();
      current = migration.version;
    }
  }

  get(key: string): string | null {
    const row = this.db
      .prepare("SELECT value FROM settings WHERE key = ?")
      .get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    this.db
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)")
      .run(key, value);
  }

  saveInstance(config: DatabaseInstanceConfig): void {
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO instances (instance_id, engine, version, port, datadir, label)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        config.instanceId,
        config.engine,
        config.version,
        config.port,
        config.datadir || "",
        config.label || null
      );
  }

  deleteInstance(instanceId: string): void {
    this.db
      .prepare("DELETE FROM instances WHERE instance_id = ?")
      .run(instanceId);
  }

  loadInstances(): DatabaseInstanceConfig[] {
    const rows = this.db.prepare("SELECT * FROM instances").all() as Array<{
      instance_id: string;
      engine: string;
      version: string;
      port: number;
      datadir: string;
      label: string | null;
    }>;

    return rows.map((r) => ({
      instanceId: r.instance_id,
      engine: r.engine,
      version: r.version,
      port: r.port,
      datadir: r.datadir,
      label: r.label ?? undefined,
    }));
  }

  saveProject(project: Project): void {
    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO projects (id, name, path, php_version, domains, ssl_enabled, proxy_port)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        project.id,
        project.name,
        project.path,
        project.phpVersion || null,
        project.domains ? JSON.stringify(project.domains) : null,
        project.sslEnabled ? 1 : 0,
        project.proxyPort ?? null
      );
  }

  deleteProject(id: string): void {
    this.db.prepare("DELETE FROM projects WHERE id = ?").run(id);
  }

  loadProjects(): Project[] {
    const rows = this.db.prepare("SELECT * FROM projects").all() as Array<{
      id: string;
      name: string;
      path: string;
      php_version: string | null;
      domains: string | null;
      ssl_enabled: number;
      proxy_port: number | null;
    }>;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      path: r.path,
      phpVersion: r.php_version ?? undefined,
      domains: r.domains ? JSON.parse(r.domains) : undefined,
      sslEnabled: r.ssl_enabled ? true : undefined,
      proxyPort: r.proxy_port ?? undefined,
    }));
  }

  close(): void {
    this.db.close();
  }
}
