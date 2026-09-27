<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useDevServerStore } from "@/features/devserver/stores/devServerStore";
import { storeToRefs } from "pinia";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import ServiceSigil from "@/shared/ui/ServiceSigil.vue";
import ServiceStatus from "@/shared/ui/ServiceStatus.vue";
import { devServerState, type ServiceState } from "@/shared/lib/serviceState";

const store = useDevServerStore();
const { servers } = storeToRefs(store);

onMounted(async () => {
  await store.fetchAll();
});

const runningCount = computed(
  () => servers.value.filter((s) => s.running).length
);

const runningServers = computed(() => servers.value.filter((s) => s.running));

const state = computed((): ServiceState =>
  devServerState(runningCount.value > 0)
);
</script>

<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="pb-2">
      <CardTitle class="flex items-center gap-2 text-base">
        <ServiceSigil :risen="state === 'risen'" size="md" />
        Dev Servers
      </CardTitle>
      <CardDescription>
        <ServiceStatus :state="state" size="sm" :show-sigil="false" />
      </CardDescription>
    </CardHeader>

    <CardContent class="pb-2">
      <div v-if="runningServers.length > 0" class="space-y-1.5">
        <div
          v-for="s in runningServers"
          :key="s.projectId"
          class="flex items-center gap-1.5 text-sm"
        >
          <ServiceSigil :risen="true" size="sm" />
          <span class="font-medium truncate">{{ s.projectName }}</span>
          <span class="text-muted-foreground font-mono">:{{ s.port }}</span>
        </div>
      </div>
      <p v-else class="text-sm text-muted-foreground">
        No dev servers running.
      </p>
    </CardContent>
  </Card>
</template>
