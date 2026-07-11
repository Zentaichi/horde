import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PhpVersion, DownloadProgress } from '@/shared/types/php';

export const usePhpStore = defineStore('php', () => {
  const availableVersions = ref<string[]>([]);
  const installedVersions = ref<PhpVersion[]>([]);
  const downloadProgress = ref<Record<string, DownloadProgress>>({});
  const activeVersion = ref<string | null>(null);
  const loading = ref(false);
  const switching = ref(false);
  const uninstalling = ref(false);
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

  async function fetchActiveVersion() {
    try {
      activeVersion.value = await window.electronAPI.php.getActiveVersion();
    } catch (e) {
      console.error(e);
    }
  }

  async function switchGlobalVersion(version: string) {
    switching.value = true;
    clearError();
    try {
      await window.electronAPI.php.switchGlobal(version);
      await fetchActiveVersion();
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Failed to switch to PHP ${version}`;
      console.error(e);
    } finally {
      switching.value = false;
    }
  }

  async function uninstallVersion(version: string) {
    uninstalling.value = true;
    clearError();
    try {
      await window.electronAPI.php.uninstallVersion(version);
      await fetchInstalledVersions();
      await fetchActiveVersion();
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Failed to uninstall PHP ${version}`;
      console.error(e);
    } finally {
      uninstalling.value = false;
    }
  }

  function openVersionDir(path: string) {
    window.electronAPI.openDirectory(path);
  }

  return {
    availableVersions,
    installedVersions,
    downloadProgress,
    activeVersion,
    loading,
    switching,
    uninstalling,
    error,
    clearError,
    fetchAvailableVersions,
    fetchInstalledVersions,
    fetchActiveVersion,
    downloadVersion,
    switchGlobalVersion,
    uninstallVersion,
    openVersionDir,
  };
});
