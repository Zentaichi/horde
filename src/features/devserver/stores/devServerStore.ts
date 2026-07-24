import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { DevServerStatus } from '@/shared/types/devserver';

export const useDevServerStore = defineStore('devserver', () => {
  const servers = ref<DevServerStatus[]>([]);
  const logSubscriptions = ref<Map<string, string[]>>(new Map());
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchAll() {
    clearError();
    try {
      servers.value = await window.electronAPI.devserver.listAll();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch dev servers';
      console.error(e);
    }
  }

  async function startServer(projectId: string, port?: number) {
    loading.value = true;
    clearError();
    try {
      const status = await window.electronAPI.devserver.start(projectId, port);
      const existing = servers.value.find((s) => s.projectId === projectId);
      if (existing) {
        Object.assign(existing, status);
      } else {
        servers.value.push(status);
      }
      return status;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to start dev server';
      console.error(e);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function stopServer(projectId: string) {
    clearError();
    try {
      await window.electronAPI.devserver.stop(projectId);
      servers.value = servers.value.filter((s) => s.projectId !== projectId);
      logSubscriptions.value.delete(projectId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to stop dev server';
      console.error(e);
    }
  }

  async function fetchStatus(projectId: string): Promise<DevServerStatus | null> {
    clearError();
    try {
      return await window.electronAPI.devserver.getStatus(projectId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch server status';
      console.error(e);
      return null;
    }
  }

  async function fetchLogs(projectId: string, tail?: number): Promise<string[]> {
    clearError();
    try {
      return await window.electronAPI.devserver.getLogs(projectId, tail);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch server logs';
      console.error(e);
      return [];
    }
  }

  function subscribeLogs(projectId: string): () => void {
    const unsubscribe = window.electronAPI.devserver.onLog(projectId, (logs) => {
      logSubscriptions.value.set(projectId, logs);
    });
    return unsubscribe;
  }

  return {
    servers,
    logSubscriptions,
    loading,
    error,
    clearError,
    fetchAll,
    startServer,
    stopServer,
    fetchStatus,
    fetchLogs,
    subscribeLogs,
  };
});
