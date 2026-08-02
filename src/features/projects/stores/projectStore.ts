import { defineStore } from "pinia";
import { ref } from "vue";
import type { Project } from "@/shared/types/project";

type ScanOutcome = {
  projectId: string;
  version: string | null;
  timestamp: number;
};

export const useProjectStore = defineStore("projects", () => {
  const projects = ref<Project[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const scanResults = ref<Map<string, ScanOutcome>>(new Map());

  function clearError() {
    error.value = null;
  }

  async function fetchProjects() {
    clearError();
    try {
      projects.value = await window.electronAPI.projects.list();
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to fetch projects";
      console.error(e);
    }
  }

  async function addProject(name: string) {
    loading.value = true;
    clearError();
    try {
      const project = await window.electronAPI.projects.add(name);
      projects.value.push(project);
      return project;
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to add project";
      console.error(e);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function removeProject(projectId: string) {
    clearError();
    try {
      await window.electronAPI.projects.remove(projectId);
      projects.value = projects.value.filter((p) => p.id !== projectId);
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to remove project";
      console.error(e);
    }
  }

  async function scanPhpVersion(projectId: string) {
    clearError();
    try {
      const version =
        await window.electronAPI.projects.scanPhpVersion(projectId);
      const project = projects.value.find((p) => p.id === projectId);
      if (project) project.phpVersion = version ?? undefined;
      scanResults.value.set(projectId, {
        projectId,
        version,
        timestamp: Date.now(),
      });
      return version;
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to scan PHP version";
      console.error(e);
      scanResults.value.set(projectId, {
        projectId,
        version: null,
        timestamp: Date.now(),
      });
      return null;
    }
  }

  async function scanAll() {
    clearError();
    try {
      await window.electronAPI.projects.scanAll();
      await fetchProjects();
      const now = Date.now();
      for (const p of projects.value) {
        scanResults.value.set(p.id, {
          projectId: p.id,
          version: p.phpVersion ?? null,
          timestamp: now,
        });
      }
    } catch (e) {
      error.value = e instanceof Error ? e.message : "Failed to scan projects";
      console.error(e);
    }
  }

  function getScanResult(projectId: string): ScanOutcome | undefined {
    return scanResults.value.get(projectId);
  }

  function openProjectDir(projectId: string) {
    window.electronAPI.projects.openDir(projectId);
  }

  return {
    projects,
    loading,
    error,
    scanResults,
    clearError,
    fetchProjects,
    addProject,
    removeProject,
    scanPhpVersion,
    scanAll,
    getScanResult,
    openProjectDir,
  };
});
