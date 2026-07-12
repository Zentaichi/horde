<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useDatabaseStore } from '@/features/database/stores/databaseStore';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { ArrowRight, Circle } from '@lucide/vue';

const store = useDatabaseStore();
const { instances } = storeToRefs(store);
const router = useRouter();

onMounted(async () => {
  await store.fetchEngines();
  await store.fetchInstances();
});

const runningCount = computed(() =>
  instances.value.filter((i) => i.running).length,
);

const runningInstances = computed(() =>
  instances.value.filter((i) => i.running),
);
</script>

<template>
  <Card class="h-full">
    <CardHeader class="pb-2">
      <CardTitle class="flex items-center gap-2 text-base">
        <Circle
          :class="runningCount > 0 ? 'text-green-500 fill-green-500' : 'text-muted-foreground'"
          class="size-2.5"
        />
        Databases
      </CardTitle>
      <CardDescription>
        <template v-if="runningCount > 0">
          Running: <span class="font-medium text-foreground">{{ runningCount }}</span>
        </template>
        <template v-else>
          No instances running
        </template>
      </CardDescription>
    </CardHeader>

    <CardContent class="pb-2">
      <div v-if="runningInstances.length > 0" class="space-y-1.5">
        <div
          v-for="inst in runningInstances"
          :key="inst.instanceId"
          class="flex items-center gap-1.5 text-sm"
        >
          <Circle class="size-1.5 text-green-500 fill-green-500" />
          <span class="font-medium">{{ inst.engine || 'MySQL' }} {{ inst.version }}</span>
          <span class="text-muted-foreground">@ :{{ inst.port }}</span>
        </div>
      </div>
      <p v-else class="text-sm text-muted-foreground">
        No database instances running.
      </p>
    </CardContent>

    <CardFooter>
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
