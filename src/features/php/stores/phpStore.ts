import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface PhpVersion {
  version: string;
  path: string;
  installed: boolean;
}

export interface DownloadProgress {
  percent: number;
  transferredBytes: number;
  totalBytes: number;
}

export const usePhpStore = defineStore('php', () => {
  const availableVersions = ref<string[]>([]);
  const installedVersions = ref<PhpVersion[]>([]);
  const downloadProgress = ref<Record<string, DownloadProgress>>({});
  const loading = ref(false);

  async function fetchAvailableVersions() {
    loading.value = true;
    console.log('Fetching available versions...');
    try {
      availableVersions.value = await window.electronAPI.php.getAvailableVersions();
      console.log('Versions received:', availableVersions.value);
    } catch (e) {
      console.error('Error fetching versions:', e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchInstalledVersions() {
    installedVersions.value = await window.electronAPI.php.getInstalledVersions();
  }

  async function downloadVersion(version: string) {
    // Set up progress listener
    const unsubscribe = window.electronAPI.php.onDownloadProgress(version, (progress) => {
      downloadProgress.value[version] = progress;
    });

    try {
      await window.electronAPI.php.downloadVersion(version);
      // Refresh installed list after download
      await fetchInstalledVersions();
    } finally {
      unsubscribe();
      // Clean up progress after a short delay
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
    fetchAvailableVersions,
    fetchInstalledVersions,
    downloadVersion,
  };
});