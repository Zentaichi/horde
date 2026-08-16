<template>
  <PageContainer class="flex flex-col">
    <div class="shrink-0 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Database Manager</h1>
        <p class="text-sm text-muted-foreground">
          Download, configure, and manage local database servers
        </p>
      </div>
      <Button variant="outline" size="sm" @click="refresh" :disabled="loading">
        <RefreshCw :class="loading ? 'animate-spin' : ''" class="size-4" />
        <span class="ml-2">Refresh</span>
      </Button>
    </div>

    <div
      v-if="error"
      class="shrink-0 flex items-start justify-between gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
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

    <div class="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
      <div class="flex flex-col min-w-0 min-h-0 gap-3">
        <div class="shrink-0 flex items-center gap-2">
          <select
            v-model="selectedEngine"
            class="rounded-md border border-border bg-background px-2.5 py-1.5 text-sm"
            @change="onEngineChange"
          >
            <option value="" disabled>Select engine...</option>
            <option
              v-for="eng in engines"
              :key="eng.engine"
              :value="eng.engine"
            >
              {{ eng.displayName }}
            </option>
          </select>
          <div class="relative flex-1">
            <Search
              class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            />
            <input
              v-model="versionFilter"
              type="text"
              placeholder="Filter versions..."
              class="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
        <div class="flex-1 min-h-0 overflow-y-auto pr-1 overscroll-contain">
          <VersionList
            v-if="selectedEngine"
            :engine="selectedEngine"
            :versions="filteredAvailable"
            @download="onDownload"
          />
          <p v-else class="text-sm text-muted-foreground">
            Select an engine from the dropdown above.
          </p>
        </div>
      </div>

      <div class="flex flex-col min-w-0 min-h-0">
        <div class="flex-1 min-h-0 overflow-y-auto pr-1 overscroll-contain">
          <InstanceList v-if="selectedEngine" :engine="selectedEngine" />
        </div>
      </div>
    </div>
  </PageContainer>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import { useDatabaseStore } from "@/features/database/stores/databaseStore";
import { storeToRefs } from "pinia";
import { RefreshCw, Search, X } from "@lucide/vue";
import { Button } from "@/shared/ui/button";
import PageContainer from "@/shared/ui/PageContainer.vue";
import VersionList from "@/features/database/components/VersionList.vue";
import InstanceList from "@/features/database/components/InstanceList.vue";

const store = useDatabaseStore();
const { availableVersions, engines, loading, error } = storeToRefs(store);
const selectedEngine = ref("");
const versionFilter = ref("");

const filteredAvailable = computed(() => {
  if (!selectedEngine.value) return [];
  const list = availableVersions.value[selectedEngine.value] || [];
  if (!versionFilter.value.trim()) return list;
  return list.filter((v) => v.includes(versionFilter.value.trim()));
});

onMounted(async () => {
  await store.fetchEngines();
  if (engines.value.length > 0 && !selectedEngine.value) {
    selectedEngine.value = engines.value[0].engine;
    await loadEngineData();
  }
});

async function loadEngineData() {
  if (selectedEngine.value) {
    await store.fetchAvailable(selectedEngine.value);
    await store.fetchInstalled(selectedEngine.value);
    await store.fetchInstances();
  }
}

async function onEngineChange() {
  versionFilter.value = "";
  await loadEngineData();
}

async function refresh() {
  await store.fetchEngines();
  await loadEngineData();
}

async function onDownload(version: string) {
  await store.downloadVersion(selectedEngine.value, version);
}
</script>
