<script setup lang="ts">
import { computed } from "vue";
import svgRaw from "./horde_logo.svg?raw";

const props = withDefaults(
  defineProps<{
    size?: number;
    color?: string;
  }>(),
  {
    size: 24,
    color: "currentColor",
  },
);

const patched = computed(() =>
  svgRaw.replace(
    "<svg",
    `<svg width="${props.size}" height="${props.size}" fill="${props.color}"`,
  ),
);
</script>

<template>
  <span class="horde-logo inline-flex" v-html="patched"></span>
</template>
