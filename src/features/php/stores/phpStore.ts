import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PhpVersion, DownloadProgress } from '@/shared/types/php';

export const usePhpStore = defineStore('php', () => {
  const availableVersions = ref<string[]>([]);
  const installedVersions = ref<PhpVersion[]>([]);
  const downloadProgress = ref<Record<string, DownloadProgress>>({});
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchAvailableVersions() {
    loading.value = true;
    clearError();
    try {
      availableVersions.value = await window.electronAPI.php.getAvailableVersions();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch available versions';
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchInstalledVersions() {
    clearError();
    try {
      installedVersions.value = await window.electronAPI.php.getInstalledVersions();
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch installed versions';
      console.error(e);
    }
  }

  async function downloadVersion(version: string) {
    clearError();
    const unsubscribe = window.electronAPI.php.onDownloadProgress(version, (progress) => {
      downloadProgress.value[version] = progress;
    });

    try {
      await window.electronAPI.php.downloadVersion(version);
      await fetchInstalledVersions();
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Failed to download PHP ${version}`;
      console.error(e);
    } finally {
      unsubscribe();
      setTimeout(() => {
        delete downloadProgress.value[version];
      }, 3000);
    }
  }

  return {
    availableVersions,
    installedVersions,
    downloadProgress,
    loading,
    error,
    clearError,
    fetchAvailableVersions,
    fetchInstalledVersions,
    downloadVersion,
  };
});
