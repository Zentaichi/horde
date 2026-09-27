<script setup lang="ts">
import { computed } from "vue";
import ServiceSigil from "./ServiceSigil.vue";
import { Badge } from "./badge";
import {
  STATE_COPY,
  stateLabel,
  type ServiceState,
} from "@/shared/lib/serviceState";
import { cn } from "@/shared/lib/utils";

type SigilSize = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    state: ServiceState;
    context?: string;
    size?: SigilSize;
    showSigil?: boolean;
    class?: string;
  }>(),
  {
    size: "md",
    showSigil: true,
  }
);

const label = computed(() => stateLabel(props.state, props.context));
const hasContext = computed(() => props.state === "risen" && !!props.context);
const variant = computed(() =>
  props.state === "dormant" ? ("secondary" as const) : ("outline" as const)
);
const tone = computed(() =>
  props.state === "risen" ? "border-ember/40 text-ember" : undefined
);
</script>

<template>
  <Badge :variant="variant" :class="cn(tone, props.class)">
    <ServiceSigil
      v-if="props.showSigil"
      :risen="props.state === 'risen'"
      :size="props.size"
    />
    <template v-if="hasContext">
      {{ STATE_COPY.risen }} ·
      <span class="font-mono">{{ props.context }}</span>
    </template>
    <template v-else>{{ label }}</template>
  </Badge>
</template>
