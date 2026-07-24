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
      <button @click="phpStore.clearError()" class="shrink-0 hover:opacity-70" aria-label="Dismiss">
        <X class="size-4" />
      </button>
    </div>

    <div class="flex gap-1 border-b border-border">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="px-3 py-2 text-sm rounded-t-md border-b-2 transition-colors"
        :class="activeTab === tab.id
          ? 'border-primary text-foreground font-medium'
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent'"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="activeTab === 'versions'" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

    <div v-if="activeTab === 'extensions'" class="space-y-4">
      <div class="flex items-center gap-3">
        <label class="text-sm font-medium">PHP Version:</label>
        <select
          v-model="selectedExtensionVersion"
          @change="onExtensionVersionChange"
          class="px-3 py-1.5 text-sm rounded-md border border-border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="" disabled>Select a version...</option>
          <option v-for="v in installedVersions" :key="v.version" :value="v.version">
            PHP {{ v.version }}
          </option>
        </select>
      </div>

      <div v-if="extError" class="flex items-start justify-between gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm">
        <p class="flex-1">{{ extError }}</p>
        <button @click="extStore.clearError()" class="shrink-0 hover:opacity-70" aria-label="Dismiss">
          <X class="size-4" />
        </button>
      </div>

      <ExtensionList
        v-if="selectedExtensionVersion"
        :extensions="extensions"
        @toggle="onToggleExtension"
      />
      <p v-else class="text-sm text-muted-foreground py-8 text-center">
        Select a PHP version above to manage extensions.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import { usePhpStore } from '@/features/php/stores/phpStore';
import { useExtensionStore } from '@/features/extensions/stores/extensionStore';
import { storeToRefs } from 'pinia';
import { RefreshCw, Search, X } from '@lucide/vue';
import { Button } from '@/shared/ui/button';
import AvailableVersionList from '@/features/php/components/AvailableVersionList.vue';
import InstalledVersionList from '@/features/php/components/InstalledVersionList.vue';
import ExtensionList from '@/features/extensions/components/ExtensionList.vue';

const phpStore = usePhpStore();
const extStore = useExtensionStore();
const { availableVersions, installedVersions, loading, error } = storeToRefs(phpStore);
const { extensions, error: extError } = storeToRefs(extStore);

const versionFilter = ref('');
const activeTab = ref('versions');
const selectedExtensionVersion = ref('');

const tabs = [
  { id: 'versions', label: 'Versions' },
  { id: 'extensions', label: 'Extensions' },
];

const filteredAvailable = computed(() => {
  if (!versionFilter.value.trim()) return availableVersions.value;
  return availableVersions.value.filter((v) =>
    v.includes(versionFilter.value.trim()),
  );
});

onMounted(async () => {
  await phpStore.fetchAvailableVersions();
  await phpStore.fetchInstalledVersions();
  await phpStore.fetchActiveVersion();
});

async function refresh() {
  await phpStore.fetchAvailableVersions();
  await phpStore.fetchInstalledVersions();
  await phpStore.fetchActiveVersion();
  if (selectedExtensionVersion.value) {
    await extStore.fetchExtensions(selectedExtensionVersion.value);
  }
}

async function onDownload(version: string) {
  await phpStore.downloadVersion(version);
}

async function onExtensionVersionChange() {
  if (selectedExtensionVersion.value) {
    await extStore.fetchExtensions(selectedExtensionVersion.value);
  }
}

async function onToggleExtension(name: string, enabled: boolean) {
  await extStore.toggleExtension(name, enabled);
}
</script>
