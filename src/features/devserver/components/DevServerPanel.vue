<template>
  <div class="inline-flex items-center gap-1">
    <template v-if="!server">
      <Button
        variant="outline"
        size="xs"
        @click="onStart"
        :disabled="loading"
        title="Start PHP development server"
      >
        <Play class="size-3 mr-1" />
        Serve
      </Button>
      <span
        v-if="storeError"
        class="text-xs text-destructive italic max-w-48 truncate"
        :title="storeError"
        >{{ storeError }}</span
      >
    </template>
    <template v-else>
      <Button
        variant="outline"
        size="xs"
        @click="onStop"
        :disabled="loading"
        title="Stop development server"
        class="hover:text-destructive"
      >
        <Square class="size-3 mr-1" />
        Stop
      </Button>
      <Button
        variant="outline"
        size="xs"
        @click="showLogs = !showLogs"
        title="Toggle server logs"
      >
        <Terminal class="size-3 mr-1" />
        Logs
      </Button>
    </template>
  </div>
  <LogViewer
    v-if="showLogs && server"
    :project-id="projectId"
    @close="showLogs = false"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useDevServerStore } from "@/features/devserver/stores/devServerStore";
import { storeToRefs } from "pinia";
import { Button } from "@/shared/ui/button";
import { Play, Square, Terminal } from "@lucide/vue";
import LogViewer from "./LogViewer.vue";

const props = defineProps<{
  projectId: string;
}>();

const store = useDevServerStore();
const { servers, loading, error: storeError } = storeToRefs(store);
const showLogs = ref(false);

const server = computed(() =>
  servers.value.find((s) => s.projectId === props.projectId),
);

async function onStart() {
  await store.startServer(props.projectId);
}

async function onStop() {
  await store.stopServer(props.projectId);
}

onMounted(async () => {
  await store.fetchAll();
});
</script>
