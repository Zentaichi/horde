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
        <VersionList :engine="selectedEngine" :versions="availableVersions[selectedEngine] || []" @download="onDownload" />
      </div>

      <div>
        <InstanceList :engine="selectedEngine" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useDatabaseStore } from '@/features/database/stores/databaseStore';
import { storeToRefs } from 'pinia';
import { RefreshCw, X } from '@lucide/vue';
import { Button } from '@/shared/ui/button';
import VersionList from '@/features/database/components/VersionList.vue';
import InstanceList from '@/features/database/components/InstanceList.vue';

const store = useDatabaseStore();
const { availableVersions, loading, error } = storeToRefs(store);
const selectedEngine = ref('mysql');

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
