<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useDevServerStore } from '@/features/devserver/stores/devServerStore';
import { storeToRefs } from 'pinia';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Circle, Server } from '@lucide/vue';

const store = useDevServerStore();
const { servers } = storeToRefs(store);

onMounted(async () => {
  await store.fetchAll();
});

const runningCount = computed(() =>
  servers.value.filter((s) => s.running).length,
);

const runningServers = computed(() =>
  servers.value.filter((s) => s.running),
);
</script>

<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="pb-2">
      <CardTitle class="flex items-center gap-2 text-base">
        <Server class="size-4 text-muted-foreground" />
        Dev Servers
      </CardTitle>
      <CardDescription>
        <template v-if="runningCount > 0">
          Running: <span class="font-medium text-foreground">{{ runningCount }}</span>
        </template>
        <template v-else>
          No servers running
        </template>
      </CardDescription>
    </CardHeader>

    <CardContent class="pb-2">
      <div v-if="runningServers.length > 0" class="space-y-1.5">
        <div
          v-for="s in runningServers"
          :key="s.projectId"
          class="flex items-center gap-1.5 text-sm"
        >
          <Circle class="size-1.5 text-green-500 fill-green-500" />
          <span class="font-medium truncate">{{ s.projectName }}</span>
          <span class="text-muted-foreground">:{{ s.port }}</span>
        </div>
      </div>
      <p v-else class="text-sm text-muted-foreground">
        No dev servers running.
      </p>
    </CardContent>
  </Card>
</template>
