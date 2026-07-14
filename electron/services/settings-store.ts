import { app } from 'electron';
import Database from 'better-sqlite3';
import { join } from 'path';
import { ensureDir } from 'fs-extra';
import { injectable, singleton } from 'tsyringe';
import type { DatabaseInstanceConfig } from '../types/database';

@injectable()
@singleton()
export class SettingsStore {
  private db!: Database.Database;

  constructor() {
    const dbDir = join(app.getPath('userData'), 'data');
    ensureDir(dbDir);
    const dbPath = join(dbDir, 'horde.db');
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.createTables();
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
    `);
  }

  get(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }

  saveInstance(config: DatabaseInstanceConfig): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO instances (instance_id, engine, version, port, datadir, label)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      config.instanceId,
      config.engine,
      config.version,
      config.port,
      config.datadir || '',
      config.label || null,
    );
  }

  deleteInstance(instanceId: string): void {
    this.db.prepare('DELETE FROM instances WHERE instance_id = ?').run(instanceId);
  }

  loadInstances(): DatabaseInstanceConfig[] {
    const rows = this.db.prepare('SELECT * FROM instances').all() as Array<{
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

  close(): void {
    this.db.close();
  }
}
