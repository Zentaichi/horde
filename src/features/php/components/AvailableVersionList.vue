<template>
  <div>
    <h2 class="text-xl font-semibold mb-2">Available PHP Versions</h2>
    <ul class="space-y-2">
      <li v-for="version in versions" :key="version" class="flex items-center justify-between p-2 bg-gray-100 rounded">
        <span>PHP {{ version }}</span>
        <button
          @click="download(version)"
          :disabled="isDownloading(version)"
          class="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {{ isDownloading(version) ? `${downloadProgress[version]?.percent ?? 0}%` : 'Download' }}
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { usePhpStore } from '../stores/phpStore';
import { storeToRefs } from 'pinia';

const store = usePhpStore();
const { availableVersions, downloadProgress } = storeToRefs(store);

const props = defineProps<{
  versions: string[];
}>();

const emit = defineEmits<{
  (e: 'download', version: string): void;
}>();

function isDownloading(version: string) {
  return downloadProgress.value[version] !== undefined;
}

function download(version: string) {
  emit('download', version);
}

// We'll proxy the download call to the store from the parent page
</script>