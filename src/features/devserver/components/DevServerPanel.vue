<template>
  <div class="inline-flex items-center gap-1">
    <Button
      v-if="!server"
      variant="outline"
      size="xs"
      @click="onStart"
      :disabled="loading"
    >
      <Play class="size-3 mr-1" />
      Serve
    </Button>
    <template v-else>
      <div class="flex items-center gap-1">
        <Circle
          :class="server.running ? 'text-green-500 fill-green-500' : 'text-muted-foreground'"
          class="size-2"
        />
        <span class="text-xs text-muted-foreground">:{{ server.port }}</span>
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        class="text-muted-foreground hover:text-destructive"
        @click="onStop"
        :disabled="loading"
      >
        <Square class="size-3" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        class="text-muted-foreground"
        @click="showLogs = !showLogs"
      >
        <Terminal class="size-3" />
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
import { ref, computed, onMounted } from 'vue';
import { useDevServerStore } from '@/features/devserver/stores/devServerStore';
import { storeToRefs } from 'pinia';
import { Button } from '@/shared/ui/button';
import { Play, Square, Terminal, Circle } from '@lucide/vue';
import LogViewer from './LogViewer.vue';

const props = defineProps<{
  projectId: string;
  projectName: string;
}>();

const store = useDevServerStore();
const { servers, loading } = storeToRefs(store);
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
