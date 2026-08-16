<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/shared/lib/utils";

const props = defineProps<{
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <main
    :class="
      cn('mx-auto h-full w-full max-w-6xl px-8 py-8 space-y-6', props.class)
    "
  >
    <slot />
  </main>
</template>
