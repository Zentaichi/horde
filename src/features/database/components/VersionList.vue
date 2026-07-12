<template>
  <div>
    <h2 class="text-xl font-semibold mb-3">Available Versions</h2>

    <div v-if="versions.length > 0" class="space-y-3">
      <Card v-for="version in versions" :key="version">
        <CardContent class="p-4">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="font-semibold">MySQL {{ version }}</span>
              <Badge v-if="isInstalled(version)" variant="secondary">Installed</Badge>
            </div>
            <Button
              v-if="!isDownloading(version)"
              :variant="isInstalled(version) ? 'outline' : 'default'"
              size="sm"
              :disabled="isInstalled(version)"
              @click="$emit('download', version)"
            >
              {{ isInstalled(version) ? 'Installed' : 'Download' }}
            </Button>
            <Button v-else variant="outline" size="sm" disabled>
              Downloading...
            </Button>
          </div>

          <ProgressBar
            v-if="isDownloading(version)"
            :progress="downloadProgress[progressKey(engine, version)]"
            :started-at="downloadStartTimes[progressKey(engine, version)]"
          />
        </CardContent>
      </Card>
    </div>

    <p v-else class="text-sm text-muted-foreground">
      No versions match your filter.
    </p>
  </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import { useDatabaseStore } from '../stores/databaseStore';
import { storeToRefs } from 'pinia';
import { Card, CardContent } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import ProgressBar from '@/shared/ui/ProgressBar.vue';

const store = useDatabaseStore();
const { downloadProgress, installedVersions } = storeToRefs(store);

const props = defineProps<{
  engine: string;
  versions: string[];
}>();

defineEmits<{
  (e: 'download', version: string): void;
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
  { deep: true },
);

function isDownloading(version: string) {
  return downloadProgress.value[store.progressKey(props.engine, version)] !== undefined;
}

function isInstalled(version: string) {
  return (installedVersions.value[props.engine] || []).includes(version);
}
</script>
