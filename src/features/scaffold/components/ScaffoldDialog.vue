<template>
  <Button variant="outline" size="sm" @click="open = true">
    <Sparkles class="size-4 mr-1.5" />
    Quick Create
  </Button>

  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        class="absolute inset-0 bg-black/50"
        aria-hidden="true"
        @click="close"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create project from template"
        class="relative w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl space-y-3"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-base font-semibold tracking-tight">
            Create project from template
          </h2>
          <button
            class="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
            @click="close"
          >
            <X class="size-4" />
          </button>
        </div>

        <select
          v-model="template"
          class="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        >
          <option v-for="t in templates" :key="t.id" :value="t.id">
            {{ t.displayName }}
          </option>
        </select>

        <input
          ref="nameInput"
          v-model="name"
          placeholder="Project name (e.g. my-app)"
          class="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
        />

        <div class="flex items-center gap-2">
          <input
            v-model="parentDir"
            placeholder="Parent directory"
            class="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm"
          />
          <Button variant="outline" size="sm" @click="browse">Browse</Button>
        </div>

        <p v-if="error" class="text-sm text-destructive">{{ error }}</p>

        <div
          v-if="logs.length"
          class="h-40 overflow-y-auto rounded-md bg-muted p-2 text-xs font-mono overscroll-contain"
        >
          <div v-for="(line, i) in logs" :key="i">{{ line }}</div>
        </div>

        <div class="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" :disabled="running" @click="close">
            Cancel
          </Button>
          <Button
            size="sm"
            :disabled="running || !name || !parentDir"
            @click="create"
          >
            {{ running ? "Creating..." : "Create" }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useScaffoldStore } from "../stores/scaffoldStore";
import { Button } from "@/shared/ui/button";
import { Sparkles, X } from "@lucide/vue";

const emit = defineEmits<{
  created: [];
}>();

const store = useScaffoldStore();
const { templates, running, logs, error } = storeToRefs(store);

const open = ref(false);
const template = ref("");
const name = ref("");
const parentDir = ref("");
const nameInput = ref<HTMLInputElement | null>(null);

onMounted(async () => {
  await store.fetchTemplates();
  if (templates.value.length) template.value = templates.value[0].id;
});

watch(open, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    nameInput.value?.focus();
  }
});

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape" && open.value) {
    close();
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onUnmounted(() => window.removeEventListener("keydown", onKeydown));

function close() {
  if (running.value) return;
  open.value = false;
}

async function browse() {
  const dir = await window.electronAPI.showOpenDialog({});
  if (dir) parentDir.value = dir;
}

async function create() {
  await store.create({
    template: template.value,
    name: name.value,
    parentDir: parentDir.value,
  });
  if (!store.error) {
    name.value = "";
    emit("created");
    open.value = false;
  }
}
</script>
