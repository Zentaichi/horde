import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ExtensionInfo } from '@/shared/types/extensions';

export const useExtensionStore = defineStore('extensions', () => {
  const extensions = ref<ExtensionInfo[]>([]);
  const selectedVersion = ref('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  function clearError() {
    error.value = null;
  }

  async function fetchExtensions(phpVersion: string) {
    loading.value = true;
    clearError();
    selectedVersion.value = phpVersion;
    try {
      extensions.value = await window.electronAPI.extensions.list(phpVersion);
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch extensions';
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function toggleExtension(extensionName: string, enabled: boolean) {
    clearError();
    try {
      if (enabled) {
        await window.electronAPI.extensions.enable(selectedVersion.value, extensionName);
      } else {
        await window.electronAPI.extensions.disable(selectedVersion.value, extensionName);
      }
      const ext = extensions.value.find((e) => e.name === extensionName);
      if (ext) ext.enabled = enabled;
    } catch (e) {
      error.value = e instanceof Error ? e.message : `Failed to ${enabled ? 'enable' : 'disable'} extension`;
      console.error(e);
    }
  }

  return {
    extensions,
    selectedVersion,
    loading,
    error,
    clearError,
    fetchExtensions,
    toggleExtension,
  };
});
