import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DatabaseRegistry } from '../../electron/services/database-registry';
import type { IDatabaseEngine } from '../../electron/services/interfaces/IDatabaseEngine';
import type { DatabaseInstanceConfig, DatabaseInstanceStatus } from '../../electron/types/database';
import { SettingsStore } from '../../electron/services/settings-store';

vi.mock('electron', () => ({
  app: {
    getPath: () => '/mock/userdata',
  },
}));

vi.mock('better-sqlite3', () => {
  const mockDb = {
    pragma: vi.fn(),
    exec: vi.fn(),
    prepare: vi.fn(() => ({
      get: vi.fn(),
      run: vi.fn(),
      all: vi.fn(() => []),
    })),
    close: vi.fn(),
  };
  return { default: vi.fn(function () { return mockDb; }) };
});

vi.mock('fs-extra', () => ({
  ensureDir: vi.fn(),
  ensureDirSync: vi.fn(),
}));

function createMockEngine(name: string): IDatabaseEngine {
  const instances = new Map<string, { config: DatabaseInstanceConfig }>();

  return {
    engine: name,
    displayName: name === 'mysql' ? 'MySQL' : 'PostgreSQL',

    listAvailable: vi.fn().mockResolvedValue([]),
    listInstalled: vi.fn().mockResolvedValue([]),
    download: vi.fn().mockResolvedValue(undefined),
    uninstall: vi.fn().mockResolvedValue(undefined),

    initialize: vi.fn(async (config: DatabaseInstanceConfig) => {
      instances.set(config.instanceId, { config: { ...config } });
    }),
    restoreInstance: vi.fn(async (config: DatabaseInstanceConfig) => {
      instances.set(config.instanceId, { config: { ...config } });
    }),

    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    restart: vi.fn().mockResolvedValue(undefined),

    getStatus: vi.fn(async (instanceId: string): Promise<DatabaseInstanceStatus> => {
      const entry = instances.get(instanceId);
      if (!entry) throw new Error(`Instance ${instanceId} not found.`);
      return {
        instanceId,
        engine: entry.config.engine,
        version: entry.config.version,
        port: entry.config.port,
        running: false,
      };
    }),

    listInstances: vi.fn(async (): Promise<DatabaseInstanceStatus[]> => {
      return Array.from(instances.entries()).map(([instanceId, entry]) => ({
        instanceId,
        engine: entry.config.engine,
        version: entry.config.version,
        port: entry.config.port,
        running: false,
      }));
    }),

    removeInstance: vi.fn(async (instanceId: string) => {
      if (!instances.has(instanceId)) throw new Error(`Instance ${instanceId} not found.`);
      instances.delete(instanceId);
    }),

    createDatabase: vi.fn().mockResolvedValue(undefined),
    dropDatabase: vi.fn().mockResolvedValue(undefined),
    listDatabases: vi.fn().mockResolvedValue([]),
  };
}

describe('DatabaseRegistry', () => {
  let registry: DatabaseRegistry;
  let settingsStore: SettingsStore;

  beforeEach(() => {
    vi.clearAllMocks();

    settingsStore = new SettingsStore();
    registry = new DatabaseRegistry(settingsStore);
  });

  describe('engine registration', () => {
    it('registers and lists engines', () => {
      const mysql = createMockEngine('mysql');
      registry.register(mysql);
      expect(registry.listEngines()).toEqual(['mysql']);
    });

    it('finds engine by name', () => {
      const mysql = createMockEngine('mysql');
      registry.register(mysql);
      expect(registry.findEngine('mysql')).toBe(mysql);
    });

    it('throws for unknown engine', () => {
      expect(() => registry.findEngine('postgresql')).toThrow('"postgresql" is not registered');
    });
  });

  describe('instance creation', () => {
    it('creates instance and persists to store', async () => {
      const mysql = createMockEngine('mysql');
      registry.register(mysql);

      const config: DatabaseInstanceConfig = {
        instanceId: 'inst-1',
        engine: 'mysql',
        version: '8.0.37',
        port: 3306,
        datadir: '/data/inst-1',
      };

      await registry.createInstance(config);
      expect(mysql.initialize).toHaveBeenCalledWith(config);

      const instances = await registry.listAllInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].instanceId).toBe('inst-1');
    });

    it('throws for unregistered engine', async () => {
      await expect(
        registry.createInstance({
          instanceId: 'inst-1',
          engine: 'postgresql',
          version: '16',
          port: 5432,
          datadir: '/data',
        }),
      ).rejects.toThrow('"postgresql" is not registered');
    });
  });

  describe('instance deletion', () => {
    it('deletes instance and removes from store', async () => {
      const mysql = createMockEngine('mysql');
      registry.register(mysql);

      await registry.createInstance({
        instanceId: 'inst-1',
        engine: 'mysql',
        version: '8.0',
        port: 3306,
        datadir: '/data',
      });

      await registry.deleteInstance('inst-1');
      expect(mysql.removeInstance).toHaveBeenCalledWith('inst-1');

      const instances = await registry.listAllInstances();
      expect(instances).toHaveLength(0);
    });

    it('throws when resolve fails for unknown instance', async () => {
      const mysql = createMockEngine('mysql');
      registry.register(mysql);

      await expect(registry.deleteInstance('nonexistent')).rejects.toThrow();
    });
  });

  describe('instance resolution', () => {
    it('resolves engine by instance ID', async () => {
      const mysql = createMockEngine('mysql');
      registry.register(mysql);

      await registry.createInstance({
        instanceId: 'inst-1',
        engine: 'mysql',
        version: '8.0',
        port: 3306,
        datadir: '/data',
      });

      expect(registry.resolveEngineByInstance('inst-1')).toBe(mysql);
    });
  });

  describe('instance restoration', () => {
    it('restores instances from persistent store', async () => {
      const persisted: DatabaseInstanceConfig[] = [{
        instanceId: 'restored-1',
        engine: 'mysql',
        version: '8.0',
        port: 3307,
        datadir: '/restored/data',
      }];

      vi.spyOn(settingsStore, 'loadInstances').mockReturnValue(persisted);

      const mysql = createMockEngine('mysql');
      registry.register(mysql);
      await registry.restoreInstances();

      expect(mysql.restoreInstance).toHaveBeenCalledWith(persisted[0]);
      const instances = await registry.listAllInstances();
      expect(instances).toHaveLength(1);
      expect(instances[0].instanceId).toBe('restored-1');
    });

    it('throws when persisted instance references unregistered engine', async () => {
      vi.spyOn(settingsStore, 'loadInstances').mockReturnValue([{
        instanceId: 'orphaned',
        engine: 'postgresql',
        version: '16',
        port: 5432,
        datadir: '/data',
      }]);

      const mysql = createMockEngine('mysql');
      registry.register(mysql);

      await expect(registry.restoreInstances()).rejects.toThrow('"postgresql" is not registered');
    });
  });
});
