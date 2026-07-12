<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { usePhpStore } from '@/features/php/stores/phpStore';
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
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { ArrowRight, Circle } from '@lucide/vue';

const store = usePhpStore();
const { activeVersion, installedVersions, loading } = storeToRefs(store);
const router = useRouter();

onMounted(async () => {
  await store.fetchActiveVersion();
  await store.fetchInstalledVersions();
});

const installedCount = computed(() => installedVersions.value.length);

const latestInstalled = computed(() => {
  if (installedVersions.value.length === 0) return null;
  return [...installedVersions.value].sort((a, b) =>
    b.version.localeCompare(a.version, undefined, { numeric: true }),
  )[0];
});
</script>

<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="pb-2">
      <CardTitle class="flex items-center gap-2 text-base">
        <Circle
          :class="activeVersion ? 'text-green-500 fill-green-500' : 'text-muted-foreground'"
          class="size-2.5"
        />
        PHP
      </CardTitle>
      <CardDescription>
        <template v-if="activeVersion">
          Active: <span class="font-medium text-foreground">{{ activeVersion }}</span>
        </template>
        <template v-else>
          No active version
        </template>
      </CardDescription>
    </CardHeader>

    <CardContent class="pb-2">
      <div class="space-y-1 text-sm">
        <div v-if="installedCount > 0">
          <p>
            <span class="font-semibold">{{ installedCount }}</span>
            {{ installedCount === 1 ? 'version' : 'versions' }} installed
          </p>
          <p v-if="latestInstalled" class="text-muted-foreground text-xs">
            Latest: {{ latestInstalled.version }}
          </p>
        </div>
        <p v-else class="text-muted-foreground">
          No versions installed yet.
        </p>
      </div>
    </CardContent>

    <CardFooter class="mt-auto">
      <Button
        variant="outline"
        size="sm"
        class="w-full"
        @click="router.push('/php')"
      >
        Manage PHP
        <ArrowRight class="size-3.5 ml-1.5" />
      </Button>
    </CardFooter>
  </Card>
</template>
