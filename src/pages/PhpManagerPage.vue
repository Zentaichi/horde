<template>
  <div class="p-6 max-w-2xl mx-auto">
    <h1 class="text-3xl font-bold mb-4">PHP Manager</h1>
    <button @click="refresh" class="mb-4 px-4 py-2 bg-green-600 text-white rounded">
      Refresh
    </button>
    <AvailableVersionList :versions="availableVersions" @download="onDownload" />
    <InstalledVersionList :versions="installedVersions" />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { usePhpStore } from '../features/php/stores/phpStore';
import { storeToRefs } from 'pinia';
import AvailableVersionList from '../features/php/components/AvailableVersionList.vue';
import InstalledVersionList from '../features/php/components/InstalledVersionList.vue';

const store = usePhpStore();
const { availableVersions, installedVersions } = storeToRefs(store);

onMounted(async () => {
  console.log('Page mounted, fetching...');
  await store.fetchAvailableVersions();
  await store.fetchInstalledVersions();
});

async function refresh() {
  console.log('Refreshing...');
  await store.fetchAvailableVersions();
  await store.fetchInstalledVersions();
}

async function onDownload(version: string) {
  await store.downloadVersion(version);
}
</script>