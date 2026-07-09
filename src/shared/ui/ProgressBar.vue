<script setup lang="ts">
import { computed } from 'vue';
import { Progress } from '@/shared/ui/progress';
import type { DownloadProgress } from '@/shared/types/php';

const props = withDefaults(
  defineProps<{
    progress: DownloadProgress;
    startedAt?: number;
  }>(),
  {
    startedAt: undefined,
  },
);

const elapsed = computed(() => {
  if (!props.startedAt) return 0;
  return Math.max((Date.now() - props.startedAt) / 1000, 0.5);
});

const speed = computed(() => {
  if (!props.startedAt || elapsed.value === 0) return null;
  return props.progress.transferredBytes / elapsed.value;
});

const eta = computed(() => {
  if (!speed.value || speed.value === 0) return null;
  const remaining = props.progress.totalBytes - props.progress.transferredBytes;
  if (remaining <= 0) return 0;
  return Math.round(remaining / speed.value);
});

const showStats = computed(() => props.progress.totalBytes > 0);

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

const speedLabel = computed(() => {
  if (speed.value === null || speed.value < 10) return null;
  return `${formatBytes(speed.value)}/s`;
});
</script>

<template>
  <div class="w-full space-y-1.5">
    <Progress :model-value="progress.percent" class="h-2" />
    <div class="flex justify-between text-xs text-muted-foreground">
      <span>{{ progress.percent }}%</span>
      <span v-if="showStats" class="flex items-center gap-1.5">
        <span>{{ formatBytes(progress.transferredBytes) }} / {{ formatBytes(progress.totalBytes) }}</span>
        <template v-if="speedLabel">
          <span aria-hidden="true">·</span>
          <span>{{ speedLabel }}</span>
        </template>
        <template v-if="eta !== null && eta !== undefined">
          <span aria-hidden="true">·</span>
          <span>~{{ formatDuration(eta) }}</span>
        </template>
      </span>
    </div>
  </div>
</template>
