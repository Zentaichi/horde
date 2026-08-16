import { defineStore } from "pinia";
import { ref } from "vue";
import type { ScaffoldTemplate } from "@/shared/types/site";

export const useScaffoldStore = defineStore("scaffold", () => {
  const templates = ref<ScaffoldTemplate[]>([]);
  const running = ref(false);
  const logs = ref<string[]>([]);
  const error = ref<string | null>(null);

  async function fetchTemplates() {
    try {
      templates.value = await window.electronAPI.scaffold.listTemplates();
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to load scaffold templates";
      console.error(e);
    }
  }

  async function create(options: {
    template: string;
    name: string;
    parentDir: string;
  }) {
    running.value = true;
    logs.value = [];
    error.value = null;
    const unsubscribe = window.electronAPI.scaffold.onLog((line) => {
      logs.value.push(line);
    });
    try {
      await window.electronAPI.scaffold.create(options);
    } catch (e) {
      error.value =
        e instanceof Error ? e.message : "Failed to scaffold project";
      console.error(e);
    } finally {
      unsubscribe();
      running.value = false;
    }
  }

  return { templates, running, logs, error, fetchTemplates, create };
});
