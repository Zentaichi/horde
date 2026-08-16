<template>
  <div>
    <h2 class="text-xl font-semibold mb-3">Available PHP Versions</h2>

    <div v-if="versions.length > 0" class="space-y-3">
      <VersionCard
        v-for="version in versions"
        :key="version"
        :name="`PHP ${version}`"
        :installed="isInstalled(version)"
        :downloading="isDownloading(version)"
        :progress="downloadProgress[version]"
        :started-at="downloadStartTimes[version]"
        @download="emit('download', version)"
        @uninstall="onUninstall(version)"
        @open-dir="onOpenDir(version)"
      />
    </div>

    <p v-else class="text-sm text-muted-foreground">
      No versions match your filter.
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from "vue";
import { usePhpStore } from "../stores/phpStore";
import { storeToRefs } from "pinia";
import VersionCard from "@/shared/ui/VersionCard.vue";

const store = usePhpStore();
const { downloadProgress, installedVersions } = storeToRefs(store);

const props = defineProps<{
  versions: string[];
}>();

const emit = defineEmits<{
  (e: "download", version: string): void;
}>();

const downloadStartTimes = reactive<Record<string, number>>({});

watch(
  () => downloadProgress.value,
  (progress) => {
    for (const version of Object.keys(progress)) {
      if (!downloadStartTimes[version]) {
        downloadStartTimes[version] = Date.now();
      }
    }
    for (const version of Object.keys(downloadStartTimes)) {
      if (!progress[version]) {
        delete downloadStartTimes[version];
      }
    }
  },
  { deep: true }
);

function isDownloading(version: string) {
  return downloadProgress.value[version] !== undefined;
}

function isInstalled(version: string) {
  return installedVersions.value.some((v) => v.version === version);
}

function onUninstall(version: string) {
  store.uninstallVersion(version);
}

function onOpenDir(version: string) {
  const installed = installedVersions.value.find((v) => v.version === version);
  if (installed) store.openVersionDir(installed.path);
}
</script>
