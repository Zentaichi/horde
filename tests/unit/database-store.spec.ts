import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDatabaseStore } from '../../src/features/database/stores/databaseStore';

const mockElectronAPI = {
  databases: {
    listEngines: vi.fn().mockResolvedValue(['mysql']),
    listAvailable: vi.fn().mockResolvedValue(['8.0.37', '8.0.36']),
    listInstalled: vi.fn().mockResolvedValue(['8.0.37']),
    download: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue({
      instanceId: 'test-1',
      engine: 'mysql',
      version: '8.0.37',
      port: 3306,
      running: false,
    }),
    listInstances: vi.fn().mockResolvedValue([]),
    removeInstance: vi.fn().mockResolvedValue(undefined),
    uninstall: vi.fn().mockResolvedValue(undefined),
    openInstallDir: vi.fn().mockResolvedValue(undefined),
    createDatabase: vi.fn().mockResolvedValue(undefined),
    dropDatabase: vi.fn().mockResolvedValue(undefined),
    listDatabases: vi.fn().mockResolvedValue(['testdb']),
    onDownloadProgress: vi.fn(() => vi.fn()),
  },
};

vi.stubGlobal('window', {
  electronAPI: mockElectronAPI,
});

describe('databaseStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('fetches engines', async () => {
    const store = useDatabaseStore();
    await store.fetchEngines();
    expect(mockElectronAPI.databases.listEngines).toHaveBeenCalled();
    expect(store.engines).toEqual(['mysql']);
  });

  it('fetches available versions for an engine', async () => {
    const store = useDatabaseStore();
    await store.fetchAvailable('mysql');
    expect(mockElectronAPI.databases.listAvailable).toHaveBeenCalledWith('mysql');
    expect(store.availableVersions.mysql).toEqual(['8.0.37', '8.0.36']);
  });

  it('fetches installed versions', async () => {
    const store = useDatabaseStore();
    await store.fetchInstalled('mysql');
    expect(mockElectronAPI.databases.listInstalled).toHaveBeenCalledWith('mysql');
    expect(store.installedVersions.mysql).toEqual(['8.0.37']);
  });

  it('fetches instances', async () => {
    const store = useDatabaseStore();
    mockElectronAPI.databases.listInstances.mockResolvedValueOnce([
      { instanceId: 'i1', engine: 'mysql', version: '8.0', port: 3306, running: true },
    ]);
    await store.fetchInstances();
    expect(store.instances).toHaveLength(1);
  });

  it('creates a database', async () => {
    const store = useDatabaseStore();
    await store.createDatabase('test-1', 'mydb');
    expect(mockElectronAPI.databases.createDatabase).toHaveBeenCalledWith('test-1', 'mydb');
  });

  it('drops a database', async () => {
    const store = useDatabaseStore();
    await store.dropDatabase('test-1', 'mydb');
    expect(mockElectronAPI.databases.dropDatabase).toHaveBeenCalledWith('test-1', 'mydb');
  });

  it('lists databases for an instance', async () => {
    const store = useDatabaseStore();
    const dbs = await store.fetchDatabases('test-1');
    expect(mockElectronAPI.databases.listDatabases).toHaveBeenCalledWith('test-1');
    expect(dbs).toEqual(['testdb']);
  });

  it('handles errors gracefully', async () => {
    const store = useDatabaseStore();
    mockElectronAPI.databases.listEngines.mockRejectedValueOnce(new Error('Connection refused'));
    await store.fetchEngines();
    expect(store.error).toContain('Connection refused');
  });

  it('clears error', () => {
    const store = useDatabaseStore();
    store.clearError();
    expect(store.error).toBeNull();
  });
});
