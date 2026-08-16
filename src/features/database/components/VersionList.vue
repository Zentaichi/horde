<template>
  <div>
    <h2 class="text-xl font-semibold mb-3">Available Versions</h2>

    <div v-if="versions.length > 0" class="space-y-3">
      <VersionCard
        v-for="version in versions"
        :key="version"
        :name="`${store.engineDisplayName(engine)} ${version}`"
        :installed="isInstalled(version)"
        :downloading="isDownloading(version)"
        :progress="downloadProgress[store.progressKey(engine, version)]"
        :started-at="downloadStartTimes[store.progressKey(engine, version)]"
        @download="$emit('download', version)"
        @uninstall="onUninstall(version)"
        @open-dir="store.openVersionDir(engine, version)"
      />
    </div>

    <p v-else class="text-sm text-muted-foreground">
      No versions match your filter.
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import { useDatabaseStore } from "../stores/databaseStore";
import { storeToRefs } from "pinia";
import VersionCard from "@/shared/ui/VersionCard.vue";

const store = useDatabaseStore();
const { downloadProgress, installedVersions } = storeToRefs(store);

const props = defineProps<{
  engine: string;
  versions: string[];
}>();

defineEmits<{
  (e: "download", version: string): void;
}>();

const downloadStartTimes = reactive<Record<string, number>>({});

watch(
  () => downloadProgress.value,
  (progress) => {
    for (const key of Object.keys(progress)) {
      if (!downloadStartTimes[key]) {
        downloadStartTimes[key] = Date.now();
      }
    }
    for (const key of Object.keys(downloadStartTimes)) {
      if (!progress[key]) {
        delete downloadStartTimes[key];
      }
    }
  },
  { deep: true }
);

function isDownloading(version: string) {
  return (
    downloadProgress.value[store.progressKey(props.engine, version)] !==
    undefined
  );
}

function isInstalled(version: string) {
  return (installedVersions.value[props.engine] || []).includes(version);
}

async function onUninstall(version: string) {
  await store.uninstallVersion(props.engine, version);
}
</script>
