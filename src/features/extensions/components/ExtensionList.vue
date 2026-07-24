<template>
  <div class="space-y-3">
    <div class="relative">
      <Search class="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <input
        v-model="filter"
        type="text"
        placeholder="Filter extensions..."
        class="w-full pl-8 pr-3 py-2 text-sm rounded-md border border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>

    <div v-if="filteredExtensions.length === 0" class="text-sm text-muted-foreground py-4 text-center">
      No extensions found.
    </div>

    <div
      v-for="ext in filteredExtensions"
      :key="ext.name"
      class="flex items-center justify-between px-3 py-2 rounded-md border border-border"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm font-medium">{{ ext.name }}</span>
        <Badge variant="secondary" class="text-xs">bundled</Badge>
      </div>
      <button
        @click="$emit('toggle', ext.name, !ext.enabled)"
        class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors"
        :class="ext.enabled ? 'bg-primary' : 'bg-muted'"
      >
        <span
          class="inline-block size-3.5 rounded-full bg-background transition-transform"
          :class="ext.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ExtensionInfo } from '@/shared/types/extensions';
import { Badge } from '@/shared/ui/badge';
import { Search } from '@lucide/vue';

const props = defineProps<{
  extensions: ExtensionInfo[];
}>();

defineEmits<{
  toggle: [extensionName: string, enabled: boolean];
}>();

const filter = ref('');

const filteredExtensions = computed(() => {
  if (!filter.value.trim()) return props.extensions;
  const q = filter.value.trim().toLowerCase();
  return props.extensions.filter((e) => e.name.toLowerCase().includes(q));
});
</script>
