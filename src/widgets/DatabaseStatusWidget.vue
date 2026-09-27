<script setup lang="ts">
import { onMounted, computed } from "vue";
import { useDatabaseStore } from "@/features/database/stores/databaseStore";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import ServiceSigil from "@/shared/ui/ServiceSigil.vue";
import ServiceStatus from "@/shared/ui/ServiceStatus.vue";
import { instanceState, type ServiceState } from "@/shared/lib/serviceState";
import { ArrowRight } from "@lucide/vue";

const store = useDatabaseStore();
const { instances } = storeToRefs(store);
const router = useRouter();

onMounted(async () => {
  await store.fetchEngines();
  await store.fetchInstances();
});

const runningCount = computed(
  () => instances.value.filter((i) => i.running).length
);

const runningInstances = computed(() =>
  instances.value.filter((i) => i.running)
);

const state = computed((): ServiceState =>
  instances.value.length === 0
    ? "absent"
    : instanceState(runningCount.value > 0)
);
</script>

<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="pb-2">
      <CardTitle class="flex items-center gap-2 text-base">
        <ServiceSigil :risen="state === 'risen'" size="md" />
        Databases
      </CardTitle>
      <CardDescription>
        <ServiceStatus :state="state" size="sm" :show-sigil="false" />
      </CardDescription>
    </CardHeader>

    <CardContent class="pb-2">
      <div v-if="runningInstances.length > 0" class="space-y-1.5">
        <div
          v-for="inst in runningInstances"
          :key="inst.instanceId"
          class="flex items-center gap-1.5 text-sm"
        >
          <ServiceSigil :risen="true" size="sm" />
          <span class="font-medium"
            >{{ inst.displayName || inst.engine }}
            <span class="font-mono">{{ inst.version }}</span></span
          >
          <span class="text-muted-foreground font-mono"
            >@ :{{ inst.port }}</span
          >
        </div>
      </div>
      <p v-else class="text-sm text-muted-foreground">
        No database instances running.
      </p>
    </CardContent>

    <CardFooter class="mt-auto">
      <Button
        variant="outline"
        size="sm"
        class="w-full"
        @click="router.push('/databases')"
      >
        Manage Databases
        <ArrowRight class="size-3.5 ml-1.5" />
      </Button>
    </CardFooter>
  </Card>
</template>
