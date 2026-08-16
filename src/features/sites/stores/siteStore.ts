import { defineStore } from "pinia";
import { ref } from "vue";
import type { Site, SiteStatus } from "@/shared/types/site";

export const useSiteStore = defineStore("sites", () => {
  const sites = ref<Site[]>([]);
  const status = ref<SiteStatus | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const cliInstalled = ref(false);

  function clearError() {
    error.value = null;
  }

  async function fetchAll() {
    clearError();
    try {
      const [siteList, siteStatus, cliState] = await Promise.all([
        window.electronAPI.sites.list(),
        window.electronAPI.sites.getStatus(),
        window.electronAPI.cli.isInstalled(),
      ]);
      sites.value = siteList;
      status.value = siteStatus;
      cliInstalled.value = cliState;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to load sites";
      console.error(e);
    }
  }

  async function setDomains(projectId: string, domains: string[]) {
    clearError();
    try {
      await window.electronAPI.sites.setDomains(projectId, domains);
      await fetchAll();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to update domains";
      console.error(e);
    }
  }

  async function toggleSsl(projectId: string, enabled: boolean) {
    clearError();
    loading.value = true;
    try {
      await window.electronAPI.sites.enableSsl(projectId, enabled);
      await fetchAll();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to update SSL";
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function startProxy() {
    clearError();
    loading.value = true;
    try {
      await window.electronAPI.proxy.start();
      await fetchAll();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to start proxy";
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function stopProxy() {
    clearError();
    loading.value = true;
    try {
      await window.electronAPI.proxy.stop();
      await fetchAll();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to stop proxy";
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function installHttps() {
    clearError();
    loading.value = true;
    try {
      await window.electronAPI.mkcert.install();
      await fetchAll();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to install HTTPS";
      console.error(e);
    } finally {
      loading.value = false;
    }
  }

  async function installCli() {
    clearError();
    try {
      await window.electronAPI.cli.install();
      await fetchAll();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to install CLI";
      console.error(e);
    }
  }

  async function uninstallCli() {
    clearError();
    try {
      await window.electronAPI.cli.uninstall();
      await fetchAll();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to uninstall CLI";
      console.error(e);
    }
  }

  return {
    sites,
    status,
    loading,
    error,
    cliInstalled,
    clearError,
    fetchAll,
    setDomains,
    toggleSsl,
    startProxy,
    stopProxy,
    installHttps,
    installCli,
    uninstallCli,
  };
});
