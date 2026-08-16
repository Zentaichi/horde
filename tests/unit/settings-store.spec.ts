import "reflect-metadata";
import { describe, it, expect, beforeEach, vi } from "vitest";

const mockDb = {
  pragma: vi.fn(),
  exec: vi.fn(),
  prepare: vi.fn(),
  close: vi.fn(),
  transaction: vi.fn((fn: () => void) => fn),
};

const mockPrepareReturn = {
  get: vi.fn(),
  run: vi.fn(),
  all: vi.fn(() => []),
};

vi.mock("electron", () => ({
  app: {
    getPath: () => "/mock/userdata",
  },
}));

vi.mock("better-sqlite3", () => ({
  default: vi.fn(function () {
    return mockDb;
  }),
}));

vi.mock("fs-extra", () => ({
  ensureDir: vi.fn(),
  ensureDirSync: vi.fn(),
}));

import { SettingsStore } from "../../electron/services/settings-store";

describe("SettingsStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.prepare.mockReturnValue(mockPrepareReturn);
    mockPrepareReturn.all.mockReturnValue([]);
  });

  it("initializes database with tables on construction", () => {
    new SettingsStore();
    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS settings")
    );
    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS instances")
    );
    expect(mockDb.pragma).toHaveBeenCalledWith("journal_mode = WAL");
  });

  it("sets and gets a setting value", () => {
    mockPrepareReturn.get.mockReturnValue({ value: "dark" });
    const store = new SettingsStore();
    store.set("theme", "dark");
    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE")
    );

    const value = store.get("theme");
    expect(value).toBe("dark");
  });

  it("returns null for missing key", () => {
    mockPrepareReturn.get.mockReturnValue(undefined);
    const store = new SettingsStore();
    expect(store.get("nonexistent")).toBeNull();
  });

  it("saves and loads instances", () => {
    const config = {
      instanceId: "inst-1",
      engine: "mysql",
      version: "8.0.37",
      port: 3306,
      datadir: "/data/inst-1",
      label: "Dev",
    };

    mockPrepareReturn.all.mockReturnValue([
      {
        instance_id: "inst-1",
        engine: "mysql",
        version: "8.0.37",
        port: 3306,
        datadir: "/data/inst-1",
        label: "Dev",
      },
    ]);

    const store = new SettingsStore();
    store.saveInstance(config);
    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO instances")
    );

    const instances = store.loadInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0].instanceId).toBe("inst-1");
    expect(instances[0].label).toBe("Dev");
  });

  it("deletes an instance", () => {
    const store = new SettingsStore();
    store.deleteInstance("inst-1");
    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining("DELETE FROM instances WHERE instance_id")
    );
  });

  it("runs pending migrations when user_version is behind", () => {
    mockDb.pragma.mockReturnValue(0);
    new SettingsStore();
    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE projects ADD COLUMN domains")
    );
    expect(mockDb.pragma).toHaveBeenCalledWith("user_version = 1");
  });

  it("skips migrations already applied", () => {
    mockDb.pragma.mockReturnValue(1);
    new SettingsStore();
    expect(mockDb.exec).not.toHaveBeenCalledWith(
      expect.stringContaining("ALTER TABLE projects ADD COLUMN domains")
    );
  });

  it("round-trips Phase 4 project site fields", () => {
    mockDb.pragma.mockReturnValue(1);
    mockPrepareReturn.all.mockReturnValue([
      {
        id: "proj-1",
        name: "Acme",
        path: "/projects/acme",
        php_version: "8.3.10",
        domains: '["acme.test"]',
        ssl_enabled: 1,
        proxy_port: 8080,
      },
    ]);

    const store = new SettingsStore();
    store.saveProject({
      id: "proj-1",
      name: "Acme",
      path: "/projects/acme",
      phpVersion: "8.3.10",
      domains: ["acme.test"],
      sslEnabled: true,
      proxyPort: 8080,
    });
    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining("INSERT OR REPLACE INTO projects")
    );

    const projects = store.loadProjects();
    expect(projects[0].domains).toEqual(["acme.test"]);
    expect(projects[0].sslEnabled).toBe(true);
    expect(projects[0].proxyPort).toBe(8080);
  });
});
