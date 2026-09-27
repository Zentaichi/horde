<script setup lang="ts">
import { ref, watch } from "vue";
import { Badge } from "@/shared/ui/badge";
import { X } from "@lucide/vue";

const props = withDefaults(
  defineProps<{
    domains: string[];
    disabled?: boolean;
  }>(),
  { disabled: false }
);

const emit = defineEmits<{
  commit: [domains: string[]];
}>();

const draft = ref("");
const pending = ref<string[] | null>(null);

/**
 * Mirrors `SiteManager.normalizeDomains` (trim, lowercase, dedupe) so the
 * chips show exactly what the backend will store. Without this, adding
 * "MyApp.test" would render a chip the next fetch silently renames.
 */
function normalize(list: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of list) {
    const clean = raw.toLowerCase().trim();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

function isSameSet(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((d) => b.includes(d));
}

/**
 * No-ops when the set is unchanged. Every commit reaches `SiteManager.apply`,
 * which rewrites the hosts file through an elevated `cmd copy` -- a UAC
 * prompt per real change -- so a redundant commit is not free.
 */
function commit(next: string[]) {
  const normalized = normalize(next);
  if (isSameSet(normalized, props.domains)) return;
  emit("commit", normalized);
}

/**
 * A comma-separated run is one commit, so "a.test, b.test" + Enter costs a
 * single elevation rather than one per domain.
 *
 * The draft is not cleared here. It is held in `pending` and only dropped once
 * the parent re-renders with the domains actually present, because a rejected
 * commit (an invalid hostname, or a hosts write that failed) must not silently
 * discard what the user typed.
 */
function addFromDraft() {
  const additions = draft.value
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
  if (additions.length === 0) return;
  const normalized = normalize(additions);
  if (isSameSet(props.domains, [...props.domains, ...normalized])) return;
  pending.value = normalized;
  commit([...props.domains, ...normalized]);
}

function onRemove(domain: string) {
  pending.value = null;
  commit(props.domains.filter((d) => d !== domain));
}

// Clear the held draft only once the commit has actually landed.
watch(
  () => props.domains,
  (next) => {
    if (pending.value && pending.value.every((d) => next.includes(d))) {
      draft.value = "";
      pending.value = null;
    }
  }
);
</script>

<template>
  <div class="space-y-2">
    <div
      v-if="props.domains.length > 0"
      class="flex flex-wrap items-center gap-1.5"
    >
      <Badge
        v-for="d in props.domains"
        :key="d"
        variant="secondary"
        class="text-xs gap-1 pr-1"
      >
        <span class="font-mono">{{ d }}</span>
        <button
          type="button"
          class="shrink-0 rounded-sm opacity-60 hover:opacity-100 disabled:opacity-40"
          :disabled="props.disabled"
          :title="`Remove ${d}`"
          :aria-label="`Remove ${d}`"
          @click="onRemove(d)"
        >
          <X class="size-3" />
        </button>
      </Badge>
    </div>

    <input
      v-model="draft"
      type="text"
      placeholder="myproject.test, api.myproject.test"
      aria-label="Add domain"
      class="w-full rounded-md border border-border bg-background px-2 py-1 text-sm"
      :disabled="props.disabled"
      @keydown.enter.prevent="addFromDraft"
      @blur="addFromDraft"
    />

    <p class="text-xs text-muted-foreground">Press Enter to add.</p>
  </div>
</template>
