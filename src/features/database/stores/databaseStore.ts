import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { DatabaseInstance, DatabaseVersion, DownloadProgress } from '@/shared/types/database';

export const useDatabaseStore = defineStore('database', () => {
  const engines = ref<string[]>([]);
  const availableVersions = ref<Record<string, string[]>>({});
  const installedVersions = ref<Record<string, string[]>>({});
  const instances = ref<DatabaseInstance[]>([]);
  const downloadProgress = ref<Record<string, DownloadProgress>>({});
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  function progressKey(engine: string, version: string): string {
    return `${engine}/${version}`;
  }

  async function fetchEngines() {
    clearError();
    try {
      engines.value = await window.electronAPI.databases.listEngines();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch engines';
      console.error(e);
    }
  }

  async function fetchAvailable(engine: string) {
    clearError();
    try {
      availableVersions.value[engine] = await window.electronAPI.databases.listAvailable(engine);
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Failed to fetch ${engine} versions`;
      console.error(e);
    }
  }

  async function fetchInstalled(engine: string) {
    clearError();
    try {
      installedVersions.value[engine] = await window.electronAPI.databases.listInstalled(engine);
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Failed to fetch installed ${engine} versions`;
      console.error(e);
    }
  }

  async function fetchInstances() {
    clearError();
    try {
      instances.value = await window.electronAPI.databases.listInstances();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch instances';
      console.error(e);
    }
  }

  async function downloadVersion(engine: string, version: string) {
    clearError();
    const key = progressKey(engine, version);
    const unsubscribe = window.electronAPI.databases.onDownloadProgress(
      engine,
      version,
      (progress) => {
        downloadProgress.value[key] = progress;
      },
    );

    try {
      await window.electronAPI.databases.download(engine, version);
      await fetchInstalled(engine);
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Failed to download ${engine} ${version}`;
      console.error(e);
    } finally {
      unsubscribe();
      setTimeout(() => {
        delete downloadProgress.value[key];
      }, 3000);
    }
  }

  async function initializeInstance(config: {
    engine: string;
    version: string;
    port: number;
    label?: string;
  }) {
    loading.value = true;
    clearError();
    try {
      await window.electronAPI.databases.initialize({
        engine: config.engine,
        version: config.version,
        port: config.port,
        label: config.label,
      });
      await fetchInstances();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to initialize instance';
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function startInstance(instanceId: string) {
    clearError();
    try {
      await window.electronAPI.databases.start(instanceId);
      await fetchInstances();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start instance';
      console.error(e);
    }
  }

  async function stopInstance(instanceId: string) {
    clearError();
    try {
      await window.electronAPI.databases.stop(instanceId);
      await fetchInstances();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to stop instance';
      console.error(e);
    }
  }

  async function removeInstance(instanceId: string) {
    clearError();
    try {
      await window.electronAPI.databases.removeInstance(instanceId);
      await fetchInstances();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to remove instance';
      console.error(e);
    }
  }

  async function uninstallVersion(engine: string, version: string) {
    clearError();
    try {
      await window.electronAPI.databases.uninstall(engine, version);
      await fetchInstalled(engine);
      await fetchInstances();
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Failed to uninstall ${engine} ${version}`;
      console.error(e);
    }
  }

  function openVersionDir(engine: string, version: string) {
    window.electronAPI.databases.openInstallDir(engine, version);
  }

  async function createDatabase(instanceId: string, name: string) {
    clearError();
    try {
      await window.electronAPI.databases.createDatabase(instanceId, name);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to create database';
      throw e;
    }
  }

  async function dropDatabase(instanceId: string, name: string) {
    clearError();
    try {
      await window.electronAPI.databases.dropDatabase(instanceId, name);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to drop database';
      throw e;
    }
  }

  async function fetchDatabases(instanceId: string): Promise<string[]> {
    clearError();
    try {
      return await window.electronAPI.databases.listDatabases(instanceId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to list databases';
      return [];
    }
  }

  return {
    engines,
    availableVersions,
    installedVersions,
    instances,
    downloadProgress,
    loading,
    error,
    clearError,
    fetchEngines,
    fetchAvailable,
    fetchInstalled,
    fetchInstances,
    downloadVersion,
    initializeInstance,
    startInstance,
    stopInstance,
    removeInstance,
    uninstallVersion,
    openVersionDir,
    createDatabase,
    dropDatabase,
    fetchDatabases,
    progressKey,
  };
});
