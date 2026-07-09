<template>
  <div class="p-6 max-w-6xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight">PHP Manager</h1>
        <p class="text-sm text-muted-foreground">
          Download, install, and manage PHP versions
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
        <AvailableVersionList
          :versions="filteredAvailable"
          @download="onDownload"
        />
      </div>

      <div>
        <InstalledVersionList :versions="installedVersions" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { usePhpStore } from '@/features/php/stores/phpStore';
import { storeToRefs } from 'pinia';
import { RefreshCw, Search, X } from '@lucide/vue';
import { Button } from '@/shared/ui/button';
import AvailableVersionList from '@/features/php/components/AvailableVersionList.vue';
import InstalledVersionList from '@/features/php/components/InstalledVersionList.vue';

const store = usePhpStore();
const { availableVersions, installedVersions, loading, error } = storeToRefs(store);

const versionFilter = ref('');

const filteredAvailable = computed(() => {
  if (!versionFilter.value.trim()) return availableVersions.value;
  return availableVersions.value.filter((v) =>
    v.includes(versionFilter.value.trim()),
  );
});

onMounted(async () => {
  await store.fetchAvailableVersions();
  await store.fetchInstalledVersions();
});

async function refresh() {
  await store.fetchAvailableVersions();
  await store.fetchInstalledVersions();
}

async function onDownload(version: string) {
  await store.downloadVersion(version);
}
</script>
