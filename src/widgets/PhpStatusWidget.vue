<script setup lang="ts">
import { onMounted, onUnmounted, computed } from "vue";
import { usePhpStore } from "@/features/php/stores/phpStore";
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
import { phpState } from "@/shared/lib/serviceState";
import { ArrowRight, RefreshCw } from "@lucide/vue";

const store = usePhpStore();
const { activeVersion, installedVersions, loading } = storeToRefs(store);
const router = useRouter();

async function refresh() {
  await store.fetchActiveVersion();
  await store.fetchInstalledVersions();
}

function onFocus() {
  refresh();
}

onMounted(async () => {
  await refresh();
  window.addEventListener("focus", onFocus);
});

onUnmounted(() => {
  window.removeEventListener("focus", onFocus);
});

const installedCount = computed(() => installedVersions.value.length);

const state = computed(() =>
  phpState(activeVersion.value, installedCount.value)
);

const latestInstalled = computed(() => {
  if (installedVersions.value.length === 0) return null;
  return [...installedVersions.value].sort((a, b) =>
    b.version.localeCompare(a.version, undefined, { numeric: true })
  )[0];
});
</script>

<template>
  <Card class="h-full flex flex-col">
    <CardHeader class="pb-2">
      <div class="flex items-center justify-between">
        <CardTitle class="flex items-center gap-2 text-base">
          <ServiceSigil :risen="state === 'risen'" size="md" />
          PHP
        </CardTitle>
        <button
          class="text-muted-foreground hover:text-foreground transition-colors"
          :class="{ 'animate-spin': loading }"
          @click="refresh"
          aria-label="Refresh"
        >
          <RefreshCw class="size-3.5" />
        </button>
      </div>
      <CardDescription>
        <ServiceStatus
          :state="state"
          :context="activeVersion ?? undefined"
          size="sm"
          :show-sigil="false"
        />
      </CardDescription>
    </CardHeader>

    <CardContent class="pb-2">
      <div class="space-y-1 text-sm">
        <div v-if="installedCount > 0">
          <p>
            <span class="font-semibold">{{ installedCount }}</span>
            {{ installedCount === 1 ? "version" : "versions" }} installed
          </p>
          <p v-if="latestInstalled" class="text-muted-foreground text-xs">
            Latest:
            <span class="font-mono">{{ latestInstalled.version }}</span>
          </p>
        </div>
        <p v-else class="text-muted-foreground">No versions installed yet.</p>
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
