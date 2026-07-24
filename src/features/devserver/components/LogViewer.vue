<template>
  <div class="border border-border rounded-md mt-2 overflow-hidden">
    <div class="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border">
      <span class="text-xs font-medium">Dev Server Logs</span>
      <button @click="$emit('close')" class="text-muted-foreground hover:text-foreground">
        <X class="size-3.5" />
      </button>
    </div>
    <div ref="logContainer" class="p-2 max-h-48 overflow-y-auto bg-black/5 dark:bg-white/5">
      <pre v-if="logs.length > 0" class="text-xs font-mono whitespace-pre-wrap break-all text-muted-foreground">{{ logs.join('\n') }}</pre>
      <p v-else class="text-xs text-muted-foreground py-2 text-center">Waiting for output...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useDevServerStore } from '@/features/devserver/stores/devServerStore';
import { storeToRefs } from 'pinia';
import { X } from '@lucide/vue';

const props = defineProps<{
  projectId: string;
}>();

defineEmits<{
  close: [];
}>();

const store = useDevServerStore();
const { logSubscriptions } = storeToRefs(store);
const logContainer = ref<HTMLElement | null>(null);

const logs = computed(() => logSubscriptions.value.get(props.projectId) || []);

let unsubscribe: (() => void) | null = null;

onMounted(() => {
  unsubscribe = store.subscribeLogs(props.projectId);
});

onUnmounted(() => {
  unsubscribe?.();
});
</script>
