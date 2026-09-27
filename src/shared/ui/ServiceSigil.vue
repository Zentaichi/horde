<script setup lang="ts">
import { computed } from "vue";
import HordeLogo from "./HordeLogo.vue";
import { cn } from "@/shared/lib/utils";

type SigilSize = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    risen?: boolean;
    size?: SigilSize;
    label?: string;
    class?: string;
  }>(),
  {
    risen: false,
    size: "md",
  }
);

const SIZES: Record<SigilSize, number> = {
  sm: 16,
  md: 22,
  lg: 30,
};

const px = computed(() => SIZES[props.size]);
</script>

<template>
  <span
    :class="
      cn(
        'inline-flex shrink-0 items-center justify-center transition-[color,filter] duration-150 ease-out',
        props.risen ? 'text-ember' : 'text-dormant',
        props.class
      )
    "
    :style="
      props.risen ? { filter: 'drop-shadow(var(--ember-glow))' } : undefined
    "
    :aria-hidden="props.label ? undefined : true"
    :aria-label="props.label"
    :role="props.label ? 'img' : undefined"
  >
    <HordeLogo :size="px" />
  </span>
</template>
