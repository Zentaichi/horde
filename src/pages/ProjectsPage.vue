<template>
  <div class="p-6 max-w-6xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Projects</h1>
        <p class="text-sm text-muted-foreground">
          Manage project directories and .php-version files
        </p>
      </div>
      <div class="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          @click="onScanAll"
          :disabled="loading"
        >
          <RefreshCw class="size-4" />
          <span class="ml-2">Rescan All</span>
        </Button>
        <AddProjectDialog :loading="loading" @add="onAddProject" />
      </div>
    </div>

    <div
      v-if="error"
      class="flex items-start justify-between gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
    >
      <p class="flex-1">{{ error }}</p>
      <button
        @click="store.clearError()"
        class="shrink-0 hover:opacity-70"
        aria-label="Dismiss"
      >
        <X class="size-4" />
      </button>
    </div>

    <ProjectList
      :projects="projects"
      :server-map="serverMap"
      @scan="onScan"
      @open-dir="store.openProjectDir"
      @remove="onRemove"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useProjectStore } from "@/features/projects/stores/projectStore";
import { useDevServerStore } from "@/features/devserver/stores/devServerStore";
import { storeToRefs } from "pinia";
import { RefreshCw, X } from "@lucide/vue";
import { Button } from "@/shared/ui/button";
import ProjectList from "@/features/projects/components/ProjectList.vue";
import AddProjectDialog from "@/features/projects/components/AddProjectDialog.vue";

const store = useProjectStore();
const { projects, loading, error } = storeToRefs(store);

const devStore = useDevServerStore();
const { servers: devServers } = storeToRefs(devStore);

const serverMap = computed(() => {
  const map: Record<string, number> = {};
  for (const s of devServers.value) {
    if (s.running) map[s.projectId] = s.port;
  }
  return map;
});

onMounted(async () => {
  await store.fetchProjects();
  await devStore.fetchAll();
});

async function onAddProject() {
  await store.addProject("");
  await store.fetchProjects();
}

async function onScan(projectId: string) {
  await store.scanPhpVersion(projectId);
}

async function onScanAll() {
  await store.scanAll();
}

async function onRemove(projectId: string) {
  await store.removeProject(projectId);
}
</script>
