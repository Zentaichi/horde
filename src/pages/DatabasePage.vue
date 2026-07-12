<template>
  <div class="p-6 max-w-6xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
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
      class="flex items-start justify-between gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm"
    >
      <p class="flex-1">{{ error }}</p>
      <button @click="store.clearError()" class="shrink-0 hover:opacity-70" aria-label="Dismiss">
        <X class="size-4" />
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div class="space-y-3">
        <div class="relative">
          <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            v-model="versionFilter"
            type="text"
            placeholder="Filter versions..."
            class="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <VersionList
          :engine="selectedEngine"
          :versions="filteredAvailable"
          @download="onDownload"
        />
      </div>

      <div>
        <InstanceList :engine="selectedEngine" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { useDatabaseStore } from '@/features/database/stores/databaseStore';
import { storeToRefs } from 'pinia';
import { RefreshCw, Search, X } from '@lucide/vue';
import { Button } from '@/shared/ui/button';
import VersionList from '@/features/database/components/VersionList.vue';
import InstanceList from '@/features/database/components/InstanceList.vue';

const store = useDatabaseStore();
const { availableVersions, loading, error } = storeToRefs(store);
const selectedEngine = ref('mysql');
const versionFilter = ref('');

const filteredAvailable = computed(() => {
  const list = availableVersions.value[selectedEngine.value] || [];
  if (!versionFilter.value.trim()) return list;
  return list.filter((v) => v.includes(versionFilter.value.trim()));
});

onMounted(async () => {
  await store.fetchEngines();
  if (selectedEngine.value) {
    await store.fetchAvailable(selectedEngine.value);
    await store.fetchInstalled(selectedEngine.value);
    await store.fetchInstances();
  }
});

async function refresh() {
  await store.fetchEngines();
  if (selectedEngine.value) {
    await store.fetchAvailable(selectedEngine.value);
    await store.fetchInstalled(selectedEngine.value);
    await store.fetchInstances();
  }
}

async function onDownload(version: string) {
  await store.downloadVersion(selectedEngine.value, version);
}
</script>
